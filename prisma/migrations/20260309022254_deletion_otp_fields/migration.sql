-- AlterEnum (must be committed before use - PostgreSQL limitation)
ALTER TYPE "DataDeletionStatus" ADD VALUE IF NOT EXISTS 'PENDING_VERIFICATION';

-- Break out of implicit transaction so the new enum value is visible
COMMIT;
BEGIN;

-- AlterTable
ALTER TABLE "DataDeletionRequest" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "verificationCode" TEXT,
ADD COLUMN IF NOT EXISTS "verificationCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDING_VERIFICATION',
ALTER COLUMN "gracePeriodEndsAt" DROP NOT NULL;
