import type { NotificationCategory } from "./types";

// Categories that trigger a toast popup when received via Ably push
export const P0_CATEGORIES: NotificationCategory[] = [
  "DEAL_STAGE_CHANGED",
  "SHOWING_SCHEDULED",
  "SHOWING_CANCELLED",
  "REQUEST_ASSIGNED",
  "CALENDAR_EVENT_INVITED",
];
