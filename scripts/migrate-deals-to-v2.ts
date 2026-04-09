/**
 * Deal → Deal v2.0 Data Migration Script (Entity Architecture v2.0 — Phase 3)
 *
 * Migrates legacy Deal records to the v2.0 Deal pipeline. Runs AFTER the
 * Prisma migration `20260407101941_phase3_deal_pipeline` has been applied.
 *
 * Division of labor with the SQL migration:
 *  - The SQL migration handles the legacy `dealType` enum conversion
 *    (SELLER/BUYER/DUAL → SALE + LISTING_SIDE/BUYER_SIDE/DUAL_AGENCY) in a
 *    single in-place UPDATE, because it must happen atomically with the
 *    column type swap (the old `"DealType"` column type is incompatible with
 *    the new `"DealTransactionType"` column type, so the legacy values can't
 *    survive the migration without an in-SQL backfill).
 *  - This script handles everything else:
 *     • Backfills `stage` from legacy `status` (10-stage Greek RE pipeline)
 *     • Creates an initial `DealStageLog` audit entry per deal with the
 *       `[v2.0-migration]` sentinel (timestamp = deal.createdAt)
 *     • Migrates legacy `clientId` FK → `DealParty(BUYER)` join row using
 *       the Contact.legacyClientId lookup map built by Phase 1
 *
 * NOTES:
 *  - Schema-level renames (propertyAgentSplit→listingAgentSplit, etc.) are
 *    handled by the Prisma migration, NOT this script. This script only
 *    touches DATA.
 *  - The legacy `status` and `clientId` columns are PRESERVED for rollback
 *    safety. A later cleanup phase will remove them.
 *  - `mapLegacyDealType` will always fall through to `default` post-migration
 *    (since the SQL migration already converted the column) — the script's
 *    `dealType`/`agentRole` update spread is therefore a no-op. This is
 *    intentional: the SQL owns those fields, and the script is safe to
 *    re-run without clobbering them.
 *  - Soft-deleted deals (deletedAt != null) ARE migrated for audit-trail
 *    completeness. This script bypasses the soft-delete Prisma extension by
 *    using a raw PrismaClient.
 *  - Idempotent: re-running is safe. A deal is considered "already migrated"
 *    if it already has a DealStageLog entry with notes containing the
 *    migration sentinel.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-deals-to-v2.ts                # dry run (default)
 *   pnpm tsx scripts/migrate-deals-to-v2.ts --apply        # actually write
 *   pnpm tsx scripts/migrate-deals-to-v2.ts --org=<id>     # restrict to one org
 */

import { PrismaClient } from "@prisma/client";

// ────────────────────────────────────────────────────────
// Local enum string-literal types
// ────────────────────────────────────────────────────────
//
// We define these as string-literal types instead of importing the generated
// Prisma enums for two reasons:
//   1. Some of the v2.0 enums (DealStage, DealTransactionType, AgentRole,
//      DealPartyRole) may not yet exist in the user's locally-generated Prisma
//      client at the moment they run this script. They will exist in the schema
//      and migrate cleanly via Prisma migration, but the generated client may
//      lag the schema until `pnpm prisma generate` is run.
//   2. This matches the established pattern in scripts/migrate-mandates-to-requests.ts,
//      which uses `as any` casts on enum values for the same reason.
//
// All values below are validated against prisma/schema.prisma at script-author time.

type DealStatus =
  | "PROPOSED"
  | "NEGOTIATING"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

type DealType = "SELLER" | "BUYER" | "DUAL"; // legacy

type DealStage =
  | "INTEREST"
  | "OFFER"
  | "NEGOTIATION"
  | "PRELIMINARY_AGREEMENT"
  | "DUE_DILIGENCE"
  | "TRANSFER_TAX"
  | "SIGNING"
  | "REGISTRATION"
  | "COMPLETED"
  | "FALLEN_THROUGH";

type DealTransactionType = "SALE" | "RENT";
type AgentRole = "LISTING_SIDE" | "BUYER_SIDE" | "DUAL_AGENCY";

