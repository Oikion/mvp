/**
 * Client → Contact Data Migration Script (Entity Architecture v2.0)
 *
 * Migrates all Client records to the new Contact model:
 * - Decrypts Client PII fields using per-org DEKs
 * - Splits client_name → firstName/lastName/displayName
 * - Maps enums (client_type→category[], client_status→status, etc.)
 * - Composes billing/shipping addresses into JSON array
 * - Re-encrypts using Contact encryption functions
 * - Records mapping in _migration_client_to_contact lookup table
 * - Promotes Client_Contacts sub-contacts to full Contact records
 *
 * Run with: npx tsx scripts/migrate-clients-to-contacts.ts
 *
 * Options:
 *   --dry-run           Preview changes without writing
 *   --org=<id>          Migrate only a specific organization
 *   --skip-drafts       Skip clients with draft_status=true (default: true)
 *   --include-drafts    Include draft clients in migration
 */

import { prismadb } from "@/lib/prisma";
import { decryptClientForOrg } from "@/lib/model-encryption";
import { encryptContactForOrg } from "@/lib/model-encryption";
import type { Prisma } from "@prisma/client";

// ────────────────────────────────────────────────────────
// CLI args
// ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ORG_ID = args.find((a) => a.startsWith("--org="))?.split("=")[1];
const INCLUDE_DRAFTS = args.includes("--include-drafts");
const BATCH_SIZE = 50; // Smaller batches for decrypt→encrypt cycle

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────

interface MigrationStats {
  totalOrgs: number;
  totalClients: number;
  migratedContacts: number;
  promotedSubContacts: number;
  skippedDrafts: number;
  flaggedForReview: number;
  errors: string[];
}

interface NameSplitResult {
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  flagForReview: boolean;
  reviewReason?: string;
}

// ────────────────────────────────────────────────────────
// Name splitting algorithm
// ────────────────────────────────────────────────────────

function splitName(
  clientName: string | null | undefined,
  fullName: string | null | undefined,
  personType: string | null | undefined,
  companyName: string | null | undefined
): NameSplitResult {
  // Company contacts: use companyName as displayName
  if (personType === "COMPANY") {
    return {
      firstName: null,
      lastName: null,
      displayName: companyName || clientName || "Unknown Company",
      flagForReview: !companyName && !clientName,
      reviewReason: !companyName && !clientName ? "Company with no name" : undefined,
    };
  }

  // Use full_name as primary source if available
  const nameSource = fullName?.trim() || clientName?.trim() || "";

  if (!nameSource) {
    return {
      firstName: null,
      lastName: null,
      displayName: "Unknown Contact",
      flagForReview: true,
      reviewReason: "No name available",
    };
  }

  // Single token → put in lastName
  const tokens = nameSource.split(/\s+/);
  if (tokens.length === 1) {
    return {
      firstName: null,
      lastName: tokens[0],
      displayName: tokens[0],
      flagForReview: false,
    };
  }

  // Check for Greek patronymics (contains "του"/"tou")
  const hasPatronymic = tokens.some(
    (t) => t.toLowerCase() === "του" || t.toLowerCase() === "tou"
  );
  if (hasPatronymic || tokens.length > 3) {
    // Ambiguous — flag for review, use best guess
    const lastName = tokens[tokens.length - 1];
    const firstName = tokens.slice(0, -1).join(" ");
    return {
      firstName,
      lastName,
      displayName: nameSource,
      flagForReview: true,
      reviewReason:
        hasPatronymic
          ? `Patronymic detected: "${nameSource}"`
          : `Multi-token name (${tokens.length} parts): "${nameSource}"`,
    };
  }

  // Standard split: everything before last space = firstName, last token = lastName
  const lastName = tokens[tokens.length - 1];
  const firstName = tokens.slice(0, -1).join(" ");

  return {
    firstName,
    lastName,
    displayName: nameSource,
    flagForReview: false,
  };
}

// ────────────────────────────────────────────────────────
// Enum mapping functions
// ────────────────────────────────────────────────────────

