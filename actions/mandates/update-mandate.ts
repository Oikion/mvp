"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { revalidatePath } from "next/cache";
import { encryptMandateForOrg } from "@/lib/model-encryption";
import { updateMandateSchema } from "@/lib/validations/mandates";
import { createChangeLogEntry, diffEntity, REQUEST_WATCHED_FIELDS } from "@/lib/entity-change-log";

export const updateMandate = async (data: any) => {
  const guard = await requireAction("request:update");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const user = await getCurrentUser();

  // Validate input against schema
  const parsed = updateMandateSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Validation failed: ${parsed.error.errors.map((e) => e.message).join(", ")}`
    );
  }

  const { id, ...fields } = parsed.data;

  // Fetch before-snapshot for diff (only watched fields needed)
  const existing = await prismadb.mandate.findFirst({
    where: { id, organizationId },
    select: {
      status: true,
      urgency: true,
      assigned_to: true,
      budget_min: true,
      budget_max: true,
      transaction_type: true,
    },
  });

  const encryptedData = await encryptMandateForOrg(fields, organizationId);

  const updatedMandate = await prismadb.mandate.update({
    where: {
      id,
      organizationId,
    },
    data: {
      ...encryptedData,
      updatedAt: new Date(),
      updatedBy: user.id,
    } as any,
  });

  if (existing) {
    const changedFields = diffEntity(
      existing as Record<string, unknown>,
      updatedMandate as Record<string, unknown>,
      REQUEST_WATCHED_FIELDS,
      [] // no encrypted fields in watched set
    );
    if (changedFields.length > 0) {
      createChangeLogEntry({
        organizationId,
        entityType: "REQUEST",
        entityId: updatedMandate.id,
        eventType: "UPDATED",
        actorUserId: user.id,
        changedFields,
      }).catch((err) => console.error("[MANDATE_UPDATED_LOG]", err));
    }
  }

  revalidatePath("/mandates");
  return updatedMandate;
};
