/**
 * lib/pii-access-log.ts
 *
 * Append-only audit log for all server-side PII decryption events.
 * Every time the server decrypts PII fields (Layer 1), an entry is created.
 *
 * Design decisions:
 * - Fire-and-forget: logging failures are caught and logged to console,
 *   never thrown — audit logging must not break the main request flow.
 * - No UPDATE or DELETE operations — this module only creates entries.
 * - The PiiAccessLog table has no foreign keys — it stores IDs as strings
 *   for maximum durability (entries survive entity/user deletion).
 */

import { prismadb } from "@/lib/prisma";

export const PiiAction = {
  DECRYPT: "DECRYPT",
  EXPORT: "EXPORT",
  WEBHOOK_SEND: "WEBHOOK_SEND",
  API_RESPONSE: "API_RESPONSE",
} as const;

export type PiiActionType = (typeof PiiAction)[keyof typeof PiiAction];

export interface PiiAccessLogEntry {
  userId: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  action: PiiActionType;
  fields: string[];
  source: string;
  ipAddress?: string;
}

/**
 * Log a PII access event. Fire-and-forget — never throws.
 */
export async function logPiiAccess(entry: PiiAccessLogEntry): Promise<void> {
  try {
    await prismadb.piiAccessLog.create({
      data: {
        userId: entry.userId,
        organizationId: entry.organizationId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        fields: entry.fields,
        source: entry.source,
        ipAddress: entry.ipAddress,
      },
    });
  } catch (error) {
    // Fire-and-forget: log to console but never throw.
    // Audit logging must not break the main request flow.
    console.error("[PiiAccessLog] Failed to write audit entry:", error);
  }
}

/**
 * Log a PII access event with a single automatic retry on transient DB failures.
 * Retries once after 100 ms — swallows errors on both attempts so it never
 * blocks or throws into the main request path.
 */
export async function logPiiAccessWithRetry(entry: PiiAccessLogEntry): Promise<void> {
  try {
    await logPiiAccess(entry);
  } catch {
    setTimeout(() => logPiiAccess(entry).catch(() => {}), 100);
  }
}
