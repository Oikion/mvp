"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUserId } from "@/lib/get-current-user";
import { requireAction, requireActionOnEntity } from "@/lib/permissions/action-guards";
import { encryptActivityForOrg, decryptActivityForOrg } from "@/lib/model-encryption";
import { createActivitySchema, updateActivitySchema } from "@/lib/validations/activities";
import { serializePrisma } from "@/lib/prisma-serialize";
import { actionSuccess, actionError, actionNotFound, type ActionResponse } from "@/lib/action-response";
import type { ActivityParentType } from "@prisma/client";

/**
 * Create a new activity log entry attached to a parent entity.
 * organizationId and createdByUserId are always injected server-side.
 */
export async function createActivity(input: unknown): Promise<ActionResponse> {
  const guard = await requireAction("activity:create");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  // Strip organizationId from input — we inject it from server auth context
  const parsed = createActivitySchema.parse(
    typeof input === "object" && input !== null
      ? { ...input, organizationId }
      : input
  );

  try {
    const encrypted = await encryptActivityForOrg(
      {
        parentType: parsed.parentType,
        parentId: parsed.parentId,
        kind: parsed.kind,
        direction: parsed.direction,
        assignedToUserId: parsed.assignedToUserId,
        subject: parsed.subject,
        body: parsed.body,
        outcome: parsed.outcome,
        scheduledAt: parsed.scheduledAt,
        occurredAt: parsed.occurredAt ?? new Date(),
        durationMin: parsed.durationMin,
      },
      organizationId
    );

    const activity = await prismadb.activity.create({
      data: {
        ...encrypted,
        organizationId,
        createdByUserId: userId ?? undefined,
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
export async function updateActivity(id: string, input: unknown): Promise<ActionResponse> {
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

  try {
    const parsed = updateActivitySchema.parse(input);
    const encrypted = await encryptActivityForOrg(parsed, organizationId);

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
export async function listActivities(
  parentType: string,
  parentId: string
): Promise<ActionResponse> {
  const organizationId = await getCurrentOrgId();

  const guard = await requireAction("activity:read");
  if (guard) return guard;

  try {
    const activities = await prismadb.activity.findMany({
      where: {
        organizationId,
        parentType: parentType as ActivityParentType,
        parentId,
        deletedAt: null,
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