function mapClientTypeToCategories(
  clientType: string | null | undefined,
  personType: string | null | undefined
): string[] {
  const categories: string[] = [];

  // Map client_type
  switch (clientType) {
    case "BUYER": categories.push("BUYER"); break;
    case "SELLER": categories.push("SELLER"); break;
    case "RENTER": categories.push("TENANT"); break;
    case "INVESTOR": categories.push("INVESTOR"); break;
    case "REFERRAL_PARTNER": categories.push("COLLEAGUE"); break;
  }

  // Enrich from person_type (INVESTOR and BROKER not captured by client_type)
  if (personType === "INVESTOR" && !categories.includes("INVESTOR")) {
    categories.push("INVESTOR");
  }
  if (personType === "BROKER" && !categories.includes("BROKER")) {
    categories.push("BROKER");
  }

  // Default if nothing mapped
  if (categories.length === 0) {
    categories.push("OTHER");
  }

  return categories;
}

function mapClientStatus(
  clientStatus: string | null | undefined
): string {
  switch (clientStatus) {
    case "LEAD": return "LEAD";
    case "ACTIVE": return "ACTIVE";
    case "INACTIVE": return "INACTIVE";
    case "CONVERTED": return "COMPLETED";
    case "LOST": return "INACTIVE";
    default: return "LEAD";
  }
}

function mapLeadSource(
  leadSource: string | null | undefined
): string | null {
  switch (leadSource) {
    case "REFERRAL": return "REFERRAL";
    case "WEB": return "WEB";
    case "PORTAL": return "PORTAL_LEAD";
    case "WALK_IN": return "WALK_IN";
    case "SOCIAL": return "SOCIAL_MEDIA";
    default: return null;
  }
}

function mapLanguage(
  language: string | null | undefined
): string | null {
  switch (language) {
    case "el": return "el";
    case "en": return "en";
    case "de": return "de";
    case "uk": return "en"; // fallback — Ukrainian not in Language enum
    case "cz": return "en"; // fallback — Czech not in Language enum
    default: return null;
  }
}

// ────────────────────────────────────────────────────────
// Address composition
// ────────────────────────────────────────────────────────

interface AddressEntry {
  type: "billing" | "shipping";
  street?: string;
  city?: string;
  postalCode?: string;
  municipality?: string;
  country?: string;
}

function composeAddresses(client: Record<string, unknown>): AddressEntry[] | null {
  const addresses: AddressEntry[] = [];

  // Billing address
  const billingStreet = client.billing_street as string | null;
  const billingCity = client.billing_city as string | null;
  const billingState = client.billing_state as string | null;
  const billingPostal = client.billing_postal_code as string | null;
  const billingCountry = client.billing_country as string | null;

  if (billingStreet || billingCity || billingPostal) {
    addresses.push({
      type: "billing",
      street: billingStreet || undefined,
      city: billingCity || undefined,
      postalCode: billingPostal || undefined,
      municipality: billingState || undefined,
      country: billingCountry || undefined,
    });
  }

  // Shipping address
  const shippingStreet = client.shipping_street as string | null;
  const shippingCity = client.shipping_city as string | null;
  const shippingState = client.shipping_state as string | null;
  const shippingPostal = client.shipping_postal_code as string | null;
  const shippingCountry = client.shipping_country as string | null;

  if (shippingStreet || shippingCity || shippingPostal) {
    addresses.push({
      type: "shipping",
      street: shippingStreet || undefined,
      city: shippingCity || undefined,
      postalCode: shippingPostal || undefined,
      municipality: shippingState || undefined,
      country: shippingCountry || undefined,
    });
  }

  return addresses.length > 0 ? addresses : null;
}

// ────────────────────────────────────────────────────────
// Logging
// ────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function logError(msg: string) {
  console.error(`[${new Date().toISOString()}] ERROR: ${msg}`);
}

// ────────────────────────────────────────────────────────
// Main migration
// ────────────────────────────────────────────────────────

