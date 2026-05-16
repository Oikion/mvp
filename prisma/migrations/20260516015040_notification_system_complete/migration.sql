-- _prisma_migration_ignore_transaction
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL.
-- Prisma's transaction wrapper is disabled for this migration file.

-- Add new NotificationCategory enum values
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'REQUEST_CREATED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'REQUEST_ASSIGNED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'REQUEST_STATUS_CHANGED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'SHOWING_SCHEDULED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'SHOWING_CONFIRMED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'SHOWING_CANCELLED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'SHOWING_COMPLETED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'SHOWING_NO_SHOW';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'DEAL_STAGE_CHANGED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'COMMENT_ADDED_PROPERTY';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'COMMENT_ADDED_CONTACT';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'COMMENT_ADDED_REQUEST';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'COMMENT_ADDED_DEAL';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'BULK_ARCHIVE_COMPLETED';

-- Create new enums
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL', 'IN_APP', 'ABLY_PUSH');
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED', 'DELIVERED');
CREATE TYPE "DigestFrequency" AS ENUM ('INSTANT', 'DAILY_DIGEST', 'WEEKLY_DIGEST');

-- Add new columns to UserNotificationSettings
ALTER TABLE "UserNotificationSettings" ADD COLUMN IF NOT EXISTS "unsubscribeToken" TEXT UNIQUE;
ALTER TABLE "UserNotificationSettings" ADD COLUMN IF NOT EXISTS "quietHoursStart" INTEGER;
ALTER TABLE "UserNotificationSettings" ADD COLUMN IF NOT EXISTS "quietHoursEnd" INTEGER;
ALTER TABLE "UserNotificationSettings" ADD COLUMN IF NOT EXISTS "notificationDigest" "DigestFrequency" NOT NULL DEFAULT 'INSTANT';

-- Create notification_delivery_logs table (@@map name from Prisma schema)
CREATE TABLE IF NOT EXISTS "notification_delivery_logs" (
    "id"             TEXT NOT NULL,
    "notificationId" TEXT,
    "channel"        "DeliveryChannel" NOT NULL,
    "recipient"      TEXT NOT NULL,
    "status"         "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts"       INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt"  TIMESTAMP(3),
    "nextRetryAt"    TIMESTAMP(3),
    "externalId"     TEXT,
    "error"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "notification_delivery_logs"
    ADD CONSTRAINT "NotificationDeliveryLog_notificationId_fkey"
    FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS "NotificationDeliveryLog_notificationId_idx" ON "notification_delivery_logs"("notificationId");
CREATE INDEX IF NOT EXISTS "NotificationDeliveryLog_channel_status_idx" ON "notification_delivery_logs"("channel", "status");
CREATE INDEX IF NOT EXISTS "NotificationDeliveryLog_recipient_channel_createdAt_idx" ON "notification_delivery_logs"("recipient", "channel", "createdAt");
