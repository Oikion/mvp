-- CreateEnum
CREATE TYPE "DataOwnershipMode" AS ENUM ('AGENCY', 'AGENT');

-- AlterTable: OrganizationSettings — add data ownership fields
ALTER TABLE "OrganizationSettings" ADD COLUMN "dataOwnershipMode" "DataOwnershipMode" NOT NULL DEFAULT 'AGENCY';
ALTER TABLE "OrganizationSettings" ADD COLUMN "dataOwnershipSetAt" TIMESTAMP(3);
ALTER TABLE "OrganizationSettings" ADD COLUMN "dataOwnershipChangedAt" TIMESTAMP(3);
ALTER TABLE "OrganizationSettings" ADD COLUMN "dataOwnershipChangedBy" TEXT;
ALTER TABLE "OrganizationSettings" ADD COLUMN "policyVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "OrganizationSettings" ADD COLUMN "policyHistory" JSONB;

-- AlterTable: Deal — add cancellation reason
ALTER TABLE "Deal" ADD COLUMN "cancellationReason" TEXT;

-- CreateTable: OrgMemberConsent
CREATE TABLE "OrgMemberConsent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentedMode" "DataOwnershipMode" NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "policyVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "OrgMemberConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DepartureLog
CREATE TABLE "DepartureLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "reason" "DepartureReason" NOT NULL,
    "policyApplied" "DataOwnershipMode" NOT NULL,
    "migratedEntities" JSONB NOT NULL,
    "cancelledDeals" JSONB NOT NULL,
    "entityCounts" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartureLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgMemberConsent_organizationId_userId_policyVersion_key" ON "OrgMemberConsent"("organizationId", "userId", "policyVersion");
CREATE INDEX "OrgMemberConsent_organizationId_userId_idx" ON "OrgMemberConsent"("organizationId", "userId");
CREATE INDEX "DepartureLog_organizationId_createdAt_idx" ON "DepartureLog"("organizationId", "createdAt");
CREATE INDEX "DepartureLog_userId_idx" ON "DepartureLog"("userId");