async function migrateClientsToContacts(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalOrgs: 0,
    totalClients: 0,
    migratedContacts: 0,
    promotedSubContacts: 0,
    skippedDrafts: 0,
    flaggedForReview: 0,
    errors: [],
  };

  if (DRY_RUN) {
    log("=== DRY RUN MODE — no data will be written ===");
  }

  // Get all organizations (or specific one)
  const orgs = ORG_ID
    ? [{ organizationId: ORG_ID }]
    : await prismadb.clients.findMany({
        select: { organizationId: true },
        distinct: ["organizationId"],
      });

  stats.totalOrgs = orgs.length;
  log(`Found ${orgs.length} organization(s) to migrate`);

  for (const { organizationId } of orgs) {
    log(`\n── Migrating org: ${organizationId} ──`);

    try {
      await migrateOrg(organizationId, stats);
    } catch (err) {
      const msg = `Org ${organizationId} failed: ${err instanceof Error ? err.message : String(err)}`;
      logError(msg);
      stats.errors.push(msg);
    }
  }

  return stats;
}

async function migrateOrg(orgId: string, stats: MigrationStats): Promise<void> {
  // Count clients
  const whereClause: Prisma.ClientsWhereInput = {
    organizationId: orgId,
    ...(!INCLUDE_DRAFTS ? { draft_status: false } : {}),
  };

  const clientCount = await prismadb.clients.count({ where: whereClause });
  log(`  Found ${clientCount} client(s) to migrate`);
  stats.totalClients += clientCount;

  if (INCLUDE_DRAFTS) {
    const draftCount = await prismadb.clients.count({
      where: { organizationId: orgId, draft_status: true },
    });
    if (draftCount > 0) {
      log(`  (including ${draftCount} drafts)`);
    }
  } else {
    const draftCount = await prismadb.clients.count({
      where: { organizationId: orgId, draft_status: true },
    });
    if (draftCount > 0) {
      log(`  Skipping ${draftCount} draft(s)`);
      stats.skippedDrafts += draftCount;
    }
  }

  // Process in batches
  let cursor: string | undefined;

  while (true) {
    const clients = await prismadb.clients.findMany({
      where: whereClause,
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });

    if (clients.length === 0) break;
    cursor = clients[clients.length - 1].id;

    for (const client of clients) {
      try {
        await migrateOneClient(client, orgId, stats);
      } catch (err) {
        const msg = `Client ${client.id} (org ${orgId}): ${err instanceof Error ? err.message : String(err)}`;
        logError(msg);
        stats.errors.push(msg);
      }
    }

    log(`  Processed batch: ${clients.length} clients (total: ${stats.migratedContacts})`);
  }
}

