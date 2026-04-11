/**
 * Mandate → Request Data Migration Script (Entity Architecture v2.0 — Phase 2)
 *
 * Migrates all Mandate records to the new Request model:
 * - Decrypts encrypted Mandate fields (title, notes, communication_notes)
 * - Maps fields: transaction_type→requestType, mandate fields→Request fields
 * - Maps status: ACTIVE→ACTIVE, PAUSED→PAUSED, FULFILLED→CLOSED, etc.
 * - Links clients from Mandate_Clients → RequestContact join rows (via Contact lookup)
 * - Re-encrypts using Request encryption functions
 * - Creates PropertyRequestMatch rows from Mandate_Properties
 * - Records mapping for traceability via legacyMandateId
 *
 * Run with: npx tsx scripts/migrate-mandates-to-requests.ts
 *
 * Options:
 *   --dry-run           Preview changes without writing
 *   --org=<id>          Migrate only a specific organization
 *   --include-drafts    Include draft mandates (default: skip)
 */

import { prismadb } from "@/lib/prisma";
import { decryptMandateForOrg, encryptRequestForOrg } from "@/lib/model-encryption";
import { generateFriendlyId } from "@/lib/friendly-id";
import type { Prisma } from "@prisma/client";

// ────────────────────────────────────────────────────────
// CLI args
// ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ORG_ID = args.find((a) => a.startsWith("--org="))?.split("=")[1];
const INCLUDE_DRAFTS = args.includes("--include-drafts");
const BATCH_SIZE = 50;

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────

interface MigrationStats {
  totalOrgs: number;
  totalMandates: number;
  migratedRequests: number;
  skippedDrafts: number;
  skippedDuplicates: number;
  propertyMatchesCreated: number;
  noContactFound: number;
  errors: string[];
}

// ────────────────────────────────────────────────────────
// Field mapping helpers
// ────────────────────────────────────────────────────────

function mapTransactionType(type: string | null): "BUY" | "RENT" {
  switch (type) {
    case "SALE":
    case "AUCTION":
    case "EXCHANGE":
      return "BUY";
    case "RENTAL":
    case "SHORT_TERM":
      return "RENT";
    default:
      return "BUY"; // Safe default
  }
}

function mapMandateStatus(status: string): { requestStatus: string; closureReason: string | null } {
  switch (status) {
    case "ACTIVE":
      return { requestStatus: "ACTIVE", closureReason: null };
    case "PAUSED":
    case "DRAFT":
      return { requestStatus: "PAUSED", closureReason: null };
    case "FULFILLED":
      return { requestStatus: "CLOSED", closureReason: "MATCHED" };
    case "EXPIRED":
      return { requestStatus: "CLOSED", closureReason: "EXPIRED" };
    case "CANCELLED":
      return { requestStatus: "CLOSED", closureReason: "CANCELLED" };
    default:
      return { requestStatus: "ACTIVE", closureReason: null };
  }
}

function mapUrgency(urgency: string | null): string | null {
  // Mandate urgency maps 1:1 to Request urgency
  if (!urgency) return "MEDIUM";
  return urgency; // LOW, MEDIUM, HIGH, CRITICAL — identical
}

// ────────────────────────────────────────────────────────
// Main migration
// ────────────────────────────────────────────────────────

