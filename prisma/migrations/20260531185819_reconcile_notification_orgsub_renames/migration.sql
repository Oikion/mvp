-- Reconciliation migration (baseline): realigns migration history with the live schema.
--
-- The `@@map` renames for NotificationDeliveryLog -> notification_delivery_logs and
-- OrgSubscription index, plus the Users.referralBoxDismissed default, were applied to
-- existing databases without a corresponding migration. This caused `prisma migrate dev`
-- to detect false "drift" when replaying migrations on a shadow DB.
--
-- On existing databases (staging/prod) this migration is marked applied via
-- `prisma migrate resolve --applied` and does NOT run (the objects already have these
-- names/defaults). On a fresh database it runs after the table-creating migrations and
-- renames the objects to match schema.prisma.

-- AlterTable
ALTER TABLE "Users" ALTER COLUMN "referralBoxDismissed" SET DEFAULT true;

-- AlterTable
ALTER TABLE "notification_delivery_logs" RENAME CONSTRAINT "NotificationDeliveryLog_pkey" TO "notification_delivery_logs_pkey";

-- RenameForeignKey
ALTER TABLE "notification_delivery_logs" RENAME CONSTRAINT "NotificationDeliveryLog_notificationId_fkey" TO "notification_delivery_logs_notificationId_fkey";

-- RenameIndex
ALTER INDEX "NotificationDeliveryLog_channel_status_idx" RENAME TO "notification_delivery_logs_channel_status_idx";

-- RenameIndex
ALTER INDEX "NotificationDeliveryLog_notificationId_idx" RENAME TO "notification_delivery_logs_notificationId_idx";

-- RenameIndex
ALTER INDEX "NotificationDeliveryLog_recipient_channel_createdAt_idx" RENAME TO "notification_delivery_logs_recipient_channel_createdAt_idx";

-- RenameIndex
ALTER INDEX "OrgSubscription_organizationId_idx" RENAME TO "org_subscriptions_organizationId_idx";
