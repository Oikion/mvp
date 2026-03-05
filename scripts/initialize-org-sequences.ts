/**
 * Initialize per-org IdSequence rows from existing data.
 *
 * For each org-scoped entity type, scans all organizations that have records,
 * extracts the max sequence number from existing friendlyId values, and
 * creates/updates IdSequence rows so that new IDs continue from the correct value.
 *
 * Run after deploying the friendlyId migration:
 *   npx tsx scripts/initialize-org-sequences.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Tables that need per-org sequences, mapped to their prefix.
 * Must match ENTITY_PREFIXES in lib/friendly-id.ts
 */
const ORG_SCOPED_TABLES: Array<{ table: string; prefix: string }> = [
  { table: "Properties", prefix: "prp" },
  { table: "Clients", prefix: "clt" },
  { table: "Mandate", prefix: "mnd" },
  { table: "Documents", prefix: "doc" },
  { table: "crm_Accounts_Tasks", prefix: "tsk" },
  { table: "Deal", prefix: "deal" },
  { table: "CalendarEvent", prefix: "evt" },
];

async function main() {
  console.log("Initializing per-org IdSequence rows...\n");

  for (const { table, prefix } of ORG_SCOPED_TABLES) {
    console.log(`Processing ${table} (prefix: ${prefix})...`);

    // Find all distinct orgs + their max sequence number from friendlyId
    // friendlyId format: "{prefix}-{NNNNNN}" e.g. "prp-000042"
    const rows = await prisma.$queryRawUnsafe<
      Array<{ organizationId: string; maxSeq: number }>
    >(
      `SELECT "organizationId",
              COALESCE(MAX(CAST(SUBSTRING("friendlyId" FROM '${prefix}-(\\d+)') AS INTEGER)), 0) AS "maxSeq"
       FROM "${table}"
       WHERE "friendlyId" IS NOT NULL
         AND "friendlyId" LIKE '${prefix}-%'
       GROUP BY "organizationId"`
    );

    for (const { organizationId, maxSeq } of rows) {
      const compositeId = `${prefix}:${organizationId}`;
      console.log(`  ${organizationId}: ${prefix}-${String(maxSeq).padStart(6, "0")} (lastValue=${maxSeq})`);

      await prisma.$queryRaw`
        INSERT INTO "IdSequence" (id, prefix, "organizationId", "lastValue", "updatedAt")
        VALUES (${compositeId}, ${prefix}, ${organizationId}, ${maxSeq}, NOW())
        ON CONFLICT (prefix, "organizationId")
        DO UPDATE SET
          "lastValue" = GREATEST("IdSequence"."lastValue", ${maxSeq}),
          "updatedAt" = NOW()
      `;
    }

    if (rows.length === 0) {
      console.log("  (no records found)");
    }
  }

  // Clean up the old __global__ rows for org-scoped entities since they're no longer used
  const orgScopedPrefixes = ORG_SCOPED_TABLES.map((t) => t.prefix);
  console.log(`\nCleaning up __global__ rows for org-scoped prefixes: ${orgScopedPrefixes.join(", ")}`);

  for (const prefix of orgScopedPrefixes) {
    await prisma.$queryRaw`
      DELETE FROM "IdSequence"
      WHERE prefix = ${prefix} AND "organizationId" = '__global__'
    `;
  }

  console.log("\nDone! Per-org sequences initialized.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
