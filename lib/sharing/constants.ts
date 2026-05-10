/**
 * Cross-org notifications are stored under this sentinel org ID so they survive
 * across organization context switches for the recipient. This is NOT a real
 * organization — it is a routing sentinel only. Notification queries include
 * this ID alongside the user's current org to surface system-level notifications.
 */
export const SYSTEM_ORG_ID = "00000000-0000-0000-0000-000000000000" as const;