// ────────────────────────────────────────────────────────
// Raw client (bypasses soft-delete extension)
// ────────────────────────────────────────────────────────
//
// Deal IS in SOFT_DELETE_MODELS in lib/prisma.ts, so the shared `prismadb` client
// would auto-filter `deletedAt = null`. We want to migrate soft-deleted deals as well
// (for audit-trail completeness), so we instantiate a raw client here that has no
// extensions attached.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

// ────────────────────────────────────────────────────────
// CLI args
// ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const DRY_RUN = !APPLY;
const ORG_ID = args.find((a) => a.startsWith("--org="))?.split("=")[1];

const MIGRATION_SENTINEL = "[v2.0-migration]";

// ────────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────────

interface MigrationStats {
  totalOrgs: number;
  totalDeals: number;
  migrated: number;
  skippedAlreadyMigrated: number;
  ambiguousStageMappings: number;
  partiesCreated: number;
  partiesSkippedNoContact: number;
  partiesSkippedAlreadyExists: number;
  errors: string[];
  warnings: string[];
}

// ────────────────────────────────────────────────────────
// Mapping helpers
// ────────────────────────────────────────────────────────

/**
 * Map legacy DealStatus → new DealStage.
 * IN_PROGRESS is ambiguous (could be DUE_DILIGENCE, TRANSFER_TAX, or SIGNING) —
 * we default to DUE_DILIGENCE and flag for manual review.
 */
function mapStatusToStage(
  status: DealStatus | null | undefined
): { stage: DealStage; ambiguous: boolean } {
  switch (status) {
    case "PROPOSED":
      return { stage: "INTEREST", ambiguous: false };
    case "NEGOTIATING":
      return { stage: "NEGOTIATION", ambiguous: false };
    case "ACCEPTED":
      return { stage: "PRELIMINARY_AGREEMENT", ambiguous: false };
    case "IN_PROGRESS":
      return { stage: "DUE_DILIGENCE", ambiguous: true };
    case "COMPLETED":
      return { stage: "COMPLETED", ambiguous: false };
    case "CANCELLED":
      return { stage: "FALLEN_THROUGH", ambiguous: false };
    default:
      // Defensive: status has a DB-level default of PROPOSED so this shouldn't happen
      return { stage: "INTEREST", ambiguous: true };
  }
}

/**
 * Map legacy DealType (SELLER/BUYER/DUAL) → new DealTransactionType + AgentRole.
 * All legacy deals are assumed to be SALE — no rental data exists in legacy schema.
 * Returns nulls if the legacy field is null (preserve nullability).
 */
