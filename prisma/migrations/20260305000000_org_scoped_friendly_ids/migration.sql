-- AlterTable: Add organizationId column to IdSequence
ALTER TABLE "IdSequence" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT '__global__';

-- Drop old unique index on prefix (Prisma creates @@unique as indexes, not constraints)
DROP INDEX IF EXISTS "IdSequence_prefix_key";
ALTER TABLE "IdSequence" DROP CONSTRAINT IF EXISTS "IdSequence_prefix_key";

-- Update existing id values to include org scope
UPDATE "IdSequence" SET id = prefix || ':__global__';

-- Add compound unique constraint on (prefix, organizationId)
ALTER TABLE "IdSequence" ADD CONSTRAINT "IdSequence_prefix_organizationId_key" UNIQUE ("prefix", "organizationId");

-- Add index on organizationId
CREATE INDEX "IdSequence_organizationId_idx" ON "IdSequence"("organizationId");
