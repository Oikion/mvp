-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 3 — Deal Pipeline + Showing Enhancement (NON-DESTRUCTIVE REWRITE)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- IMPORTANT — why this migration was hand-edited:
--
-- The original Prisma-generated migration dropped the `Deal` and
-- `PropertyShowing` tables and recreated them as `deals` / `property_showings`,
-- because Prisma's diff engine saw the new `@@map(...)` directives + many
-- column renames as a drop-and-recreate rather than a pure rename. Running
-- the generated version against production would have DESTROYED all existing
-- Deal and PropertyShowing rows.
--
-- This hand-edited version preserves all existing data by:
--   1. Renaming the tables in place (`ALTER TABLE … RENAME TO …`)
--   2. Renaming the primary-key and (later) foreign-key constraints to the
--      new `deals_*` / `property_showings_*` naming convention
--   3. Renaming columns that changed names (propertyAgentId → listingAgentId,
--      clientAgentId → buyerAgentId, propertyAgentSplit → listingAgentSplit,
--      clientAgentSplit → buyerAgentSplit)
--   4. Renaming existing indexes to match the new table name
--   5. Dropping two indexes that no longer exist in the v2.0 schema
--      (`Deal_friendlyId_idx`, `Deal_organizationId_status_idx`)
--   6. Adding the new v2.0 columns with their appropriate defaults/nullability
--   7. Migrating the legacy `dealType` enum column (SELLER/BUYER/DUAL) to the
--      new `dealType` (DealTransactionType: SALE/RENT) + `agentRole`
--      (AgentRole: LISTING_SIDE/BUYER_SIDE/DUAL_AGENCY) columns via a
--      transitional `_legacy_dealType` column, then dropping the transitional
--      column once the values are split across the two new columns
--   8. Creating the new join tables (deal_parties, deal_stage_logs,
--      showing_attendees) and their FKs
--
-- The `status` and `clientId` columns on Deal are PRESERVED for the Phase 3
-- data-migration script (`scripts/migrate-deals-to-v2.ts`), which reads them
-- to backfill `stage` and create `DealParty(BUYER)` join rows. A later cleanup
-- migration will drop them after the soak period.
--
-- ─────────────────────────────────────────────────────────────────────────────

-- ── CreateEnum ──────────────────────────────────────────────────────────────
CREATE TYPE "DealStage" AS ENUM ('INTEREST', 'OFFER', 'NEGOTIATION', 'PRELIMINARY_AGREEMENT', 'DUE_DILIGENCE', 'TRANSFER_TAX', 'SIGNING', 'REGISTRATION', 'COMPLETED', 'FALLEN_THROUGH');

-- CreateEnum
CREATE TYPE "DealTransactionType" AS ENUM ('SALE', 'RENT');

-- CreateEnum
CREATE TYPE "AgentRole" AS ENUM ('LISTING_SIDE', 'BUYER_SIDE', 'DUAL_AGENCY');

