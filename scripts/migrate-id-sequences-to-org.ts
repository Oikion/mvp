/**
 * Data Migration: Backfill org-scoped IdSequence rows
 *
 * After the schema migration adds `organizationId` to `IdSequence`,
 * this script scans each entity table to find the max friendly ID number
 * per organization and creates the corresponding per-org sequence rows.
 *
 * Safe to run multiple times (idempotent via ON CONFLICT + GREATEST).
 *
 * Usage: npx tsx scripts/migrate-id-sequences-to-org.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GLOBAL_ORG_ID = "__global__";

/**
 * Mapping from entity prefix to the table and column names used to extract
 * the max sequence number per organization.
 */
const ENTITY_TABLES: Array<{
  prefix: string;
  table: string;
  orgColumn: string;
}> = [
  { prefix: "prp", table: "Properties", orgColumn: "organizationId" },
  { prefix: "clt", table: "Clients", orgColumn: "organizationId" },
  { prefix: "mnd", table: "Mandate", orgColumn: "organizationId" },
  { prefix: "doc", table: "Documents", orgColumn: "organizationId" },
  { prefix: "tsk", table: "crm_Accounts_Tasks", orgColumn: "organizationId" },
  { prefix: "deal", table: "Deal", orgColumn: "organizationId" },
  { prefix: "con", table: "Client_Contacts", orgColumn: "organizationId" },
  // Property_Contacts has no organizationId — handled separately via join
  // { prefix: "pcon", table: "Property_Contacts", orgColumn: "organizationId" },
  { prefix: "evt", table: "CalendarEvent", orgColumn: "organizationId" },
  { prefix: "ntf", table: "Notification", orgColumn: "organizationId" },
  { prefix: "post", table: "SocialPost", orgColumn: "organizationId" },
  { prefix: "chn", table: "Channel", orgColumn: "organizationId" },
  { prefix: "cnv", table: "Conversation", orgColumn: "organizationId" },
  { prefix: "msg", table: "Message", orgColumn: "organizationId" },
];

async function migrateSequences() {
  console.log("🔄 Starting IdSequence org-scoping migration...\n");

  let totalRows = 0;

  for (const { prefix, table, orgColumn } of ENTITY_TABLES) {
    try {
      // Find max friendly ID number per org
      const rows = await prisma.$queryRawUnsafe<
        Array<{ organizationId: string; max_val: number }>
      >(
        `SELECT "${orgColumn}" AS "organizationId",
                MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)) AS max_val
         FROM "${table}"
         WHERE id LIKE '${prefix}-%'
         GROUP BY "${orgColumn}"`
      );

      if (rows.length === 0) {
        console.log(`  ⏭  ${prefix} (${table}): no data, skipping`);
        continue;
      }

      for (const row of rows) {
        const orgId = row.organizationId || GLOBAL_ORG_ID;
        const maxVal = Number(row.max_val);
        const compositeId = `${prefix}:${orgId}`;

        // Upsert with GREATEST to never decrease an existing sequence
        await prisma.$executeRawUnsafe(
          `INSERT INTO "IdSequence" (id, prefix, "organizationId", "lastValue", "updatedAt")
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (prefix, "organizationId")
           DO UPDATE SET
             "lastValue" = GREATEST("IdSequence"."lastValue", $4),
             "updatedAt" = NOW()`,
          compositeId,
          prefix,
          orgId,
          maxVal
        );

        totalRows++;
        console.log(
          `  ✅ ${prefix}:${orgId.substring(0, 8)}… → lastValue=${maxVal}`
        );
      }
    } catch (error) {
      // Table might not exist yet or have no matching rows — skip gracefully
      console.log(
        `  ⚠️  ${prefix} (${table}): skipped (${(error as Error).message.substring(0, 80)})`
      );
    }
  }

  // Special case: Property_Contacts — join through Properties to get organizationId
  try {
    const pconRows = await prisma.$queryRawUnsafe<
      Array<{ organizationId: string; max_val: number }>
    >(
      `SELECT p."organizationId",
              MAX(CAST(SPLIT_PART(pc.id, '-', 2) AS INTEGER))::int AS max_val
       FROM "Property_Contacts" pc
       JOIN "Properties" p ON pc.property = p.id
       WHERE pc.id LIKE 'pcon-%'
       GROUP BY p."organizationId"`
    );

    for (const row of pconRows) {
      const orgId = row.organizationId || GLOBAL_ORG_ID;
      const maxVal = Number(row.max_val);
      const compositeId = `pcon:${orgId}`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "IdSequence" (id, prefix, "organizationId", "lastValue", "updatedAt")
         VALUES ($1, 'pcon', $2, $3, NOW())
         ON CONFLICT (prefix, "organizationId")
         DO UPDATE SET
           "lastValue" = GREATEST("IdSequence"."lastValue", $3),
           "updatedAt" = NOW()`,
        compositeId,
        orgId,
        maxVal
      );
      totalRows++;
      console.log(`  ✅ pcon:${orgId.substring(0, 8)}… → lastValue=${maxVal}`);
    }

    if (pconRows.length === 0) {
      console.log(`  ⏭  pcon (Property_Contacts): no data, skipping`);
    }
  } catch (error) {
    console.log(
      `  ⚠️  pcon (Property_Contacts): skipped (${(error as Error).message.substring(0, 80)})`
    );
  }

  // Clean up old global-only rows that are now redundant
  // (They have id = prefix only, without the :orgId suffix)
  const cleaned = await prisma.$executeRaw`
    DELETE FROM "IdSequence"
    WHERE id NOT LIKE '%:%'
      AND EXISTS (
        SELECT 1 FROM "IdSequence" AS s
        WHERE s.prefix = "IdSequence".prefix
          AND s.id LIKE '%:%'
      )
  `;
  if (cleaned > 0) {
    console.log(`\n🧹 Cleaned up ${cleaned} old global-only sequence rows`);
  }

  console.log(`\n✅ Migration complete. Created/updated ${totalRows} org-scoped sequence rows.`);
}

migrateSequences()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
