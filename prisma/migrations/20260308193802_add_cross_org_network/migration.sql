-- CreateEnum
CREATE TYPE "OrgNetworkMembership" AS ENUM ('NONE', 'POOL', 'BILATERAL', 'BOTH');

-- CreateEnum
CREATE TYPE "NetworkPrivacyLevel" AS ENUM ('ANONYMIZED', 'AGENCY_IDENTIFIED', 'FULL');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED');

-- AlterTable
ALTER TABLE "Mandate" ADD COLUMN     "networkVisible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Properties" ADD COLUMN     "networkVisible" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "OrgNetworkSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "membership" "OrgNetworkMembership" NOT NULL DEFAULT 'NONE',
    "shareProperties" BOOLEAN NOT NULL DEFAULT false,
    "shareMandates" BOOLEAN NOT NULL DEFAULT false,
    "propertyPrivacyLevel" "NetworkPrivacyLevel" NOT NULL DEFAULT 'ANONYMIZED',
    "mandatePrivacyLevel" "NetworkPrivacyLevel" NOT NULL DEFAULT 'ANONYMIZED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgNetworkSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgNetworkPartner" (
    "id" TEXT NOT NULL,
    "initiatorOrgId" TEXT NOT NULL,
    "partnerOrgId" TEXT NOT NULL,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "OrgNetworkPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossOrgMatch" (
    "id" TEXT NOT NULL,
    "mandateOrgId" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "propertyOrgId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrossOrgMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgNetworkSettings_organizationId_key" ON "OrgNetworkSettings"("organizationId");

-- CreateIndex
CREATE INDEX "OrgNetworkSettings_membership_idx" ON "OrgNetworkSettings"("membership");

-- CreateIndex
CREATE INDEX "OrgNetworkPartner_initiatorOrgId_idx" ON "OrgNetworkPartner"("initiatorOrgId");

-- CreateIndex
CREATE INDEX "OrgNetworkPartner_partnerOrgId_idx" ON "OrgNetworkPartner"("partnerOrgId");

-- CreateIndex
CREATE INDEX "OrgNetworkPartner_status_idx" ON "OrgNetworkPartner"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrgNetworkPartner_initiatorOrgId_partnerOrgId_key" ON "OrgNetworkPartner"("initiatorOrgId", "partnerOrgId");

-- CreateIndex
CREATE INDEX "CrossOrgMatch_mandateOrgId_idx" ON "CrossOrgMatch"("mandateOrgId");

-- CreateIndex
CREATE INDEX "CrossOrgMatch_propertyOrgId_idx" ON "CrossOrgMatch"("propertyOrgId");

-- CreateIndex
CREATE INDEX "CrossOrgMatch_expiresAt_idx" ON "CrossOrgMatch"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CrossOrgMatch_mandateId_propertyId_key" ON "CrossOrgMatch"("mandateId", "propertyId");

-- CreateIndex
CREATE INDEX "Mandate_networkVisible_idx" ON "Mandate"("networkVisible");

-- CreateIndex
CREATE INDEX "Properties_networkVisible_idx" ON "Properties"("networkVisible");
