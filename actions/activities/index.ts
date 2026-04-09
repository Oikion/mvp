"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUserId } from "@/lib/get-current-user";
import { requireAction, requireActionOnEntity } from "@/lib/permissions/action-guards";
import { encryptActivityForOrg, decryptActivityForOrg } from "@/lib/model-encryption";
import { createActivitySchema, updateActivitySchema } from "@/lib/validations/activities";
import { serializePrisma } from "@/lib/prisma-serialize";
import type { ActivityParentType } from "@prisma/client";

/**
 * Create a new activity log entry attached to a parent entity.
 * organizationId and createdByUserId are always injected server-side.
 */
export async function createActivity(input: unknown) {
  const guard = await requireAction("activity:create");
  if (guard) throw new Error(guard.error);

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  // Strip organizationId from input — we inject it from server auth context
  const parsed = createActivitySchema.parse(
    typeof input === "object" && input !== null
      ? { ...input, organizationId }
      : input
  );

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

  return serializePrisma(activity);
}

/**
 * Update an existing activity.
 * Only the creator (or higher-privilege roles) may edit.
 */
export async function updateActivity(id: string, input: unknown) {
  const organizationId = await getCurrentOrgId();

  const existing = await prismadb.activity.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { createdByUserId: true },
  });

  if (!existing) throw new Error("Not found");

  const guard = await requireActionOnEntity(
    "activity:update",
    "task", // closest entity type for ownership semantics
    id,
    existing.createdByUserId
  );
  if (guard) throw new Error(guard.error);

  const parsed = updateActivitySchema.parse(input);
  const encrypted = await encryptActivityForOrg(parsed, organizationId);

  const activity = await prismadb.activity.update({
    where: { id },
    data: encrypted,
  });

  return serializePrisma(activity);
}

/**
 * Soft-delete an activity by setting deletedAt.
 * Never hard-deletes from the database.
 */
export async function deleteActivity(id: string) {
  const organizationId = await getCurrentOrgId();

  const existing = await prismadb.activity.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { createdByUserId: true },
  });

  if (!existing) throw new Error("Not found");

  const guard = await requireActionOnEntity(
    "activity:delete",
    "task",
    id,
    existing.createdByUserId
  );
  if (guard) throw new Error(guard.error);

  await prismadb.activity.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return { success: true };
}

/**
 * List activities for a given parent entity.
 * Results are decrypted and serialized before returning.
 */
export async function listActivities(
  parentType: string,
  parentId: string
) {
  const organizationId = await getCurrentOrgId();

  const guard = await requireAction("activity:read");
  if (guard) throw new Error(guard.error);

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

  return serializePrisma(decrypted);
}
