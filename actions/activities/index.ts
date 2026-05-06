"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { requireAction, requireActionOnEntity } from "@/lib/permissions/action-guards";
import { encryptActivityForOrg, decryptActivityForOrg, decryptContactForOrg, decryptCalendarEventForOrg } from "@/lib/model-encryption";
import { createActivitySchema, updateActivitySchema } from "@/lib/validations/activities";
import { serializePrisma } from "@/lib/prisma-serialize";
import { actionSuccess, actionError, actionNotFound, actionValidationError, type ActionResponse } from "@/lib/action-response";
import type { ActivityParentType } from "@prisma/client";

/**
 * Create a new activity log entry attached to a parent entity.
 * organizationId and createdByUserId are always injected server-side.
 */
export async function createActivity(input: unknown): Promise<ActionResponse<unknown>> {
  const guard = await requireAction("activity:create");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const currentUser = await getCurrentUser();

  // Strip organizationId from input — always injected from server auth context
  const clientInput =
    typeof input === "object" && input !== null
      ? { ...(input as Record<string, unknown>), organizationId: undefined }
      : input;
  const parsed = createActivitySchema.safeParse(
    typeof clientInput === "object" && clientInput !== null
      ? { ...clientInput, organizationId }
      : clientInput
  );
  if (!parsed.success) {
    console.error("[ACTIVITY_CREATE_VALIDATION]", JSON.stringify(parsed.error.flatten()));
    return actionValidationError("Validation failed", parsed.error.flatten().fieldErrors);
  }

  try {
    const encrypted = await encryptActivityForOrg(
      {
        parentType: parsed.data.parentType,
        parentId: parsed.data.parentId,
        kind: parsed.data.kind,
        direction: parsed.data.direction,
        assignedToUserId: parsed.data.assignedToUserId,
        subject: parsed.data.subject,
        body: parsed.data.body,
        outcome: parsed.data.outcome,
        scheduledAt: parsed.data.scheduledAt,
        occurredAt: parsed.data.occurredAt ?? new Date(),
        durationMin: parsed.data.durationMin,
      },
      organizationId
    );

    const activity = await prismadb.activity.create({
      data: {
        ...encrypted,
        organizationId,
        createdByUserId: currentUser?.id ?? undefined,
        relatedDocumentId: parsed.data.relatedDocumentId ?? undefined,
        relatedContactId: parsed.data.relatedContactId ?? undefined,
        relatedPropertyId: parsed.data.relatedPropertyId ?? undefined,
      },
    });

    return actionSuccess(serializePrisma(activity));
  } catch (error) {
    console.error("[ACTIVITY_CREATE]", error);
    return actionError("Failed to create activity", error as Error);
  }
}

/**
 * Update an existing activity.
 * Only the creator (or higher-privilege roles) may edit.
 */
export async function updateActivity(id: string, input: unknown): Promise<ActionResponse<unknown>> {
  const organizationId = await getCurrentOrgId();

  const existing = await prismadb.activity.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { createdByUserId: true },
  });

  if (!existing) return actionNotFound("Activity");

  const guard = await requireActionOnEntity(
    "activity:update",
    "task", // closest entity type for ownership semantics
    id,
    existing.createdByUserId
  );
  if (guard) return guard;

  const parsed = updateActivitySchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError("Validation failed", parsed.error.flatten().fieldErrors);
  }

  try {
    const encrypted = await encryptActivityForOrg(parsed.data, organizationId);

    const activity = await prismadb.activity.update({
      where: { id, organizationId },
      data: encrypted,
    });

    return actionSuccess(serializePrisma(activity));
  } catch (error) {
    console.error("[ACTIVITY_UPDATE]", error);
    return actionError("Failed to update activity", error as Error);
  }
}

/**
 * Soft-delete an activity by setting deletedAt.
 * Never hard-deletes from the database.
 */
