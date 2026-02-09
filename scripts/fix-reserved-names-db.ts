#!/usr/bin/env npx tsx

/**
 * Fix ReservedName table in DATABASE_URL database
 * This script connects directly to DATABASE_URL (not DIRECT_DATABASE_URL)
 */

import * as dotenv from "dotenv";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment");
  process.exit(1);
}

console.log("🔗 Connecting to DATABASE_URL database...");
console.log(`   URL: ${DATABASE_URL.substring(0, 50)}...`);

// Create Prisma client with explicit DATABASE_URL
const prismadb = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

async function main() {
  try {
    console.log("\n📋 Creating ReservedName table and enums...");

    // Drop and recreate everything
    await prismadb.$executeRawUnsafe(`
      -- Drop table if exists
      DROP TABLE IF EXISTS "ReservedName" CASCADE;

      -- Drop enums if exist
      DROP TYPE IF EXISTS "ReservedNameType" CASCADE;
      DROP TYPE IF EXISTS "ReservedNameStatus" CASCADE;

      -- Create enums
      CREATE TYPE "ReservedNameType" AS ENUM ('USERNAME', 'ORGANIZATION_NAME', 'ORGANIZATION_SLUG');
      CREATE TYPE "ReservedNameStatus" AS ENUM ('ACTIVE', 'INACTIVE');

      -- Create table
      CREATE TABLE "ReservedName" (
          "id" TEXT NOT NULL,
          "type" "ReservedNameType" NOT NULL,
          "value" TEXT NOT NULL,
          "normalizedValue" TEXT NOT NULL,
          "status" "ReservedNameStatus" NOT NULL DEFAULT 'ACTIVE',
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "ReservedName_pkey" PRIMARY KEY ("id")
      );

      -- Create indexes
      CREATE INDEX "ReservedName_type_idx" ON "ReservedName"("type");
      CREATE INDEX "ReservedName_status_idx" ON "ReservedName"("status");
      CREATE UNIQUE INDEX "ReservedName_type_normalizedValue_key" ON "ReservedName"("type", "normalizedValue");
    `);

    console.log("✅ Table and enums created");

    // Insert seed data
    console.log("\n🌱 Seeding reserved names...");
    await prismadb.$executeRawUnsafe(`
      INSERT INTO "ReservedName" (id, type, value, "normalizedValue", status, notes, "createdAt", "updatedAt")
      VALUES
        (gen_random_uuid(), 'USERNAME', 'oikion', 'oikion', 'ACTIVE', 'Seeded', NOW(), NOW()),
        (gen_random_uuid(), 'ORGANIZATION_NAME', 'oikion', 'oikion', 'ACTIVE', 'Seeded', NOW(), NOW()),
        (gen_random_uuid(), 'ORGANIZATION_SLUG', 'oikion', 'oikion', 'ACTIVE', 'Seeded', NOW(), NOW()),
        (gen_random_uuid(), 'USERNAME', 'admin', 'admin', 'ACTIVE', 'Seeded', NOW(), NOW()),
        (gen_random_uuid(), 'ORGANIZATION_NAME', 'admin', 'admin', 'ACTIVE', 'Seeded', NOW(), NOW()),
        (gen_random_uuid(), 'ORGANIZATION_SLUG', 'admin', 'admin', 'ACTIVE', 'Seeded', NOW(), NOW()),
        (gen_random_uuid(), 'USERNAME', 'support', 'support', 'ACTIVE', 'Seeded', NOW(), NOW()),
        (gen_random_uuid(), 'ORGANIZATION_NAME', 'support', 'support', 'ACTIVE', 'Seeded', NOW(), NOW()),
        (gen_random_uuid(), 'ORGANIZATION_SLUG', 'support', 'support', 'ACTIVE', 'Seeded', NOW(), NOW()),
        (gen_random_uuid(), 'USERNAME', 'platform-admin', 'platformadmin', 'ACTIVE', 'Seeded', NOW(), NOW()),
        (gen_random_uuid(), 'ORGANIZATION_NAME', 'platform-admin', 'platform-admin', 'ACTIVE', 'Seeded', NOW(), NOW()),
        (gen_random_uuid(), 'ORGANIZATION_SLUG', 'platform-admin', 'platform-admin', 'ACTIVE', 'Seeded', NOW(), NOW())
      ON CONFLICT (type, "normalizedValue") DO NOTHING;
    `);

    // Verify
    const count = await prismadb.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM "ReservedName"`
    );
    console.log(`✅ Seeded ${count[0].count} reserved names`);

    console.log("\n✅ Done! The ReservedName table is now ready.");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prismadb.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