function mapLegacyDealType(
  legacyDealType: DealType | null | undefined
): {
  newDealType: DealTransactionType | null;
  newAgentRole: AgentRole | null;
} {
  switch (legacyDealType) {
    case "SELLER":
      return { newDealType: "SALE", newAgentRole: "LISTING_SIDE" };
    case "BUYER":
      return { newDealType: "SALE", newAgentRole: "BUYER_SIDE" };
    case "DUAL":
      return { newDealType: "SALE", newAgentRole: "DUAL_AGENCY" };
    default:
      return { newDealType: null, newAgentRole: null };
  }
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
// Per-org migration
// ────────────────────────────────────────────────────────

interface DealRow {
  id: string;
  friendlyId: string;
  organizationId: string;
  status: DealStatus;
  stage: DealStage;
  dealType: DealType | null;
  agentRole: AgentRole | null;
  clientId: string | null;
  proposedById: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}

interface PlannedMigration {
  newStage: DealStage;
  newDealType: DealTransactionType | null;
  newAgentRole: AgentRole | null;
  resolvedContactId: string | null;
  ambiguous: boolean;
}

/**
 * Build the legacyClientId → contactId lookup map for an org (from Phase 1 migration).
 */
async function buildClientToContactMap(
  organizationId: string
): Promise<{
  active: Map<string, string>;
  softDeleted: Map<string, string>;
}> {
  const active = new Map<string, string>();
  const softDeleted = new Map<string, string>();
  // Fetch ALL contacts (including soft-deleted) so we can distinguish
  // "Phase 1 mapping never existed" from "Phase 1 mapping existed but Contact
  // was soft-deleted afterwards" when emitting warnings.
  const contacts = await prisma.contact.findMany({
    where: {
      organizationId,
      legacyClientId: { not: null },
    },
    select: { id: true, legacyClientId: true, deletedAt: true },
  });
  for (const c of contacts) {
    if (!c.legacyClientId) continue;
    if (c.deletedAt === null) {
      active.set(c.legacyClientId, c.id);
    } else {
      softDeleted.set(c.legacyClientId, c.id);
    }
  }
  return { active, softDeleted };
}

/**
 * Idempotency check: a deal is "already migrated" iff a DealStageLog with our
 * migration sentinel already exists for it.
 *
 * We use the sentinel rather than checking `stage` or log count alone because:
 *   - the new column has DB default INTEREST, so a fresh row would falsely look
 *     "unmigrated" if its legacy status was PROPOSED
 *   - other code paths could legitimately add stage logs unrelated to migration
 */
async function isAlreadyMigrated(dealId: string): Promise<boolean> {
  const existing = await prisma.dealStageLog.findFirst({
    where: {
      dealId,
      notes: { contains: MIGRATION_SENTINEL },
    },
    select: { id: true },
  });
  return existing !== null;
}

/**
 * Compute the planned migration for a deal — pure function, no DB writes.
 * Records ambiguous mappings and missing-contact warnings into stats.
 */
function planMigration(
  deal: DealRow,
  clientToContact: {
    active: Map<string, string>;
    softDeleted: Map<string, string>;
  },
  stats: MigrationStats
): PlannedMigration {
  const { stage: newStage, ambiguous } = mapStatusToStage(deal.status);
  const { newDealType, newAgentRole } = mapLegacyDealType(deal.dealType);

  if (ambiguous) {
    stats.ambiguousStageMappings++;
    stats.warnings.push(
      `Deal ${deal.friendlyId}: status=${deal.status} mapped to ${newStage} (ambiguous — review recommended)`
    );
  }

  let resolvedContactId: string | null = null;
  if (deal.clientId) {
    const mapped = clientToContact.active.get(deal.clientId);
    if (mapped) {
      resolvedContactId = mapped;
    } else if (clientToContact.softDeleted.has(deal.clientId)) {
      stats.partiesSkippedNoContact++;
      stats.warnings.push(
        `Deal ${deal.friendlyId}: legacy clientId ${deal.clientId} maps to a soft-deleted Contact (skipping DealParty creation)`
      );
    } else {
      stats.partiesSkippedNoContact++;
      stats.warnings.push(
        `Deal ${deal.friendlyId}: legacy clientId ${deal.clientId} has no Contact (Phase 1 mapping missing)`
      );
    }
  }

  return { newStage, newDealType, newAgentRole, resolvedContactId, ambiguous };
}

/**
 * Format the dry-run preview line for a single deal.
 */
function formatDryRunLine(deal: DealRow, plan: PlannedMigration): string {
  let partyMsg: string;
  if (plan.resolvedContactId) {
    partyMsg = `+DealParty(BUYER)`;
  } else if (deal.clientId) {
    partyMsg = `(no contact mapping)`;
  } else {
    partyMsg = `(no clientId)`;
  }

  const fieldParts: string[] = [];
  if (plan.newDealType) fieldParts.push(`dealType=${plan.newDealType}`);
  if (plan.newAgentRole) fieldParts.push(`agentRole=${plan.newAgentRole}`);
  const fieldSuffix = fieldParts.length > 0 ? `, ${fieldParts.join(", ")}` : "";

  return `    [DRY] ${deal.friendlyId}: status=${deal.status} → stage=${plan.newStage}${fieldSuffix} ${partyMsg}`;
}

/**
 * Apply the planned migration to the database, transactionally.
 * Mutates `stats` to count parties created/skipped.
 */
async function applyMigration(
  deal: DealRow,
  plan: PlannedMigration,
  stats: MigrationStats
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Update Deal — set new stage / dealType / agentRole.
    //    We always write `stage` (it's non-null with a default) and only write
    //    dealType/agentRole when we have a value, so we don't overwrite values
    //    that might already be set by a partial previous run.
    await tx.deal.update({
      where: { id: deal.id },
      data: {
        stage: plan.newStage as never,
        ...(plan.newDealType ? { dealType: plan.newDealType as never } : {}),
        ...(plan.newAgentRole ? { agentRole: plan.newAgentRole as never } : {}),
      },
    });

    // 2. Create initial DealStageLog audit entry.
    //    `changedAt` is set to deal.createdAt (NOT now()) to anchor the audit
    //    trail at the deal's actual creation time.
    await tx.dealStageLog.create({
      data: {
        dealId: deal.id,
        fromStage: "INTEREST" as never,
        toStage: plan.newStage as never,
        changedBy: deal.proposedById ?? null,
        notes: `${MIGRATION_SENTINEL} migrated from legacy status: ${deal.status ?? "<null>"}`,
        changedAt: deal.createdAt,
      },
    });

    // 3. Migrate legacy clientId → DealParty (role = BUYER).
    if (plan.resolvedContactId) {
      await upsertDealParty(tx, deal, plan.resolvedContactId, stats);
    }
  });
}