export async function deleteActivity(id: string): Promise<ActionResponse> {
  const organizationId = await getCurrentOrgId();

  const existing = await prismadb.activity.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { createdByUserId: true },
  });

  if (!existing) return actionNotFound("Activity");

  const guard = await requireActionOnEntity(
    "activity:delete",
    "task",
    id,
    existing.createdByUserId
  );
  if (guard) return guard;

  try {
    await prismadb.activity.update({
      where: { id, organizationId },
      data: { deletedAt: new Date() },
    });

    return actionSuccess();
  } catch (error) {
    console.error("[ACTIVITY_DELETE]", error);
    return actionError("Failed to delete activity", error as Error);
  }
}

/**
 * List activities for a given parent entity.
 * Results are decrypted and serialized before returning.
 */
// For CALENDAR_EVENT_ADDED/REMOVED the body is stored as a sentence embedding the
// (possibly encrypted) event title. isEncrypted() cannot detect ciphertext embedded
// inside a sentence so decryptActivityForOrg leaves body untouched. We decrypt only
// metadata.eventTitle here and leave body reconstruction to the UI layer — the UI
// reads metadata directly and can format a locale-aware label from it.
async function patchCalendarActivityBodies<T extends { kind: string; metadata?: unknown }>(
  activities: T[],
  organizationId: string
): Promise<T[]> {
  const calendarKinds = new Set(["CALENDAR_EVENT_ADDED", "CALENDAR_EVENT_REMOVED"]);
  return Promise.all(
    activities.map(async (a) => {
      if (!calendarKinds.has(a.kind)) return a;
      const meta = a.metadata as Record<string, unknown> | null | undefined;
      const rawTitle = meta?.eventTitle as string | null | undefined;
      if (!rawTitle) return a;
      const { title: decryptedTitle } = await decryptCalendarEventForOrg(
        { title: rawTitle },
        organizationId
      );
      return {
        ...a,
        metadata: { ...(meta ?? {}), eventTitle: decryptedTitle ?? rawTitle },
      };
    })
  );
}

// Maps ActivityParentType enum values to their Prisma model delegate names
const PARENT_TYPE_TO_MODEL: Record<string, string> = {
  CONTACT: "contact",
  REQUEST: "request",
  DEAL: "deal",
  PROPERTY: "properties",
  SHOWING: "propertyShowing",
};

