-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('BUY', 'RENT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('ACTIVE', 'MATCHED', 'UNDER_OFFER', 'CLOSED', 'PAUSED');

-- CreateEnum
CREATE TYPE "RequestUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ClosureReason" AS ENUM ('MATCHED', 'EXPIRED', 'CANCELLED', 'OTHER');

-- CreateEnum
CREATE TYPE "MatchMethod" AS ENUM ('RULE_BASED', 'AI', 'MANUAL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'PRESENTED', 'INTERESTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "DismissalReason" AS ENUM ('PRICE_TOO_HIGH', 'WRONG_LOCATION', 'WRONG_TYPE', 'CLIENT_DECLINED', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancingStatus" AS ENUM ('CASH', 'MORTGAGE_PREAPPROVED', 'MORTGAGE_PENDING', 'SEEKING_FINANCING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MandateType" AS ENUM ('EXCLUSIVE', 'OPEN', 'NONE');

-- AlterTable
ALTER TABLE "Properties" ADD COLUMN     "askingRent" DECIMAL(65,30),
ADD COLUMN     "commissionRate" DECIMAL(65,30),
ADD COLUMN     "mandateEndDate" TIMESTAMP(3),
ADD COLUMN     "mandateStartDate" TIMESTAMP(3),
ADD COLUMN     "mandateType" "MandateType",
ADD COLUMN     "ownerId" TEXT;

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "friendlyId" TEXT,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "additionalContactIds" TEXT[],
    "assignedAgentId" TEXT,
    "requestType" "RequestType" NOT NULL,
    "propertyCategory" "PropertyPurpose",
    "propertyTypes" "PropertyType"[],
    "status" "RequestStatus" NOT NULL DEFAULT 'ACTIVE',
    "urgency" "RequestUrgency" DEFAULT 'MEDIUM',
    "closureReason" "ClosureReason",
    "budgetMin" DECIMAL(65,30),
    "budgetMax" DECIMAL(65,30),
    "surfaceMin" DECIMAL(65,30),
    "surfaceMax" DECIMAL(65,30),
    "plotSizeMin" DECIMAL(65,30),
    "plotSizeMax" DECIMAL(65,30),
    "bedroomsMin" INTEGER,
    "bedroomsMax" INTEGER,
    "bathroomsMin" INTEGER,
    "bathroomsMax" INTEGER,
    "floorMin" INTEGER,
    "floorMax" INTEGER,
    "groundFloorOnly" BOOLEAN NOT NULL DEFAULT false,
    "constructionYearMin" INTEGER,
    "constructionYearMax" INTEGER,
    "conditionPreference" "PropertyCondition"[],
    "heatingTypes" "HeatingType"[],
    "energyClassMin" "EnergyCertClass",
    "furnished" "FurnishedStatus",
    "requiresElevator" BOOLEAN,
    "requiresParking" BOOLEAN,
    "requiresStorage" BOOLEAN,
    "requiresGarden" BOOLEAN,
    "petFriendly" BOOLEAN,
    "requiresAC" BOOLEAN,
    "insideCityPlan" BOOLEAN,
    "legalizationOk" BOOLEAN,
    "amenities" JSONB,
    "viewTypes" TEXT[],
    "orientationPref" TEXT[],
    "balconyMinSqm" DECIMAL(65,30),
    "locationDisplayName" TEXT,
    "areasOfInterest" JSONB,
    "municipality" TEXT,
    "region" TEXT,
    "centerLatitude" DOUBLE PRECISION,
    "centerLongitude" DOUBLE PRECISION,
    "radiusKm" DOUBLE PRECISION,
    "isInvestmentPurpose" BOOLEAN,
    "expectedYieldPct" DECIMAL(65,30),
    "goldenVisaEligible" BOOLEAN,
    "financingStatus" "FinancingStatus",
    "auctionInterest" BOOLEAN,
    "timeline" "Timeline",
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "communicationNotes" JSONB,
    "visibility" "ItemVisibility" NOT NULL DEFAULT 'PRIVATE',
    "draftStatus" BOOLEAN DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "legacyMandateId" TEXT,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_comments" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT,
    "content" TEXT NOT NULL,
    "entitySessionId" TEXT,
    "messageIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_request_matches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "matchScore" DECIMAL(65,30),
    "matchMethod" "MatchMethod",
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "presentedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "dismissalReason" "DismissalReason",
    "agentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_request_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "requests_organizationId_idx" ON "requests"("organizationId");

-- CreateIndex
CREATE INDEX "requests_contactId_idx" ON "requests"("contactId");

-- CreateIndex
CREATE INDEX "requests_assignedAgentId_idx" ON "requests"("assignedAgentId");

-- CreateIndex
CREATE INDEX "requests_status_idx" ON "requests"("status");

-- CreateIndex
CREATE INDEX "requests_requestType_idx" ON "requests"("requestType");

-- CreateIndex
CREATE INDEX "requests_createdAt_idx" ON "requests"("createdAt");

-- CreateIndex
CREATE INDEX "requests_visibility_idx" ON "requests"("visibility");

-- CreateIndex
CREATE INDEX "requests_legacyMandateId_idx" ON "requests"("legacyMandateId");

-- CreateIndex
CREATE INDEX "requests_organizationId_status_idx" ON "requests"("organizationId", "status");

-- CreateIndex
CREATE INDEX "requests_organizationId_requestType_idx" ON "requests"("organizationId", "requestType");

-- CreateIndex
CREATE UNIQUE INDEX "requests_friendlyId_organizationId_key" ON "requests"("friendlyId", "organizationId");

-- CreateIndex
CREATE INDEX "request_comments_requestId_idx" ON "request_comments"("requestId");

-- CreateIndex
CREATE INDEX "request_comments_userId_idx" ON "request_comments"("userId");

-- CreateIndex
CREATE INDEX "property_request_matches_organizationId_idx" ON "property_request_matches"("organizationId");

-- CreateIndex
CREATE INDEX "property_request_matches_propertyId_idx" ON "property_request_matches"("propertyId");

-- CreateIndex
CREATE INDEX "property_request_matches_requestId_idx" ON "property_request_matches"("requestId");

-- CreateIndex
CREATE INDEX "property_request_matches_status_idx" ON "property_request_matches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "property_request_matches_organizationId_propertyId_requestI_key" ON "property_request_matches"("organizationId", "propertyId", "requestId");

-- CreateIndex
CREATE INDEX "contacts_referredById_idx" ON "contacts"("referredById");

-- AddForeignKey
ALTER TABLE "Properties" ADD CONSTRAINT "Properties_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_comments" ADD CONSTRAINT "request_comments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_comments" ADD CONSTRAINT "request_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_request_matches" ADD CONSTRAINT "property_request_matches_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_request_matches" ADD CONSTRAINT "property_request_matches_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
