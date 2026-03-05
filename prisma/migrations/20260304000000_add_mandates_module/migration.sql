-- CreateEnum
CREATE TYPE "MandateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'FULFILLED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MandateUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "Mandate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "assigned_to" TEXT,
    "title" TEXT NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "property_type" "PropertyType",
    "property_purpose" "PropertyPurpose",
    "areas_of_interest" JSONB,
    "municipality" TEXT,
    "region" TEXT,
    "size_min_sqm" DECIMAL(65,30),
    "size_max_sqm" DECIMAL(65,30),
    "plot_size_min_sqm" DECIMAL(65,30),
    "plot_size_max_sqm" DECIMAL(65,30),
    "budget_min" DECIMAL(65,30),
    "budget_max" DECIMAL(65,30),
    "bedrooms_min" INTEGER,
    "bedrooms_max" INTEGER,
    "bathrooms_min" INTEGER,
    "bathrooms_max" INTEGER,
    "floor_min" INTEGER,
    "floor_max" INTEGER,
    "ground_floor_only" BOOLEAN DEFAULT false,
    "condition" "PropertyCondition"[],
    "year_built_min" INTEGER,
    "year_built_max" INTEGER,
    "heating_type" "HeatingType"[],
    "energy_cert_min" "EnergyCertClass",
    "furnished" "FurnishedStatus",
    "elevator" BOOLEAN,
    "parking" BOOLEAN,
    "pets_allowed" BOOLEAN,
    "amenities" JSONB,
    "inside_city_plan" BOOLEAN,
    "legalization_ok" BOOLEAN DEFAULT false,
    "status" "MandateStatus" NOT NULL DEFAULT 'DRAFT',
    "urgency" "MandateUrgency" DEFAULT 'MEDIUM',
    "timeline" "Timeline",
    "expires_at" TIMESTAMP(3),
    "notes" TEXT,
    "communication_notes" JSONB,
    "clientId" TEXT,
    "client_linked_at" TIMESTAMP(3),
    "draft_status" BOOLEAN DEFAULT false,

    CONSTRAINT "Mandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandateComment" (
    "id" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MandateComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mandate_organizationId_idx" ON "Mandate"("organizationId");

-- CreateIndex
CREATE INDEX "Mandate_clientId_idx" ON "Mandate"("clientId");

-- CreateIndex
CREATE INDEX "Mandate_assigned_to_idx" ON "Mandate"("assigned_to");

-- CreateIndex
CREATE INDEX "Mandate_status_idx" ON "Mandate"("status");

-- CreateIndex
CREATE INDEX "Mandate_createdAt_idx" ON "Mandate"("createdAt");

-- CreateIndex
CREATE INDEX "MandateComment_mandateId_idx" ON "MandateComment"("mandateId");

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateComment" ADD CONSTRAINT "MandateComment_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateComment" ADD CONSTRAINT "MandateComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
