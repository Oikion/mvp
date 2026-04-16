"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { encryptRequestForOrg } from "@/lib/model-encryption";
import { updateRequestSchema, type UpdateRequestInput } from "@/lib/validations/requests";
import { actionSuccess, actionError, actionValidationError, type ActionResponse } from "@/lib/action-response";
import { revalidatePath } from "next/cache";
import { createSystemActivity } from "@/actions/activities";

/**
 * Updates an existing request. Encrypts sensitive fields.
 * TOCTOU-safe: WHERE includes both id AND organizationId.
 */
export async function updateRequest(
  requestId: string,
  input: UpdateRequestInput
): Promise<ActionResponse<{ id: string }>> {
  const guard = await requireAction("request:update");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const user = await getCurrentUser();
  if (!organizationId || !user) {
    return actionError("Unauthorized", "AUTH_ERROR");
  }

  const validation = updateRequestSchema.safeParse(input);
  if (!validation.success) {
    return actionValidationError(
      "Validation failed",
      validation.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const data = validation.data;

  // Fetch existing status before update (for system activity body)
  const existing = await prismadb.request.findFirst({
    where: { id: requestId, organizationId },
    select: { status: true },
  });

  try {
    // Encrypt sensitive fields if present
    const toEncrypt: Record<string, unknown> = {};
    if ("notes" in data) toEncrypt.notes = data.notes ?? null;
    if ("locationDisplayName" in data) toEncrypt.locationDisplayName = data.locationDisplayName ?? null;
    if ("communicationNotes" in data) toEncrypt.communicationNotes = data.communicationNotes ?? null;
    if ("areasOfInterest" in data) toEncrypt.areasOfInterest = data.areasOfInterest ?? null;

    const encrypted = Object.keys(toEncrypt).length > 0
      ? await encryptRequestForOrg(toEncrypt, organizationId)
      : {};

    const updated = await prismadb.request.update({
      where: { id: requestId, organizationId },
      data: {
        ...data,
        ...encrypted,
        updatedBy: user.id,
      },
    });

    if (data.status && existing && data.status !== existing.status) {
      void createSystemActivity({
        organizationId,
        parentType: "REQUEST",
        parentId: requestId,
        kind: "OTHER",
        body: `Status changed from ${existing.status} to ${String(data.status)}`,
      });
    }

    revalidatePath("/requests");

    return actionSuccess({ id: updated.id });
  } catch (error) {
    console.error("[UPDATE_REQUEST]", error);
    return actionError("Failed to update request", "DB_ERROR");
  }
}
