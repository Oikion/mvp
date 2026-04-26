import "server-only";

import { prismadb } from "@/lib/prisma";
import { publishToChannel } from "@/lib/ably";
import type { ActivityParentType } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FieldChange {
  field: string;
  from: string | null;
  to: string | null;
}

type SystemActivityKind =
  | "CREATED"
  | "UPDATED"
  | "LINKED"
  | "UNLINKED"
  | "STAGE_CHANGED"
  | "CALENDAR_EVENT_ADDED"
  | "CALENDAR_EVENT_REMOVED";

// ── Internal helper ───────────────────────────────────────────────────────────

async function _createAndPublish(data: {
  organizationId: string;
  parentType: ActivityParentType;
  parentId: string;
  kind: SystemActivityKind;
  body: string;
  createdByUserId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const activity = await prismadb.activity.create({
    data: {
      organizationId: data.organizationId,
      parentType: data.parentType,
      parentId: data.parentId,
      kind: data.kind,
      direction: "INTERNAL",
      body: data.body,
      occurredAt: new Date(),
      createdByUserId: data.createdByUserId ?? undefined,
      metadata: data.metadata
        ? (data.metadata as unknown as import("@prisma/client").Prisma.InputJsonValue)
        : undefined,
    },
    select: { id: true },
  });

  // Fire-and-forget — Ably failure must never surface to the caller
  publishToChannel(`org:${data.organizationId}`, "activity:created", {
    parentType: data.parentType,
    parentId: data.parentId,
    activityId: activity.id,
    kind: data.kind,
  }).catch((err) => console.error("[ACTIVITY_LOGGER_ABLY]", err));
}

// ── CREATED ───────────────────────────────────────────────────────────────────

export async function logEntityCreated(params: {
  organizationId: string;
  parentType: ActivityParentType;
  parentId: string;
  createdByUserId?: string;
  source: "manual" | "import";
  importBatchId?: string;
  importFilename?: string;
}): Promise<void> {
  try {
    const body =
      params.source === "import" && params.importFilename
        ? `Created via import: ${params.importFilename}`
        : "Created";

    const metadata: Record<string, unknown> = { source: params.source };
    if (params.importBatchId) {
      metadata.importBatchId = params.importBatchId;
      metadata.importFilename = params.importFilename ?? null;
      metadata.targetUrl = `/app/import/${params.importBatchId}`;
    }

    await _createAndPublish({
      organizationId: params.organizationId,
      parentType: params.parentType,
      parentId: params.parentId,
      kind: "CREATED",
      body,
      createdByUserId: params.createdByUserId,
      metadata,
    });
  } catch (err) {
    console.error("[ACTIVITY_LOGGER_CREATED]", err);
  }
}

// ── UPDATED ───────────────────────────────────────────────────────────────────

export async function logEntityUpdated(params: {
  organizationId: string;
  parentType: ActivityParentType;
  parentId: string;
  createdByUserId?: string;
  changes: FieldChange[];
}): Promise<void> {
  if (!params.changes.length) return;
  try {
    const fieldNames = params.changes.map((c) => c.field).join(", ");
    await _createAndPublish({
      organizationId: params.organizationId,
      parentType: params.parentType,
      parentId: params.parentId,
      kind: "UPDATED",
      body: `Updated: ${fieldNames}`,
      createdByUserId: params.createdByUserId,
      metadata: {
        changedFields: params.changes.map((c) => c.field),
        changes: params.changes,
      },
    });
  } catch (err) {
    console.error("[ACTIVITY_LOGGER_UPDATED]", err);
  }
}

// ── LINKED / UNLINKED (single-side) ──────────────────────────────────────────

export async function logEntityLinked(params: {
  organizationId: string;
  fromType: ActivityParentType;
  fromId: string;
  toType: string;
  toId: string;
  toLabel: string;
  toUrl: string;
  createdByUserId?: string;
}): Promise<void> {
  try {
    await _createAndPublish({
      organizationId: params.organizationId,
      parentType: params.fromType,
      parentId: params.fromId,
      kind: "LINKED",
      body: `Linked to ${params.toLabel}`,
      createdByUserId: params.createdByUserId,
      metadata: {
        targetType: params.toType,
        targetId: params.toId,
        targetLabel: params.toLabel,
        targetUrl: params.toUrl,
      },
    });
  } catch (err) {
    console.error("[ACTIVITY_LOGGER_LINKED]", err);
  }
}

export async function logEntityUnlinked(params: {
  organizationId: string;
  fromType: ActivityParentType;
  fromId: string;
  toType: string;
  toId: string;
  toLabel: string;
  toUrl: string;
  createdByUserId?: string;
}): Promise<void> {
  try {
    await _createAndPublish({
      organizationId: params.organizationId,
      parentType: params.fromType,
      parentId: params.fromId,
      kind: "UNLINKED",
      body: `Unlinked from ${params.toLabel}`,
      createdByUserId: params.createdByUserId,
      metadata: {
        targetType: params.toType,
        targetId: params.toId,
        targetLabel: params.toLabel,
        targetUrl: params.toUrl,
      },
    });
  } catch (err) {
    console.error("[ACTIVITY_LOGGER_UNLINKED]", err);
  }
}

// ── LINKED / UNLINKED (symmetric — logs both sides in parallel) ───────────────

export async function logEntityLinkedSymmetric(params: {
  organizationId: string;
  aType: ActivityParentType;
  aId: string;
  aLabel: string;
  aUrl: string;
  bType: ActivityParentType;
  bId: string;
  bLabel: string;
  bUrl: string;
  createdByUserId?: string;
}): Promise<void> {
  await Promise.all([
    logEntityLinked({
      organizationId: params.organizationId,
      fromType: params.aType,
      fromId: params.aId,
      toType: params.bType,
      toId: params.bId,
      toLabel: params.bLabel,
      toUrl: params.bUrl,
      createdByUserId: params.createdByUserId,
    }),
    logEntityLinked({
      organizationId: params.organizationId,
      fromType: params.bType,
      fromId: params.bId,
      toType: params.aType,
      toId: params.aId,
      toLabel: params.aLabel,
      toUrl: params.aUrl,
      createdByUserId: params.createdByUserId,
    }),
  ]);
}

export async function logEntityUnlinkedSymmetric(params: {
  organizationId: string;
  aType: ActivityParentType;
  aId: string;
  aLabel: string;
  aUrl: string;
  bType: ActivityParentType;
  bId: string;
  bLabel: string;
  bUrl: string;
  createdByUserId?: string;
}): Promise<void> {
  await Promise.all([
    logEntityUnlinked({
      organizationId: params.organizationId,
      fromType: params.aType,
      fromId: params.aId,
      toType: params.bType,
      toId: params.bId,
      toLabel: params.bLabel,
      toUrl: params.bUrl,
      createdByUserId: params.createdByUserId,
    }),
    logEntityUnlinked({
      organizationId: params.organizationId,
      fromType: params.bType,
      fromId: params.bId,
      toType: params.aType,
      toId: params.aId,
      toLabel: params.aLabel,
      toUrl: params.aUrl,
      createdByUserId: params.createdByUserId,
    }),
  ]);
}

// ── STAGE_CHANGED ─────────────────────────────────────────────────────────────

export async function logStageChanged(params: {
  organizationId: string;
  dealId: string;
  fromStage: string;
  toStage: string;
  notes?: string;
  changedByUserId?: string;
}): Promise<void> {
  try {
    await _createAndPublish({
      organizationId: params.organizationId,
      parentType: "DEAL",
      parentId: params.dealId,
      kind: "STAGE_CHANGED",
      body: `Stage changed from ${params.fromStage} to ${params.toStage}`,
      createdByUserId: params.changedByUserId,
      metadata: {
        fromStage: params.fromStage,
        toStage: params.toStage,
        notes: params.notes ?? null,
      },
    });
  } catch (err) {
    console.error("[ACTIVITY_LOGGER_STAGE_CHANGED]", err);
  }
}

// ── CALENDAR_EVENT_ADDED / REMOVED ────────────────────────────────────────────

export async function logCalendarEventAdded(params: {
  organizationId: string;
  parentType: ActivityParentType;
  parentId: string;
  eventId: string;
  eventTitle: string;
  eventType: string;
  startTime: string;
  actorUserId?: string;
}): Promise<void> {
  try {
    await _createAndPublish({
      organizationId: params.organizationId,
      parentType: params.parentType,
      parentId: params.parentId,
      kind: "CALENDAR_EVENT_ADDED",
      body: `Added to event: ${params.eventTitle}`,
      createdByUserId: params.actorUserId,
      metadata: {
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        eventType: params.eventType,
        startTime: params.startTime,
        targetUrl: `/app/calendar/events/${params.eventId}`,
      },
    });
  } catch (err) {
    console.error("[ACTIVITY_LOGGER_CALENDAR_ADDED]", err);
  }
}

export async function logCalendarEventRemoved(params: {
  organizationId: string;
  parentType: ActivityParentType;
  parentId: string;
  eventId: string;
  eventTitle: string;
  actorUserId?: string;
}): Promise<void> {
  try {
    await _createAndPublish({
      organizationId: params.organizationId,
      parentType: params.parentType,
      parentId: params.parentId,
      kind: "CALENDAR_EVENT_REMOVED",
      body: `Removed from event: ${params.eventTitle}`,
      createdByUserId: params.actorUserId,
      metadata: {
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        targetUrl: `/app/calendar/events/${params.eventId}`,
      },
    });
  } catch (err) {
    console.error("[ACTIVITY_LOGGER_CALENDAR_REMOVED]", err);
  }
}
