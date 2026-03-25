-- CreateEnum
CREATE TYPE "ImportEntityType" AS ENUM ('CLIENTS', 'PROPERTIES', 'MANDATES', 'UNIFIED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('COMPLETED', 'PARTIALLY_FAILED', 'FAILED', 'BATCH_DELETED');

-- AlterEnum
ALTER TYPE "BackgroundJobType" ADD VALUE 'BULK_IMPORT';

-- CreateTable
CREATE TABLE "ImportHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "importType" "ImportEntityType" NOT NULL,
    "sourceFilename" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "reusedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" JSONB,
    "resultDetails" JSONB,
    "entityIds" TEXT[],
    "status" "ImportStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportHistory_organizationId_idx" ON "ImportHistory"("organizationId");

-- CreateIndex
CREATE INDEX "ImportHistory_userId_idx" ON "ImportHistory"("userId");

-- CreateIndex
CREATE INDEX "ImportHistory_createdAt_idx" ON "ImportHistory"("createdAt");