export async function listActivities(
  parentType: string,
  parentId: string
): Promise<ActionResponse<unknown>> {
  const guard = await requireAction("activity:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  // Verify the parent entity belongs to this org (prevents IDOR)
  const modelName = PARENT_TYPE_TO_MODEL[parentType];
  if (!modelName) {
    return actionValidationError("Validation failed", { parentType: ["Invalid parent type"] });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parentExists = await (prismadb as any)[modelName].findFirst({
    where: { id: parentId, organizationId },
    select: { id: true },
  });
  if (!parentExists) return actionNotFound("Parent entity");

  try {
    const activities = await prismadb.activity.findMany({
      where: {
        organizationId,
        parentType: parentType as ActivityParentType,
        parentId,
        deletedAt: null,
      },
      include: {
        CreatedBy: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        AssignedTo: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        RelatedDocument: {
          select: { id: true, document_name: true },
        },
        RelatedContact: {
          select: { id: true, displayName: true, firstName: true, lastName: true },
        },
        RelatedProperty: {
          select: { id: true, property_name: true, friendlyId: true },
        },
      },
      orderBy: { occurredAt: "desc" },
    });

    const decrypted = await Promise.all(
      activities.map((a) => decryptActivityForOrg(a, organizationId))
    );

    // Patch body/metadata.eventTitle for calendar activities (body is a sentence
    // containing a possibly-encrypted title substring — isEncrypted() misses it).
    const decryptedCalendar = await patchCalendarActivityBodies(decrypted, organizationId);

    // Decrypt RelatedContact firstName/lastName — these are contact PII fields
    // encrypted with the org DEK. decryptContactForOrg uses isEncrypted() guards
    // so it is safe to call even if values are already plaintext.
    const decryptedWithContacts = await Promise.all(
      decryptedCalendar.map(async (a) => {
        if (!a.RelatedContact) return a;
        const decryptedContact = await decryptContactForOrg(a.RelatedContact, organizationId);
        return { ...a, RelatedContact: decryptedContact };
      })
    );

    return actionSuccess(serializePrisma(decryptedWithContacts));
  } catch (error) {
    console.error("[ACTIVITY_LIST]", error);
    return actionError("Failed to list activities", error as Error);
  }
}

/**
 * List EntityChangeLog entries for a given entity.
 * Verifies the parent entity belongs to the org before querying (IDOR protection).
 */
export async function listEntityChangeLogs(
  entityType: "CONTACT" | "PROPERTY" | "REQUEST" | "DEAL",
  entityId: string
): Promise<ActionResponse<unknown>> {
  const guard = await requireAction("activity:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  const modelName = PARENT_TYPE_TO_MODEL[entityType];
  if (!modelName) {
    return actionValidationError("Validation failed", { entityType: ["Invalid entity type"] });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parentExists = await (prismadb as any)[modelName].findFirst({
    where: { id: entityId, organizationId },
    select: { id: true },
  });
  if (!parentExists) return actionNotFound("Entity");

  try {
    const logs = await prismadb.entityChangeLog.findMany({
      where: { organizationId, entityType, entityId },
      include: {
        Actor: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
      orderBy: { occurredAt: "desc" },
    });

    return actionSuccess(serializePrisma(logs));
  } catch (error) {
    console.error("[ENTITY_CHANGE_LOG_LIST]", error);
    return actionError("Failed to list change logs", error as Error);
  }
}

/**
 * Unified feed: merges activities and entity change logs for a parent entity,
 * sorted by occurredAt descending. Each item is tagged with _source.
 */
export async function listUnifiedFeed(
  parentType: "CONTACT" | "PROPERTY" | "REQUEST" | "DEAL",
  parentId: string
): Promise<ActionResponse<unknown>> {
  const [activitiesResult, changeLogsResult] = await Promise.all([
    listActivities(parentType, parentId),
    listEntityChangeLogs(parentType, parentId),
  ]);

  if (!activitiesResult.success) return activitiesResult;
  if (!changeLogsResult.success) return changeLogsResult;

  const activities = (activitiesResult.data as unknown[]).map((item) => ({
    ...(item as Record<string, unknown>),
    _source: "activity" as const,
  }));

  const changeLogs = (changeLogsResult.data as unknown[]).map((item) => ({
    ...(item as Record<string, unknown>),
    _source: "changelog" as const,
  }));

  const merged = [...activities, ...changeLogs].sort((a, b) => {
    const aTime = new Date((a as Record<string, unknown>).occurredAt as string).getTime() || 0;
    const bTime = new Date((b as Record<string, unknown>).occurredAt as string).getTime() || 0;
    return bTime - aTime;
  });

  return actionSuccess(merged);
}

/**
 * Internal helper for auto-capturing system events (status changes, visibility
 * updates, document links, etc.). Called from other server actions — never
 * directly from client code. No permission guard; caller is trusted server context.
 */
export async function createSystemActivity(input: {
  organizationId: string;
  parentType: "CONTACT" | "REQUEST" | "DEAL" | "PROPERTY" | "SHOWING";
  parentId: string;
  kind: "NOTE" | "DOCUMENT" | "TASK" | "EMAIL" | "CALL" | "MEETING" | "SHOWING" | "OTHER";
  body: string;
  createdByUserId?: string;
  relatedDocumentId?: string;
  relatedContactId?: string;
  relatedPropertyId?: string;
}): Promise<void> {
  try {
    await prismadb.activity.create({
      data: {
        organizationId: input.organizationId,
        parentType: input.parentType,
        parentId: input.parentId,
        kind: input.kind,
        direction: "INTERNAL",
        body: input.body,
        occurredAt: new Date(),
        createdByUserId: input.createdByUserId ?? undefined,
        relatedDocumentId: input.relatedDocumentId ?? undefined,
        relatedContactId: input.relatedContactId ?? undefined,
        relatedPropertyId: input.relatedPropertyId ?? undefined,
      },
    });
  } catch (error) {
    // System activity failures are non-fatal — log but don't surface to caller
    console.error("[SYSTEM_ACTIVITY_CREATE]", error);
  }
}