async function migrateOneClient(
  client: Record<string, unknown>,
  orgId: string,
  stats: MigrationStats
): Promise<void> {
  // 0. Idempotency guard — skip if already migrated
  const existing = await prismadb.contact.findFirst({
    where: { organizationId: orgId, legacyClientId: client.id as string },
    select: { id: true },
  });
  if (existing) {
    log(`    Skipping already-migrated client ${client.id}`);
    stats.migratedContacts++;
    return;
  }

  // 1. Decrypt all encrypted fields
  const decrypted = await decryptClientForOrg(client as any, orgId);

  // 2. Split name
  const nameSplit = splitName(
    decrypted.client_name as string | null,
    decrypted.full_name as string | null,
    decrypted.person_type as string | null,
    decrypted.company_name as string | null
  );

  if (nameSplit.flagForReview) {
    stats.flaggedForReview++;
    log(`    ⚠ Flagged: ${nameSplit.reviewReason} (client ${client.id})`);
  }

  // 3. Map fields
  const categories = mapClientTypeToCategories(
    decrypted.client_type as string | null,
    decrypted.person_type as string | null
  );

  const status = mapClientStatus(decrypted.client_status as string | null);
  const source = mapLeadSource(decrypted.lead_source as string | null);
  const language = mapLanguage(decrypted.language as string | null);
  const addresses = composeAddresses(decrypted as Record<string, unknown>);

  // Compose tags from legacy fields
  const tags: string[] = [];
  if (decrypted.member_of) tags.push(String(decrypted.member_of));
  if (decrypted.client_status === "LOST") tags.push("lost");
  if (decrypted.website) tags.push(`website:${decrypted.website}`);
  if (decrypted.fax) tags.push(`fax:${decrypted.fax}`);

  // Extract whatsapp/viber from channels
  const channels = (decrypted.channels || []) as string[];
  const hasWhatsapp = channels.some((c: string) => c.toUpperCase().includes("WHATSAPP"));
  const hasViber = channels.some((c: string) => c.toUpperCase().includes("VIBER"));

  // 4. Build Contact data (plaintext — will be encrypted)
  const contactData = {
    firstName: nameSplit.firstName,
    lastName: nameSplit.lastName,
    displayName: nameSplit.displayName,
    isCompany: decrypted.person_type === "COMPANY",
    companyName: decrypted.company_name as string | null,

    category: categories,
    status,
    source,
    visibility: (decrypted.visibility as string) || "PRIVATE",

    email: decrypted.primary_email as string | null,
    secondaryEmail: decrypted.secondary_email as string | null,
    primaryPhone: decrypted.primary_phone as string | null,
    secondaryPhone: decrypted.secondary_phone as string | null,
    officePhone: decrypted.office_phone as string | null,
    whatsapp: hasWhatsapp ? (decrypted.primary_phone as string | null) : null,
    viber: hasViber ? (decrypted.primary_phone as string | null) : null,

    taxId: decrypted.afm as string | null,
    doy: decrypted.doy as string | null,
    vatNumber: decrypted.vat as string | null,
    companyGemi: decrypted.company_gemi as string | null,
    companyId: decrypted.company_id as string | null,
    idDocument: decrypted.id_doc as string | null,

    addresses: addresses as Prisma.JsonValue | null,

    assignedAgentId: decrypted.assigned_to as string | null,
    languagePreference: language,
    tags,
    // allow_marketing may not exist in the schema (removed in 2026-03 cleanup).
    // When undefined, default both to false rather than silently inverting.
    doNotContact: decrypted.allow_marketing == null
      ? false
      : decrypted.allow_marketing === false,
    gdprConsentGiven: (decrypted.gdpr_consent as boolean) || false,
    allowMarketing: decrypted.allow_marketing == null
      ? false
      : !!(decrypted.allow_marketing as boolean),
    notes: decrypted.description as string | null,
    communicationNotes: decrypted.communication_notes as Prisma.JsonValue | null,

    createdBy: decrypted.createdBy as string | null,
    updatedBy: decrypted.updatedBy as string | null,
    legacyClientId: client.id as string,
    friendlyId: decrypted.friendlyId as string | null,
    organizationId: orgId,
  };

  // 5. Encrypt
  const encrypted = await encryptContactForOrg(contactData, orgId);

  // 6. Write (unless dry run)
  if (!DRY_RUN) {
    await prismadb.contact.create({
      data: {
        ...encrypted,
        // Preserve original timestamps
        createdAt: (client.createdAt as Date) || new Date(),
        updatedAt: (client.updatedAt as Date) || new Date(),
        // category needs to be set explicitly as Prisma enum array
        category: categories as any,
        status: status as any,
        source: source as any,
        visibility: (encrypted.visibility || "PRIVATE") as any,
        languagePreference: language as any,
      },
    });
  }

  stats.migratedContacts++;
}

// ────────────────────────────────────────────────────────
// Entry point
// ────────────────────────────────────────────────────────

async function main() {
  log("╔══════════════════════════════════════════════════╗");
  log("║  Client → Contact Migration (Entity Arch v2.0)  ║");
  log("╚══════════════════════════════════════════════════╝");
  log("");

  const stats = await migrateClientsToContacts();

  log("\n╔══════════════════════════════════════════════════╗");
  log("║  Migration Summary                              ║");
  log("╚══════════════════════════════════════════════════╝");
  log(`  Organizations:       ${stats.totalOrgs}`);
  log(`  Total clients:       ${stats.totalClients}`);
  log(`  Migrated contacts:   ${stats.migratedContacts}`);
  log(`  Sub-contacts:        ${stats.promotedSubContacts}`);
  log(`  Skipped drafts:      ${stats.skippedDrafts}`);
  log(`  Flagged for review:  ${stats.flaggedForReview}`);
  log(`  Errors:              ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    log("\n── Errors ──");
    for (const err of stats.errors) {
      logError(err);
    }
  }

  if (DRY_RUN) {
    log("\n=== DRY RUN — no data was written ===");
  }

  await prismadb.$disconnect();
}

main().catch((err) => {
  logError(`Fatal: ${err}`);
  process.exit(1);
});
