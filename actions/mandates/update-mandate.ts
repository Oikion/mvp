"use server";

/**
 * update-mandate.ts — backward-compat shim for legacy callers.
 *
 * The underlying Mandate model was removed (Phase 2 migration). Requests are
 * the canonical demand-side entity. This file re-exports the logic from
 * actions/requests/update-request so any remaining callsites that import
 * `updateMandate` continue to work without modification.
 *
 * New code should import `updateRequest` directly from `@/actions/requests`.
 */

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { encryptRequestForOrg } from "@/lib/model-encryption";
import {
  actionSuccess,
  actionError,
  type ActionResponse,
} from "@/lib/action-response";

export interface UpdateMandateInput {
  id: string;
  title?: string;
  notes?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Updates a Request (formerly Mandate) by id.
 *
 * - Checks `request:update` permission first.
 * - Derives `organizationId` from server-side Clerk auth — never accepts it
 *   from the caller.
 * - Encrypts sensitive fields via `encryptRequestForOrg` before persisting.
 */
export async function updateMandate(
  input: UpdateMandateInput
): Promise<ActionResponse<{ id: string }>> {
  // 1. Permission guard — MUST be first
  const guard = await requireAction("request:update");
  if (guard) return guard;

  // 2. Derive org from server auth context
  const organizationId = await getCurrentOrgId();
  const user = await getCurrentUser();
  if (!organizationId || !user) {
    return actionError("Unauthorized", "AUTH_ERROR");
  }

  const { id, ...updateData } = input;

  if (!id) {
    return actionError("Request id is required", "VALIDATION_ERROR");
  }

  try {
    // 3. Encrypt sensitive fields before persisting
    const encrypted = await encryptRequestForOrg(updateData, organizationId);

    // 4. Update — WHERE includes organizationId for TOCTOU safety
    const updated = await prismadb.request.update({
      where: { id, organizationId },
      data: {
        ...encrypted,
        updatedBy: user.id,
      },
    });

    return actionSuccess({ id: updated.id });
  } catch (error) {
    console.error("[UPDATE_MANDATE]", error);
    return actionError("Failed to update request", "DB_ERROR");
  }
}
