#!/usr/bin/env npx tsx

/**
 * RESERVED NAMES SEED SCRIPT
 *
 * Usage:
 *   npx tsx scripts/seed-reserved-names.ts
 *
 * Environment variables required:
 *   - DATABASE_URL: PostgreSQL connection string
 */

import * as dotenv from "dotenv";
import * as path from "node:path";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

import type { ReservedNameStatus, ReservedNameType } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

import { getNormalizedReservedValue } from "../lib/reserved-names";

const prismadb = new PrismaClient({
  datasourceUrl: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
});

const RESERVED_SEED = [
  // Platform/system terms
  { value: "oikion", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "admin", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "support", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "help", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "root", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "system", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "platform", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "staff", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "team", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "api", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "security", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "billing", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "legal", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "privacy", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "terms", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "dashboard", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "platform-admin", types: ["ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },

  // Major agency brands (examples)
  { value: "remax", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "century21", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "coldwellbanker", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "kellerwilliams", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "sothebys", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
  { value: "era", types: ["USERNAME", "ORGANIZATION_NAME", "ORGANIZATION_SLUG"] as const },
] as const;

function buildSeedRows() {
  const rows: Array<{
    type: ReservedNameType;
    value: string;
    normalizedValue: string;
    status: ReservedNameStatus;
    notes: string | null;
  }> = [];

  for (const entry of RESERVED_SEED) {
    for (const type of entry.types) {
      const normalizedValue = getNormalizedReservedValue(type, entry.value);
      if (!normalizedValue) continue;
      rows.push({
        type: type as ReservedNameType,
        value: entry.value,
        normalizedValue,
        status: "ACTIVE" as ReservedNameStatus,
        notes: "Seeded",
      });
    }
  }

  return rows;
}

async function main() {
  console.log("🚀 Seeding reserved names...");

  if (!process.env.DIRECT_DATABASE_URL && !process.env.DATABASE_URL) {
    console.error("❌ Error: DIRECT_DATABASE_URL or DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const rows = buildSeedRows();

  const result = await prismadb.reservedName.createMany({
    data: rows,
    skipDuplicates: true,
  });

  console.log(`✓ Seeded ${result.count} reserved name entries`);
}

main()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prismadb.$disconnect();
  });
