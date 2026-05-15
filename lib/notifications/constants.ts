import type { NotificationCategory } from "./types";

// P0 categories will trigger a toast popup when received via Ably push.
// TODO: consumed in useAblyNotifications once toast-on-notification is implemented
export const P0_CATEGORIES: NotificationCategory[] = [
  "DEAL_STAGE_CHANGED",
  "SHOWING_SCHEDULED",
  "SHOWING_CANCELLED",
  "REQUEST_ASSIGNED",
  "CALENDAR_EVENT_INVITED",
];
