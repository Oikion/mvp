-- CreateEnum
CREATE TYPE "ImportPhase" AS ENUM ('VALIDATING', 'IMPORTING', 'COMPLETE', 'ABANDONED');

-- AlterEnum
ALTER TYPE "ImportStatus" ADD VALUE 'PARTIALLY_DELETED';

-- AlterTable
ALTER TABLE "ImportHistory" ADD COLUMN     "fileHash" TEXT,
ADD COLUMN     "importPhase" "ImportPhase" NOT NULL DEFAULT 'COMPLETE';

-- CreateIndex
CREATE INDEX "ImportHistory_organizationId_fileHash_idx" ON "ImportHistory"("organizationId", "fileHash");
