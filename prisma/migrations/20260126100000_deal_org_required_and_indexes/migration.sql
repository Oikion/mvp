-- Security Fix: Make Deal.organizationId required for tenant isolation
-- This migration backfills existing NULL values and makes the field required

-- Step 1: Backfill NULL organizationId values from related Properties
-- Deals should inherit organizationId from their Property
UPDATE "Deal" d
SET "organizationId" = p."organizationId"
FROM "Properties" p
WHERE d."propertyId" = p."id"
  AND d."organizationId" IS NULL
  AND p."organizationId" IS NOT NULL;

-- Step 2: For any remaining NULLs (orphaned deals), set a placeholder
-- This should be manually reviewed - these deals may need to be cleaned up
UPDATE "Deal"
SET "organizationId" = 'ORPHANED_NEEDS_REVIEW'
WHERE "organizationId" IS NULL;

-- Step 3: Make the column required
ALTER TABLE "Deal" ALTER COLUMN "organizationId" SET NOT NULL;

-- Step 4: Add performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS "Deal_createdAt_idx" ON "Deal"("createdAt");
CREATE INDEX IF NOT EXISTS "Deal_closedAt_idx" ON "Deal"("closedAt");
CREATE INDEX IF NOT EXISTS "Deal_organizationId_status_idx" ON "Deal"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Deal_organizationId_createdAt_idx" ON "Deal"("organizationId", "createdAt");

-- Add indexes for Properties common query patterns
CREATE INDEX IF NOT EXISTS "Properties_transaction_type_idx" ON "Properties"("transaction_type");
CREATE INDEX IF NOT EXISTS "Properties_property_type_idx" ON "Properties"("property_type");
CREATE INDEX IF NOT EXISTS "Properties_organizationId_property_status_idx" ON "Properties"("organizationId", "property_status");

-- Add indexes for Clients common query patterns
CREATE INDEX IF NOT EXISTS "Clients_client_type_idx" ON "Clients"("client_type");
CREATE INDEX IF NOT EXISTS "Clients_organizationId_client_status_idx" ON "Clients"("organizationId", "client_status");
