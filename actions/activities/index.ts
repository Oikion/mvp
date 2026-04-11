"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { requireAction, requireActionOnEntity } from "@/lib/permissions/action-guards";
import { encryptActivityForOrg, decryptActivityForOrg } from "@/lib/model-encryption";
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
          select: { id: true, firstName: true, lastName: true },
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

    return actionSuccess(serializePrisma(decrypted));
  } catch (error) {
    console.error("[ACTIVITY_LIST]", error);
    return actionError("Failed to list activities", error as Error);
  }
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