/**
 * Structural type for the transaction client surface we touch in upsertDealParty.
 * Avoids importing Prisma.TransactionClient directly so this script stays
 * forward-compatible with regenerations of the Prisma client.
 */
type TxLike = {
  dealParty: {
    findUnique: (args: unknown) => Promise<{ id: string } | null>;
    create: (args: unknown) => Promise<unknown>;
  };
};

/**
 * Idempotently create a DealParty(BUYER) row for a (deal, contact) pair.
 * The unique constraint [dealId, contactId, role] would throw on duplicate,
 * so we check first to avoid aborting the transaction.
 */
async function upsertDealParty(
  tx: TxLike,
  deal: DealRow,
  contactId: string,
  stats: MigrationStats
): Promise<void> {
  const existingParty = await tx.dealParty.findUnique({
    where: {
      dealId_contactId_role: {
        dealId: deal.id,
        contactId,
        role: "BUYER",
      },
    },
    select: { id: true },
  });

  if (existingParty) {
    stats.partiesSkippedAlreadyExists++;
    return;
  }

  await tx.dealParty.create({
    data: {
      organizationId: deal.organizationId,
      dealId: deal.id,
      contactId,
      role: "BUYER",
      notes: `${MIGRATION_SENTINEL} migrated from legacy Deal.clientId`,
    },
  });
  stats.partiesCreated++;
}

/**
 * Process a single deal — idempotency check, plan, then dry-run or apply.
 * All errors are caught at the caller level (per-deal try/catch).
 */
async function processDeal(
  deal: DealRow,
  clientToContact: {
    active: Map<string, string>;
    softDeleted: Map<string, string>;
  },
  stats: MigrationStats
): Promise<void> {
  if (await isAlreadyMigrated(deal.id)) {
    stats.skippedAlreadyMigrated++;
    return;
  }

  const plan = planMigration(deal, clientToContact, stats);

  if (DRY_RUN) {
    log(formatDryRunLine(deal, plan));
    stats.migrated++;
    return;
  }

  await applyMigration(deal, plan, stats);
  stats.migrated++;

  // Success log line
  const suffixParts: string[] = [];
  if (plan.newDealType) suffixParts.push(plan.newDealType);
  if (plan.newAgentRole) suffixParts.push(plan.newAgentRole);
  if (plan.resolvedContactId) suffixParts.push("+party");
  const suffix = suffixParts.length > 0 ? `, ${suffixParts.join(", ")}` : "";
  log(`    ✓ ${deal.friendlyId} → stage=${plan.newStage}${suffix}`);
}

