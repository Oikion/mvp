-- AlterTable (uses PENDING_VERIFICATION enum value added in previous migration)
ALTER TABLE "DataDeletionRequest" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "verificationCode" TEXT,
ADD COLUMN IF NOT EXISTS "verificationCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDING_VERIFICATION',
ALTER COLUMN "gracePeriodEndsAt" DROP NOT NULL;
