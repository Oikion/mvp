"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { encryptRequestForOrg } from "@/lib/model-encryption";
import { updateRequestSchema, type UpdateRequestInput } from "@/lib/validations/requests";
import { actionSuccess, actionError, actionValidationError, type ActionResponse } from "@/lib/action-response";
import { revalidatePath } from "next/cache";
import { createSystemActivity } from "@/actions/activities";
import { logEntityCreated, logEntityUpdated, type FieldChange } from "@/lib/activity-logger";

// Safelist of non-encrypted Request fields tracked by the activity log.
const REQUEST_TRACKED_TO_COLUMN: Record<string, string> = {
  status: "status",
  purpose: "propertyCategory",
  propertyTypes: "propertyTypes",
  budgetMin: "budgetMin",
  budgetMax: "budgetMax",
  timeline: "timeline",
  assignedToUserId: "assignedAgentId",
  visibilityState: "visibility",
};

function serializeValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return JSON.stringify(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function diffTrackedFields(
  oldRecord: Record<string, unknown>,
  newPayload: Record<string, unknown>
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const [trackedName, col] of Object.entries(REQUEST_TRACKED_TO_COLUMN)) {
    if (!(col in newPayload)) continue;
    const before = serializeValue(oldRecord[col]);
    const after = serializeValue(newPayload[col]);
    if (before !== after) {
      changes.push({ field: trackedName, from: before, to: after });
    }
  }
  return changes;
}

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

  // Fetch existing tracked fields before update (for activity diffing)
  const existing = await prismadb.request.findFirst({
    where: { id: requestId, organizationId },
    select: {
      status: true,
      propertyCategory: true,
      propertyTypes: true,
      budgetMin: true,
      budgetMax: true,
      timeline: true,
      assignedAgentId: true,
      visibility: true,
      draftStatus: true,
    },
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

    // Activity log — fire-and-forget. Suppressed for drafts. Promotion from
    // draft → non-draft emits CREATED instead of UPDATED.
    if (existing) {
      const wasDraft = existing.draftStatus === true;
      const isDraftAfter = updated.draftStatus === true;

      if (wasDraft && !isDraftAfter) {
        void logEntityCreated({
          organizationId,
          parentType: "REQUEST",
          parentId: requestId,
          createdByUserId: user.id,
          source: "manual",
        });
      } else if (!wasDraft && !isDraftAfter) {
        const changes = diffTrackedFields(
          existing as unknown as Record<string, unknown>,
          data as unknown as Record<string, unknown>
        );
        if (changes.length > 0) {
          void logEntityUpdated({
            organizationId,
            parentType: "REQUEST",
            parentId: requestId,
            createdByUserId: user.id,
            changes,
          });
        }
      }
      // else: update on a draft (still draft) — suppressed.
    }

    revalidatePath("/requests");

    return actionSuccess({ id: updated.id });
  } catch (error) {
    console.error("[UPDATE_REQUEST]", error);
    return actionError("Failed to update request", "DB_ERROR");
  }
}
