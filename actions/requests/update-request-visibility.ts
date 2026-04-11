"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { ItemVisibility } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * Updates only the visibility of a request.
 * TOCTOU-safe: WHERE includes both id AND organizationId.
 */
export async function updateRequestVisibility(
  requestId: string,
  visibility: ItemVisibility
): Promise<ActionResponse<{ id: string }>> {
  const guard = await requireAction("request:update");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  if (!organizationId) {
    return actionError("Unauthorized", "AUTH_ERROR");
  }

  try {
    const updated = await prismadb.request.update({
      where: { id: requestId, organizationId },
      data: { visibility },
    });

    revalidatePath("/requests");

    return actionSuccess({ id: updated.id });
  } catch (error) {
    console.error("[UPDATE_REQUEST_VISIBILITY]", error);
    return actionError("Failed to update visibility", "DB_ERROR");
  }
}
