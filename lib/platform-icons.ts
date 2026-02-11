/**
 * Platform logos and brand colors for external messaging (Viber, WhatsApp, Messenger).
 * Logos are loaded from SimpleIcons CDN for consistent, official brand assets.
 */

import type { MessagingPlatform } from "@/types/messaging";

/** CDN URLs for official platform logos (SVG) */
export const PLATFORM_ICONS: Record<MessagingPlatform, string> = {
  VIBER: "https://cdn.simpleicons.org/viber",
  WHATSAPP: "https://cdn.simpleicons.org/whatsapp",
  MESSENGER: "https://cdn.simpleicons.org/messenger",
} as const;

/** Brand colors for accents and backgrounds (e.g. 20% opacity badges) */
export const PLATFORM_COLORS: Record<MessagingPlatform, string> = {
  VIBER: "#7360F2",
  WHATSAPP: "#25D366",
  MESSENGER: "#0099FF",
} as const;
