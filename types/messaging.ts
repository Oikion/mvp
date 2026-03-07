/**
 * Client-safe messaging types
 *
 * Prisma enums cannot be used in client components ("use client") because
 * @prisma/client is server-only. This file mirrors the Prisma MessagingPlatform
 * enum for use in browser/client code.
 *
 * IMPORTANT: Keep this in sync with prisma/schema.prisma MessagingPlatform enum
 */

// Client-safe enum mirror (must match Prisma schema exactly)
export const MessagingPlatform = {
  VIBER: "VIBER",
  WHATSAPP: "WHATSAPP",
  MESSENGER: "MESSENGER",
} as const;

export type MessagingPlatform =
  (typeof MessagingPlatform)[keyof typeof MessagingPlatform];

// Platform display information for UI
export const PLATFORM_INFO: Record<
  MessagingPlatform,
  {
    name: string;
    icon: string; // SimpleIcons CDN URL
    color: string; // Brand color
    usersInGreece?: string;
  }
> = {
  VIBER: {
    name: "Viber",
    icon: "https://cdn.simpleicons.org/viber",
    color: "#7360F2",
    usersInGreece: "4.36M",
  },
  WHATSAPP: {
    name: "WhatsApp",
    icon: "https://cdn.simpleicons.org/whatsapp",
    color: "#25D366",
    usersInGreece: "3.5M",
  },
  MESSENGER: {
    name: "Messenger",
    icon: "https://cdn.simpleicons.org/messenger",
    color: "#0099FF",
    usersInGreece: "2.2M",
  },
};