async function migrateOrgDeals(
  organizationId: string,
  stats: MigrationStats
): Promise<void> {
  log(`\n  ── Migrating org: ${organizationId} ──`);

  const clientToContact = await buildClientToContactMap(organizationId);

  // Fetch ALL deals for this org (including soft-deleted) — we use the raw client
  // so the soft-delete extension does NOT filter them out.
  const deals = (await prisma.deal.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      friendlyId: true,
      organizationId: true,
      status: true,
      stage: true,
      dealType: true,
      agentRole: true,
      clientId: true,
      proposedById: true,
      createdAt: true,
      deletedAt: true,
    },
  })) as unknown as DealRow[];

  log(`    Found ${deals.length} deal(s) (including soft-deleted)`);
  stats.totalDeals += deals.length;

  for (const deal of deals) {
    try {
      await processDeal(deal, clientToContact, stats);
    } catch (err) {
      const msg = `Deal ${deal.friendlyId} (${deal.id}): ${
        err instanceof Error ? err.message : String(err)
      }`;
      logError(msg);
      stats.errors.push(msg);
      // Continue with the next deal — never crash on a single bad row.
    }
  }
}

// ────────────────────────────────────────────────────────
// Entry point
// ────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  Deal → Deal v2.0 Migration (Phase 3)");
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN" : "APPLY (LIVE)"}`);
  if (ORG_ID) console.log(`  Org filter: ${ORG_ID}`);
  console.log("═══════════════════════════════════════════════");

  const stats: MigrationStats = {
    totalOrgs: 0,
    totalDeals: 0,
    migrated: 0,
    skippedAlreadyMigrated: 0,
    ambiguousStageMappings: 0,
    partiesCreated: 0,
    partiesSkippedNoContact: 0,
    partiesSkippedAlreadyExists: 0,
    errors: [],
    warnings: [],
  };

  // Discover orgs to migrate
  let orgIds: string[];
  if (ORG_ID) {
    orgIds = [ORG_ID];
  } else {
    const orgs = await prisma.deal.groupBy({
      by: ["organizationId"],
    });
    orgIds = orgs.map((o) => o.organizationId);
  }

  stats.totalOrgs = orgIds.length;
  log(`\nFound ${orgIds.length} organization(s) with deals.`);

  for (const orgId of orgIds) {
    try {
      await migrateOrgDeals(orgId, stats);
    } catch (err) {
      const msg = `Org ${orgId} failed: ${
        err instanceof Error ? err.message : String(err)
      }`;
      logError(msg);
      stats.errors.push(msg);
      // Continue with the next org.
    }
  }

  // ── Summary ──
  console.log("\n═══════════════════════════════════════════════");
  console.log("  Migration Summary");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Organizations:               ${stats.totalOrgs}`);
  console.log(`  Total Deals:                 ${stats.totalDeals}`);
  console.log(
    `  ${APPLY ? "Migrated:                   " : "Would migrate:              "} ${stats.migrated}`
  );
  console.log(`  Skipped (already migrated):  ${stats.skippedAlreadyMigrated}`);
  console.log(`  Ambiguous stage mappings:    ${stats.ambiguousStageMappings}`);
  console.log(`  DealParty rows created:      ${stats.partiesCreated}`);
  console.log(`  DealParty skipped (exists):  ${stats.partiesSkippedAlreadyExists}`);
  console.log(`  DealParty skipped (no map):  ${stats.partiesSkippedNoContact}`);
  console.log(`  Errors:                      ${stats.errors.length}`);
  console.log(`  Warnings:                    ${stats.warnings.length}`);

  if (stats.warnings.length > 0) {
    console.log("\n  ── Warnings ──");
    for (const w of stats.warnings) {
      console.log(`    • ${w}`);
    }
  }

  if (stats.errors.length > 0) {
    console.log("\n  ── Errors ──");
    for (const err of stats.errors) {
      console.log(`    • ${err}`);
    }
  }

  if (DRY_RUN) {
    console.log("\n  [DRY RUN — no changes were written]");
    console.log("  Re-run with --apply to commit changes.");
  } else {
    console.log("\n  ✅ APPLIED");
  }

  console.log("═══════════════════════════════════════════════\n");

  // Exit non-zero if any deal-level error occurred so CI/cron can detect failure.
  if (stats.errors.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    logError(`Fatal: ${err instanceof Error ? err.stack || err.message : String(err)}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
