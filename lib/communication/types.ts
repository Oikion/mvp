// EmailBlock union type — each block maps to a React Email component
export type BadgeColor = "purple" | "blue" | "green" | "emerald" | "amber" | "orange" | "red" | "pink" | "indigo" | "cyan";

export type EmailBlock =
  | { id: string; type: "header";  props: { title: string; subtitle?: string } }
  | { id: string; type: "text";    props: { content: string } }
  | { id: string; type: "button";  props: { text: string; href: string; altLinkText?: string } }
  | { id: string; type: "card";    props: { title?: string; items: string[] } }
  | { id: string; type: "divider"; props: Record<string, never> }
  | { id: string; type: "badge";   props: { icon?: string; text: string; color: BadgeColor } }
  | { id: string; type: "image";   props: { src: string; alt: string; width?: number } }

// Each block has an `id` for stable React keys during DnD reordering.

// Audience type (from Resend API)
export interface CommunicationAudience {
  id: string;
  name: string;
  createdAt: string;
}

// Contact type (from Resend API)
export interface CommunicationContact {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  unsubscribed: boolean;
  createdAt: string;
}

/**
 * Mask an email for display: j***@example.com
 * - Takes the first character of the local part, replaces the rest with ***
 * - Domain is shown in full
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return "***";
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  return `${local[0]}***${domain}`;
}

/**
 * Generate a stable ID for a new block.
 */
export function generateBlockId(): string {
  return Math.random().toString(36).slice(2, 10);
}
