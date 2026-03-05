-- Add friendlyId column to all core business entities.
-- Copies existing id values into friendlyId for backward compatibility.
-- Adds compound unique (friendlyId, organizationId) for per-org uniqueness.

-- ============================================
-- Properties
-- ============================================
ALTER TABLE "Properties" ADD COLUMN "friendlyId" TEXT;
UPDATE "Properties" SET "friendlyId" = id;
CREATE UNIQUE INDEX "Properties_friendlyId_organizationId_key" ON "Properties"("friendlyId", "organizationId");
CREATE INDEX "Properties_friendlyId_idx" ON "Properties"("friendlyId");

-- ============================================
-- Clients
-- ============================================
ALTER TABLE "Clients" ADD COLUMN "friendlyId" TEXT;
UPDATE "Clients" SET "friendlyId" = id;
CREATE UNIQUE INDEX "Clients_friendlyId_organizationId_key" ON "Clients"("friendlyId", "organizationId");
CREATE INDEX "Clients_friendlyId_idx" ON "Clients"("friendlyId");

-- ============================================
-- Deal
-- ============================================
ALTER TABLE "Deal" ADD COLUMN "friendlyId" TEXT;
UPDATE "Deal" SET "friendlyId" = id;
CREATE UNIQUE INDEX "Deal_friendlyId_organizationId_key" ON "Deal"("friendlyId", "organizationId");
CREATE INDEX "Deal_friendlyId_idx" ON "Deal"("friendlyId");

-- ============================================
-- Documents
-- ============================================
ALTER TABLE "Documents" ADD COLUMN "friendlyId" TEXT;
UPDATE "Documents" SET "friendlyId" = id;
CREATE UNIQUE INDEX "Documents_friendlyId_organizationId_key" ON "Documents"("friendlyId", "organizationId");
CREATE INDEX "Documents_friendlyId_idx" ON "Documents"("friendlyId");

-- ============================================
-- CalendarEvent
-- ============================================
ALTER TABLE "CalendarEvent" ADD COLUMN "friendlyId" TEXT;
UPDATE "CalendarEvent" SET "friendlyId" = id;
CREATE UNIQUE INDEX "CalendarEvent_friendlyId_organizationId_key" ON "CalendarEvent"("friendlyId", "organizationId");
CREATE INDEX "CalendarEvent_friendlyId_idx" ON "CalendarEvent"("friendlyId");

-- ============================================
-- crm_Accounts_Tasks
-- ============================================
ALTER TABLE "crm_Accounts_Tasks" ADD COLUMN "friendlyId" TEXT;
UPDATE "crm_Accounts_Tasks" SET "friendlyId" = id;
CREATE UNIQUE INDEX "crm_Accounts_Tasks_friendlyId_organizationId_key" ON "crm_Accounts_Tasks"("friendlyId", "organizationId");
CREATE INDEX "crm_Accounts_Tasks_friendlyId_idx" ON "crm_Accounts_Tasks"("friendlyId");

-- ============================================
-- Mandate
-- ============================================
ALTER TABLE "Mandate" ADD COLUMN "friendlyId" TEXT;
UPDATE "Mandate" SET "friendlyId" = id;
CREATE UNIQUE INDEX "Mandate_friendlyId_organizationId_key" ON "Mandate"("friendlyId", "organizationId");
CREATE INDEX "Mandate_friendlyId_idx" ON "Mandate"("friendlyId");
