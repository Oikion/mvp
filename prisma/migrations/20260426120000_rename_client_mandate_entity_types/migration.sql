-- Migration: rename CLIENT→CONTACT and MANDATE→REQUEST across entity type fields
-- This migration has three parts:
--   1. Migrate String entityType columns (EntitySession, PiiAccessLog) — no enum constraint, plain UPDATEs
--   2. Migrate SharedEntityType enum — drop CLIENT (data already moved to CONTACT)
--   3. Migrate ExportEntityType enum — rename CLIENT→CONTACT and BULK_CLIENTS→BULK_CONTACTS

-- ─── Part 1: String columns ───────────────────────────────────────────────────

UPDATE "EntitySession" SET "entityType" = 'CONTACT' WHERE "entityType" = 'CLIENT';
UPDATE "EntitySession" SET "entityType" = 'REQUEST' WHERE "entityType" = 'MANDATE';

UPDATE "PiiAccessLog" SET "entityType" = 'CONTACT' WHERE "entityType" = 'CLIENT';
UPDATE "PiiAccessLog" SET "entityType" = 'REQUEST' WHERE "entityType" = 'MANDATE';

-- ─── Part 2: SharedEntityType — remove CLIENT value ──────────────────────────
-- Move any remaining CLIENT rows to CONTACT first (safe no-op if already migrated)
UPDATE "SharedEntity" SET "entityType" = 'CONTACT' WHERE "entityType" = 'CLIENT';

-- Drop/recreate pattern: PostgreSQL cannot remove an enum value directly
ALTER TABLE "SharedEntity" ALTER COLUMN "entityType" TYPE TEXT;
DROP TYPE "SharedEntityType";
CREATE TYPE "SharedEntityType" AS ENUM ('PROPERTY', 'DOCUMENT', 'CONTACT');
ALTER TABLE "SharedEntity" ALTER COLUMN "entityType" TYPE "SharedEntityType" USING "entityType"::"SharedEntityType";

-- ─── Part 3: ExportEntityType — rename values in-place ───────────────────────
-- ALTER TYPE RENAME VALUE is idempotent-safe: the migration will fail if the
-- source value does not exist, which is the desired guard.
ALTER TYPE "ExportEntityType" RENAME VALUE 'CLIENT' TO 'CONTACT';
ALTER TYPE "ExportEntityType" RENAME VALUE 'BULK_CLIENTS' TO 'BULK_CONTACTS';