-- CreateEnum
CREATE TYPE "DealPartyRole" AS ENUM ('BUYER', 'SELLER', 'TENANT', 'LANDLORD', 'BUYER_AGENT', 'LISTING_AGENT', 'NOTARY', 'LAWYER', 'ACCOUNTANT', 'GUARANTOR', 'REPRESENTATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "ShowingStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "InterestLevel" AS ENUM ('NOT_INTERESTED', 'SLIGHTLY_INTERESTED', 'INTERESTED', 'VERY_INTERESTED', 'READY_TO_OFFER');

-- ── DropForeignKey (by old names, still on old tables) ──────────────────────
ALTER TABLE "AgentHours" DROP CONSTRAINT "AgentHours_dealId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_clientAgentId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_marketingSpendId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_propertyAgentId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_proposedById_fkey";

-- DropForeignKey
ALTER TABLE "PropertyShowing" DROP CONSTRAINT "PropertyShowing_clientId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyShowing" DROP CONSTRAINT "PropertyShowing_propertyId_fkey";

-- ── DropIndex (indexes no longer present in the v2.0 schema) ────────────────
-- Deal_friendlyId_idx is redundant with the compound unique
-- Deal_friendlyId_organizationId_key (now deals_friendlyId_organizationId_key)
DROP INDEX "Deal_friendlyId_idx";

-- Deal_organizationId_status_idx replaced by deals_organizationId_stage_idx
DROP INDEX "Deal_organizationId_status_idx";

-- ── RenameTable ─────────────────────────────────────────────────────────────
ALTER TABLE "Deal" RENAME TO "deals";
ALTER TABLE "PropertyShowing" RENAME TO "property_showings";

-- ── Rename PK constraint ────────────────────────────────────────────────────
ALTER TABLE "deals" RENAME CONSTRAINT "Deal_pkey" TO "deals_pkey";
ALTER TABLE "property_showings" RENAME CONSTRAINT "PropertyShowing_pkey" TO "property_showings_pkey";

-- ── RenameColumn (deals) ────────────────────────────────────────────────────
ALTER TABLE "deals" RENAME COLUMN "propertyAgentId" TO "listingAgentId";
ALTER TABLE "deals" RENAME COLUMN "clientAgentId" TO "buyerAgentId";
ALTER TABLE "deals" RENAME COLUMN "propertyAgentSplit" TO "listingAgentSplit";
ALTER TABLE "deals" RENAME COLUMN "clientAgentSplit" TO "buyerAgentSplit";

-- Stash the legacy `dealType` column (DealType enum: SELLER/BUYER/DUAL) under
-- a transitional name so we can add a new `dealType` column with the v2.0
-- type (DealTransactionType: SALE/RENT). The original index
-- `Deal_dealType_idx` travels with the column and will be dropped below when
-- we drop the transitional column.
ALTER TABLE "deals" RENAME COLUMN "dealType" TO "_legacy_dealType";

-- ── RenameIndex (deals) ─────────────────────────────────────────────────────
ALTER INDEX "Deal_organizationId_idx" RENAME TO "deals_organizationId_idx";
ALTER INDEX "Deal_propertyId_idx" RENAME TO "deals_propertyId_idx";
ALTER INDEX "Deal_clientId_idx" RENAME TO "deals_clientId_idx";
ALTER INDEX "Deal_propertyAgentId_idx" RENAME TO "deals_listingAgentId_idx";
ALTER INDEX "Deal_clientAgentId_idx" RENAME TO "deals_buyerAgentId_idx";
ALTER INDEX "Deal_proposedById_idx" RENAME TO "deals_proposedById_idx";
ALTER INDEX "Deal_status_idx" RENAME TO "deals_status_idx";
ALTER INDEX "Deal_leadSource_idx" RENAME TO "deals_leadSource_idx";
ALTER INDEX "Deal_marketingSpendId_idx" RENAME TO "deals_marketingSpendId_idx";
ALTER INDEX "Deal_createdAt_idx" RENAME TO "deals_createdAt_idx";
ALTER INDEX "Deal_closedAt_idx" RENAME TO "deals_closedAt_idx";
ALTER INDEX "Deal_organizationId_createdAt_idx" RENAME TO "deals_organizationId_createdAt_idx";
ALTER INDEX "Deal_friendlyId_organizationId_key" RENAME TO "deals_friendlyId_organizationId_key";

-- ── RenameIndex (property_showings) ─────────────────────────────────────────
ALTER INDEX "PropertyShowing_organizationId_idx" RENAME TO "property_showings_organizationId_idx";
ALTER INDEX "PropertyShowing_propertyId_idx" RENAME TO "property_showings_propertyId_idx";
ALTER INDEX "PropertyShowing_clientId_idx" RENAME TO "property_showings_clientId_idx";
ALTER INDEX "PropertyShowing_agentId_idx" RENAME TO "property_showings_agentId_idx";
ALTER INDEX "PropertyShowing_showingDate_idx" RENAME TO "property_showings_showingDate_idx";
ALTER INDEX "PropertyShowing_result_idx" RENAME TO "property_showings_result_idx";

-- ── AlterTable: add new columns to deals (all nullable or defaulted) ────────
ALTER TABLE "deals"
  ADD COLUMN "requestId" TEXT,
  ADD COLUMN "notaryContactId" TEXT,
  ADD COLUMN "stage" "DealStage" NOT NULL DEFAULT 'INTEREST',
  ADD COLUMN "dealType" "DealTransactionType",
  ADD COLUMN "agentRole" "AgentRole",
  ADD COLUMN "agreedPrice" DECIMAL(65,30),
  ADD COLUMN "commissionRate" DECIMAL(65,30),
  ADD COLUMN "commissionSplit" JSONB,
  ADD COLUMN "depositAmount" DECIMAL(65,30),
  ADD COLUMN "depositDate" TIMESTAMP(3),
  ADD COLUMN "monthlyRentAmount" DECIMAL(65,30),
  ADD COLUMN "securityDeposit" DECIMAL(65,30),
  ADD COLUMN "leaseStartDate" TIMESTAMP(3),
  ADD COLUMN "leaseEndDate" TIMESTAMP(3),
  ADD COLUMN "leaseDurationMonths" INTEGER,
  ADD COLUMN "fallenThroughReason" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- ── AlterTable: add new columns to property_showings ───────────────────────
ALTER TABLE "property_showings"
  ADD COLUMN "primaryContactId" TEXT,
  ADD COLUMN "requestId" TEXT,
  ADD COLUMN "calendarEventId" TEXT,
  ADD COLUMN "dealId" TEXT,
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "conductedAt" TIMESTAMP(3),
  ADD COLUMN "showingStatus" "ShowingStatus" NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN "interestLevel" "InterestLevel",
  ADD COLUMN "feedback" TEXT,
  ADD COLUMN "followUpAction" TEXT;

-- ── Backfill new dealType + agentRole from the legacy dealType column ──────
-- Legacy DealType enum values: SELLER, BUYER, DUAL
-- All legacy deals are SALE — no rental data existed in the legacy schema.
UPDATE "deals" SET
  "dealType" = CASE "_legacy_dealType"::text
    WHEN 'SELLER' THEN 'SALE'::"DealTransactionType"
    WHEN 'BUYER'  THEN 'SALE'::"DealTransactionType"
    WHEN 'DUAL'   THEN 'SALE'::"DealTransactionType"
    ELSE NULL
  END,
  "agentRole" = CASE "_legacy_dealType"::text
    WHEN 'SELLER' THEN 'LISTING_SIDE'::"AgentRole"
    WHEN 'BUYER'  THEN 'BUYER_SIDE'::"AgentRole"
    WHEN 'DUAL'   THEN 'DUAL_AGENCY'::"AgentRole"
    ELSE NULL
  END
WHERE "_legacy_dealType" IS NOT NULL;

-- Drop the transitional column. This also drops the old `Deal_dealType_idx`
-- (which was attached to the renamed-but-still-underlying column).
ALTER TABLE "deals" DROP COLUMN "_legacy_dealType";

-- ── CreateTable: deal_parties ───────────────────────────────────────────────
CREATE TABLE "deal_parties" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" "DealPartyRole" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable: deal_stage_logs
CREATE TABLE "deal_stage_logs" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fromStage" "DealStage" NOT NULL,
    "toStage" "DealStage" NOT NULL,
    "changedBy" TEXT,
    "notes" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_stage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: showing_attendees
CREATE TABLE "showing_attendees" (
    "id" TEXT NOT NULL,
    "showingId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showing_attendees_pkey" PRIMARY KEY ("id")
);

-- ── CreateIndex (deals — new indexes not covered by RenameIndex above) ─────
CREATE INDEX "deals_requestId_idx" ON "deals"("requestId");
CREATE INDEX "deals_notaryContactId_idx" ON "deals"("notaryContactId");
CREATE INDEX "deals_stage_idx" ON "deals"("stage");
CREATE INDEX "deals_dealType_idx" ON "deals"("dealType");
CREATE INDEX "deals_deletedAt_idx" ON "deals"("deletedAt");
CREATE INDEX "deals_organizationId_stage_idx" ON "deals"("organizationId", "stage");

-- ── CreateIndex (property_showings — new indexes not covered above) ────────
CREATE INDEX "property_showings_primaryContactId_idx" ON "property_showings"("primaryContactId");
CREATE INDEX "property_showings_requestId_idx" ON "property_showings"("requestId");
CREATE INDEX "property_showings_calendarEventId_idx" ON "property_showings"("calendarEventId");
CREATE INDEX "property_showings_dealId_idx" ON "property_showings"("dealId");
CREATE INDEX "property_showings_scheduledAt_idx" ON "property_showings"("scheduledAt");
CREATE INDEX "property_showings_showingStatus_idx" ON "property_showings"("showingStatus");
CREATE INDEX "property_showings_organizationId_showingStatus_idx" ON "property_showings"("organizationId", "showingStatus");

-- ── CreateIndex (new join tables) ──────────────────────────────────────────
CREATE INDEX "deal_parties_organizationId_idx" ON "deal_parties"("organizationId");
CREATE INDEX "deal_parties_dealId_idx" ON "deal_parties"("dealId");
CREATE INDEX "deal_parties_contactId_idx" ON "deal_parties"("contactId");
CREATE INDEX "deal_parties_role_idx" ON "deal_parties"("role");
CREATE UNIQUE INDEX "deal_parties_dealId_contactId_role_key" ON "deal_parties"("dealId", "contactId", "role");

CREATE INDEX "deal_stage_logs_dealId_idx" ON "deal_stage_logs"("dealId");
CREATE INDEX "deal_stage_logs_changedAt_idx" ON "deal_stage_logs"("changedAt");

CREATE INDEX "showing_attendees_showingId_idx" ON "showing_attendees"("showingId");
CREATE INDEX "showing_attendees_contactId_idx" ON "showing_attendees"("contactId");
CREATE UNIQUE INDEX "showing_attendees_showingId_contactId_key" ON "showing_attendees"("showingId", "contactId");

-- ── AddForeignKey (deals) — all the FKs we dropped above, renamed to v2.0 ─
ALTER TABLE "deals" ADD CONSTRAINT "deals_listingAgentId_fkey" FOREIGN KEY ("listingAgentId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_buyerAgentId_fkey" FOREIGN KEY ("buyerAgentId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_notaryContactId_fkey" FOREIGN KEY ("notaryContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_marketingSpendId_fkey" FOREIGN KEY ("marketingSpendId") REFERENCES "MarketingSpend"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: re-add AgentHours → deals (same as the DropForeignKey above)
ALTER TABLE "AgentHours" ADD CONSTRAINT "AgentHours_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── AddForeignKey (property_showings) ──────────────────────────────────────
ALTER TABLE "property_showings" ADD CONSTRAINT "property_showings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_showings" ADD CONSTRAINT "property_showings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_showings" ADD CONSTRAINT "property_showings_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_showings" ADD CONSTRAINT "property_showings_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_showings" ADD CONSTRAINT "property_showings_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_showings" ADD CONSTRAINT "property_showings_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── AddForeignKey (new join tables) ────────────────────────────────────────
ALTER TABLE "deal_parties" ADD CONSTRAINT "deal_parties_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_parties" ADD CONSTRAINT "deal_parties_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_stage_logs" ADD CONSTRAINT "deal_stage_logs_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showing_attendees" ADD CONSTRAINT "showing_attendees_showingId_fkey" FOREIGN KEY ("showingId") REFERENCES "property_showings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showing_attendees" ADD CONSTRAINT "showing_attendees_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
