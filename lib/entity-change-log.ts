import "server-only";

/**
 * lib/entity-change-log.ts
 * Server-side only — never import from client components.
 *
 * Provides:
 *   diffEntity          — computes field-level diff between two entity snapshots
 *   createChangeLogEntry — persists a non-fatal EntityChangeLog record
 */
import { prismadb } from "@/lib/prisma";
import type { EntityChangeLogType } from "@prisma/client";

// ─── Watched fields per entity ────────────────────────────────────────────────

export const CONTACT_WATCHED_FIELDS = [
  "status",
  "assignedToUserId",
  "visibility",
  "category",
  "source",
  "doNotContact",
  "allowMarketing",
  "gdprConsentGiven",
] as const;

export const PROPERTY_WATCHED_FIELDS = [
  "property_status",
  "assignedToUserId",
  "visibility",
  "price",
  "property_type",
] as const;

export const REQUEST_WATCHED_FIELDS = [
  "status",
  "urgency",
  "assigned_to",
  "budget_min",
  "budget_max",
  "transaction_type",
] as const;

// ─── diffEntity ───────────────────────────────────────────────────────────────

type ChangedField = { field: string; from: unknown; to: unknown };

/**
 * Computes a field-level diff between two entity snapshots.
 * Only watchedFields are compared; all other keys are ignored.
 * Encrypted fields are masked with "[encrypted]" if the raw value differs.
 * null and undefined are treated as equivalent.
 */
export function diffEntity(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  watchedFields: readonly string[],
  encryptedFields: readonly string[]
): ChangedField[] {
  const changes: ChangedField[] = [];

  for (const field of watchedFields) {
    const rawBefore = before[field] ?? null;
    const rawAfter  = after[field]  ?? null;

    if (rawBefore === rawAfter) continue;

    if (encryptedFields.includes(field)) {
      changes.push({ field, from: "[encrypted]", to: "[encrypted]" });
    } else {
      changes.push({ field, from: rawBefore, to: rawAfter });
    }
  }

  return changes;
}

// ─── createChangeLogEntry ─────────────────────────────────────────────────────

interface ChangeLogInput {
  organizationId: string;
  entityType: EntityChangeLogType;
  entityId: string;
  /** DELETED and ARCHIVED exist in the DB enum but are reserved for future tasks — callers may only use these four values via this helper. */
  eventType: "CREATED" | "UPDATED" | "LINKED" | "UNLINKED";
  actorUserId?: string;
  changedFields?: ChangedField[];
  linkTarget?: { type: string; id: string; friendlyId?: string; label?: string };
}

/**
 * Persists a single EntityChangeLog record.
 * Non-fatal: errors are logged and swallowed — never call from inside a try/catch
 * that should abort on failure.
 */
export async function createChangeLogEntry(input: ChangeLogInput): Promise<void> {
  try {
    await prismadb.entityChangeLog.create({
      data: {
        organizationId: input.organizationId,
        entityType:     input.entityType,
        entityId:       input.entityId,
        eventType:      input.eventType,
        actorUserId:    input.actorUserId ?? undefined,
        changedFields:  (input.changedFields ?? undefined) as unknown as import("@prisma/client").Prisma.InputJsonValue | undefined,
        linkTarget:     (input.linkTarget    ?? undefined) as unknown as import("@prisma/client").Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error("[ENTITY_CHANGE_LOG]", error);
  }
}
