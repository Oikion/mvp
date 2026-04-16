/*
  Warnings:

  - You are about to drop the `CrossOrgMatch` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CrossOrgScope" AS ENUM ('BILATERAL', 'POLIS');

-- CreateEnum
CREATE TYPE "CalibrationStatus" AS ENUM ('PENDING', 'APPLIED', 'DISMISSED');

-- AlterTable
ALTER TABLE "Properties" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "property_request_matches" ADD COLUMN     "scoreBreakdown" JSONB;

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "lastMatchRunAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "CrossOrgMatch";

-- CreateTable
CREATE TABLE "cross_org_matches" (
    "id" TEXT NOT NULL,
    "requestOrgId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "propertyOrgId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "scope" "CrossOrgScope" NOT NULL DEFAULT 'BILATERAL',
    "matchScore" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cross_org_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_match_weights" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "org_match_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_calibration_reports" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "CalibrationStatus" NOT NULL DEFAULT 'PENDING',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "proposedWeights" JSONB NOT NULL,
    "currentWeights" JSONB NOT NULL,
    "signalSummary" JSONB,
    "reviewedBy" TEXT,

    CONSTRAINT "weight_calibration_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cross_org_matches_requestOrgId_idx" ON "cross_org_matches"("requestOrgId");

-- CreateIndex
CREATE INDEX "cross_org_matches_propertyOrgId_idx" ON "cross_org_matches"("propertyOrgId");

-- CreateIndex
CREATE INDEX "cross_org_matches_expiresAt_idx" ON "cross_org_matches"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "cross_org_matches_requestId_propertyId_scope_key" ON "cross_org_matches"("requestId", "propertyId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "org_match_weights_organizationId_key" ON "org_match_weights"("organizationId");

-- CreateIndex
CREATE INDEX "weight_calibration_reports_organizationId_idx" ON "weight_calibration_reports"("organizationId");

-- CreateIndex
CREATE INDEX "weight_calibration_reports_status_idx" ON "weight_calibration_reports"("status");

-- CreateIndex
CREATE INDEX "weight_calibration_reports_computedAt_idx" ON "weight_calibration_reports"("computedAt");

-- AddForeignKey
ALTER TABLE "cross_org_matches" ADD CONSTRAINT "cross_org_matches_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cross_org_matches" ADD CONSTRAINT "cross_org_matches_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