async function migrateOrg(organizationId: string, stats: MigrationStats) {
  console.log(`\n  ── Migrating org: ${organizationId} ──`);

  // Build client→contact lookup from Phase 1 migration
  const contacts = await prismadb.contact.findMany({
    where: { organizationId },
    select: { id: true, legacyClientId: true },
  });
  const clientToContactMap = new Map<string, string>();
  for (const c of contacts) {
    if (c.legacyClientId) {
      clientToContactMap.set(c.legacyClientId, c.id);
    }
  }

  let cursor: string | undefined;
  let batchCount = 0;

  while (true) {
    const mandates = await prismadb.mandate.findMany({
      where: {
        organizationId,
        ...(INCLUDE_DRAFTS ? {} : { draft_status: { not: true } }),
      },
      include: {
        Mandate_Clients: {
          select: { clientId: true },
          orderBy: { createdAt: "asc" },
        },
        Mandate_Properties: {
          select: { propertyId: true },
        },
      },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "asc" },
    });

    if (mandates.length === 0) break;

    cursor = mandates[mandates.length - 1].id;
    batchCount++;

    for (const mandate of mandates) {
      stats.totalMandates++;

      // Idempotency: skip if already migrated
      const existing = await prismadb.request.findFirst({
        where: { legacyMandateId: mandate.id, organizationId },
        select: { id: true },
      });
      if (existing) {
        stats.skippedDuplicates++;
        continue;
      }

      try {
        // Decrypt mandate fields
        const decrypted = await decryptMandateForOrg(mandate, organizationId);

        // Resolve linked contacts via Mandate_Clients → client→contact lookup
        const linkedContactIds: string[] = [];
        for (const mc of mandate.Mandate_Clients) {
          const mappedContactId = clientToContactMap.get(mc.clientId);
          if (mappedContactId) {
            linkedContactIds.push(mappedContactId);
          }
        }

        if (linkedContactIds.length === 0) {
          stats.noContactFound++;
          console.warn(`    ⚠ Mandate ${mandate.friendlyId}: no linked contacts found (will migrate without contacts)`);
        }

        // Map fields
        const requestType = mapTransactionType(mandate.transaction_type);
        const { requestStatus, closureReason } = mapMandateStatus(mandate.status);
        const urgency = mapUrgency(mandate.urgency);

        if (DRY_RUN) {
          console.log(`    [DRY] ${mandate.friendlyId} → ${requestType} ${requestStatus} (${linkedContactIds.length} contacts)`);
          stats.migratedRequests++;
          stats.propertyMatchesCreated += mandate.Mandate_Properties.length;
          continue;
        }

        // Generate friendly ID
        const friendlyId = await generateFriendlyId(prismadb, "Request", organizationId);

        // Encrypt sensitive fields
        const encrypted = await encryptRequestForOrg(
          {
            notes: decrypted.title
              ? `${decrypted.title}\n\n${decrypted.notes || ""}`
              : (decrypted.notes as string | null) || null,
            locationDisplayName: (() => {
              const areas = decrypted.areas_of_interest;
              if (Array.isArray(areas)) return areas.join(", ");
              if (typeof areas === "string") return areas;
              return mandate.municipality || null;
            })(),
            communicationNotes: decrypted.communication_notes ?? null,
            areasOfInterest: decrypted.areas_of_interest ?? null,
          },
          organizationId
        );

        // Wrap create + links in a transaction for atomicity
        const request = await prismadb.$transaction(async (tx) => {
          const req = await tx.request.create({
            data: {
              organizationId,
              friendlyId,
              assignedAgentId: mandate.assigned_to ?? null,
              requestType: requestType as any,
              propertyCategory: mandate.property_purpose as any ?? null,
              propertyTypes: mandate.property_type ? [mandate.property_type] : [],
              status: requestStatus as any,
              urgency: urgency as any,
              closureReason: closureReason as any ?? null,
              budgetMin: mandate.budget_min ?? null,
              budgetMax: mandate.budget_max ?? null,
              surfaceMin: mandate.size_min_sqm ?? null,
              surfaceMax: mandate.size_max_sqm ?? null,
              plotSizeMin: mandate.plot_size_min_sqm ?? null,
              plotSizeMax: mandate.plot_size_max_sqm ?? null,
              bedroomsMin: mandate.bedrooms_min ?? null,
              bedroomsMax: mandate.bedrooms_max ?? null,
              bathroomsMin: mandate.bathrooms_min ?? null,
              bathroomsMax: mandate.bathrooms_max ?? null,
              floorMin: mandate.floor_min ?? null,
              floorMax: mandate.floor_max ?? null,
              groundFloorOnly: mandate.ground_floor_only ?? false,
              constructionYearMin: mandate.year_built_min ?? null,
              constructionYearMax: mandate.year_built_max ?? null,
              conditionPreference: mandate.condition ?? [],
              heatingTypes: mandate.heating_type ?? [],
              energyClassMin: mandate.energy_cert_min ?? null,
              furnished: mandate.furnished ?? null,
              requiresElevator: mandate.elevator ?? null,
              requiresParking: mandate.parking ?? null,
              petFriendly: mandate.pets_allowed ?? null,
              insideCityPlan: mandate.inside_city_plan ?? null,
              legalizationOk: mandate.legalization_ok ?? null,
              notes: encrypted.notes as string | null,
              locationDisplayName: encrypted.locationDisplayName as string | null,
              communicationNotes: encrypted.communicationNotes ?? null,
              areasOfInterest: encrypted.areasOfInterest ?? null,
              municipality: mandate.municipality ?? null,
              region: mandate.region ?? null,
              timeline: mandate.timeline ?? null,
              expiresAt: mandate.expires_at ?? null,
              visibility: mandate.visibility ?? "PRIVATE",
              draftStatus: mandate.draft_status ?? false,
              createdBy: mandate.createdBy ?? null,
              updatedBy: mandate.updatedBy ?? null,
              createdAt: mandate.createdAt,
              ...(mandate.updatedAt ? { updatedAt: mandate.updatedAt } : {}),
              legacyMandateId: mandate.id,
            },
          });

          // Create RequestContact rows from resolved linked contacts
          for (const cId of linkedContactIds) {
            await tx.requestContact.create({
              data: { organizationId, requestId: req.id, contactId: cId },
            });
          }

          // Create PropertyRequestMatch rows from Mandate_Properties
          for (const mp of mandate.Mandate_Properties) {
            await tx.propertyRequestMatch.create({
              data: {
                organizationId,
                propertyId: mp.propertyId,
                requestId: req.id,
                status: "PRESENTED",
                matchMethod: "MANUAL",
              },
            });
          }

          return req;
        });

        stats.propertyMatchesCreated += mandate.Mandate_Properties.length;
        stats.migratedRequests++;
        console.log(`    ✓ ${mandate.friendlyId} → ${request.friendlyId} (${requestType}, ${requestStatus})`);
      } catch (err) {
        const msg = `Mandate ${mandate.friendlyId}: ${(err as Error).message}`;
        stats.errors.push(msg);
        console.error(`    ✗ ${msg}`);
      }
    }
  }

  console.log(`  ── Org ${organizationId}: ${batchCount} batch(es) processed ──`);
}

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  Mandate → Request Migration (Phase 2)");
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`  Drafts: ${INCLUDE_DRAFTS ? "INCLUDED" : "SKIPPED"}`);
  console.log("═══════════════════════════════════════════════");

  const stats: MigrationStats = {
    totalOrgs: 0,
    totalMandates: 0,
    migratedRequests: 0,
    skippedDrafts: 0,
    skippedDuplicates: 0,
    propertyMatchesCreated: 0,
    noContactFound: 0,
    errors: [],
  };

  // Discover orgs to migrate
  let orgIds: string[];
  if (ORG_ID) {
    orgIds = [ORG_ID];
  } else {
    const orgs = await prismadb.mandate.groupBy({
      by: ["organizationId"],
    });
    orgIds = orgs.map((o) => o.organizationId);
  }

  stats.totalOrgs = orgIds.length;
  console.log(`\nFound ${orgIds.length} organization(s) with mandates.\n`);

  for (const orgId of orgIds) {
    await migrateOrg(orgId, stats);
  }

  // ── Summary ──
  console.log("\n═══════════════════════════════════════════════");
  console.log("  Migration Summary");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Organizations:         ${stats.totalOrgs}`);
  console.log(`  Total Mandates:        ${stats.totalMandates}`);
  console.log(`  Migrated Requests:     ${stats.migratedRequests}`);
  console.log(`  Property Matches:      ${stats.propertyMatchesCreated}`);
  console.log(`  Skipped (duplicates):  ${stats.skippedDuplicates}`);
  console.log(`  Skipped (drafts):      ${stats.skippedDrafts}`);
  console.log(`  No Contact Found:      ${stats.noContactFound}`);
  console.log(`  Errors:                ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log("\n  ── Errors ──");
    for (const err of stats.errors) {
      console.log(`    • ${err}`);
    }
  }

  if (DRY_RUN) {
    console.log("\n  [DRY RUN — No changes were written]");
  }

  console.log("═══════════════════════════════════════════════\n");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => {
    prismadb.$disconnect();
  });
