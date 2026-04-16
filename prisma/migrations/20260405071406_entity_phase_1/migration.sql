-- CreateEnum
CREATE TYPE "ContactCategory" AS ENUM ('OWNER', 'BUYER', 'TENANT', 'SELLER', 'INVESTOR', 'BROKER', 'COLLEAGUE', 'NOTARY', 'LAWYER', 'ACCOUNTANT', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('LEAD', 'CONTACTED', 'QUALIFIED', 'ACTIVE', 'UNDER_CONTRACT', 'COMPLETED', 'ON_HOLD', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ContactSource" AS ENUM ('PORTAL_LEAD', 'REFERRAL', 'WALK_IN', 'COLD_CALL', 'SOCIAL_MEDIA', 'WEB', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactRelationshipType" AS ENUM ('SPOUSE', 'CO_BUYER', 'CO_OWNER', 'EMPLOYER', 'PARENT', 'CHILD', 'COLLEAGUE', 'LEGAL_REPRESENTATIVE', 'OTHER');

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_clientId_fkey";

-- AlterTable
ALTER TABLE "Deal" ALTER COLUMN "clientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "contactPipelineConfig" JSONB;

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "friendlyId" TEXT,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT NOT NULL,
    "isCompany" BOOLEAN NOT NULL DEFAULT false,
    "companyName" TEXT,
    "category" "ContactCategory"[],
    "status" "ContactStatus" NOT NULL DEFAULT 'LEAD',
    "source" "ContactSource",
    "visibility" "ItemVisibility" NOT NULL DEFAULT 'PRIVATE',
    "email" TEXT,
    "secondaryEmail" TEXT,
    "primaryPhone" TEXT,
    "secondaryPhone" TEXT,
    "officePhone" TEXT,
    "whatsapp" TEXT,
    "viber" TEXT,
    "taxId" TEXT,
    "doy" TEXT,
    "vatNumber" TEXT,
    "companyGemi" TEXT,
    "companyId" TEXT,
    "idDocument" TEXT,
    "addresses" JSONB,
    "assignedAgentId" TEXT,
    "languagePreference" "Language",
    "tags" TEXT[],
    "leadScore" INTEGER,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "gdprConsentGiven" BOOLEAN NOT NULL DEFAULT false,
    "gdprConsentDate" TIMESTAMP(3),
    "allowMarketing" BOOLEAN NOT NULL DEFAULT false,
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "referredById" TEXT,
    "notes" TEXT,
    "communicationNotes" JSONB,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "legacyClientId" TEXT,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_comments" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "userId" TEXT,
    "content" TEXT NOT NULL,
    "entitySessionId" TEXT,
    "messageIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_relationships" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactIdA" TEXT NOT NULL,
    "contactIdB" TEXT NOT NULL,
    "relationshipType" "ContactRelationshipType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_organizationId_idx" ON "contacts"("organizationId");

-- CreateIndex
CREATE INDEX "contacts_assignedAgentId_idx" ON "contacts"("assignedAgentId");

-- CreateIndex
CREATE INDEX "contacts_status_idx" ON "contacts"("status");

-- CreateIndex
CREATE INDEX "contacts_createdAt_idx" ON "contacts"("createdAt");

-- CreateIndex
CREATE INDEX "contacts_visibility_idx" ON "contacts"("visibility");

-- CreateIndex
CREATE INDEX "contacts_legacyClientId_idx" ON "contacts"("legacyClientId");

-- CreateIndex
CREATE INDEX "contacts_organizationId_status_idx" ON "contacts"("organizationId", "status");

-- CreateIndex
CREATE INDEX "contacts_organizationId_createdAt_idx" ON "contacts"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_friendlyId_organizationId_key" ON "contacts"("friendlyId", "organizationId");

-- CreateIndex
CREATE INDEX "contact_comments_contactId_idx" ON "contact_comments"("contactId");

-- CreateIndex
CREATE INDEX "contact_comments_userId_idx" ON "contact_comments"("userId");

-- CreateIndex
CREATE INDEX "contact_relationships_organizationId_idx" ON "contact_relationships"("organizationId");

-- CreateIndex
CREATE INDEX "contact_relationships_contactIdA_idx" ON "contact_relationships"("contactIdA");

-- CreateIndex
CREATE INDEX "contact_relationships_contactIdB_idx" ON "contact_relationships"("contactIdB");

-- CreateIndex
CREATE UNIQUE INDEX "contact_relationships_organizationId_contactIdA_contactIdB__key" ON "contact_relationships"("organizationId", "contactIdA", "contactIdB", "relationshipType");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_comments" ADD CONSTRAINT "contact_comments_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_comments" ADD CONSTRAINT "contact_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_relationships" ADD CONSTRAINT "contact_relationships_contactIdA_fkey" FOREIGN KEY ("contactIdA") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_relationships" ADD CONSTRAINT "contact_relationships_contactIdB_fkey" FOREIGN KEY ("contactIdB") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
