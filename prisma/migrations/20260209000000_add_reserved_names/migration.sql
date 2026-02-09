-- CreateEnum
CREATE TYPE "ReservedNameType" AS ENUM ('USERNAME', 'ORGANIZATION_NAME', 'ORGANIZATION_SLUG');

-- CreateEnum
CREATE TYPE "ReservedNameStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "ReservedName" (
    "id" TEXT NOT NULL,
    "type" "ReservedNameType" NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "status" "ReservedNameStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservedName_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReservedName_type_idx" ON "ReservedName"("type");

-- CreateIndex
CREATE INDEX "ReservedName_status_idx" ON "ReservedName"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReservedName_type_normalizedValue_key" ON "ReservedName"("type", "normalizedValue");
