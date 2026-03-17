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

// ── Campaign serialization ─────────────────────────────────────────────────
// Kept here (not in a "use server" file) because Next.js requires all exports
// from "use server" modules to be async Server Actions.

import { CampaignStatus } from "@prisma/client"

export interface SerializedCampaign {
  id: string
  organizationId: string
  subject: string
  previewText: string | null
  content: string
  fromName: string | null
  fromEmail: string | null
  replyTo: string | null
  status: CampaignStatus
  recipientCount: number
  sentCount: number
  openCount: number
  clickCount: number
  bounceCount: number
  unsubscribeCount: number
  scheduledAt: string | null
  sentAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  createdVia: string | null
  n8nWorkflowId: string | null
  tags: string[]
  resendBatchId: string | null
  blocks: unknown
  audienceId: string | null
}

export function serializeCampaign(c: {
  id: string
  organizationId: string
  subject: string
  previewText: string | null
  content: string
  fromName: string | null
  fromEmail: string | null
  replyTo: string | null
  status: CampaignStatus
  recipientCount: number
  sentCount: number
  openCount: number
  clickCount: number
  bounceCount: number
  unsubscribeCount: number
  scheduledAt: Date | null
  sentAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  createdVia: string | null
  n8nWorkflowId: string | null
  tags: string[]
  resendBatchId: string | null
  blocks: unknown
  audienceId: string | null
}): SerializedCampaign {
  return {
    ...c,
    scheduledAt: c.scheduledAt?.toISOString() ?? null,
    sentAt: c.sentAt?.toISOString() ?? null,
    completedAt: c.completedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}
