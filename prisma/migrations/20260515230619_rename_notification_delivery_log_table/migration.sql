-- Rename NotificationDeliveryLog table to snake_case per schema convention
-- IF EXISTS makes this idempotent: shadow DB creates it with the mapped name already
ALTER TABLE IF EXISTS "NotificationDeliveryLog" RENAME TO "notification_delivery_logs";
