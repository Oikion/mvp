"use server";

import { z } from "zod";
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

  const parsedVisibility = z.nativeEnum(ItemVisibility).safeParse(visibility);
  if (!parsedVisibility.success) {
    return actionError("Invalid visibility value", "VALIDATION_ERROR");
  }
  const safeVisibility = parsedVisibility.data;

  const organizationId = await getCurrentOrgId();
  if (!organizationId) {
    return actionError("Unauthorized", "AUTH_ERROR");
  }

  try {
    let updatedId: string;

    await prismadb.$transaction(async (tx) => {
      const updated = await tx.request.update({
        where: { id: requestId, organizationId },
        data: { visibility: safeVisibility },
        select: { id: true },
      });
      updatedId = updated.id;

      // Remove cross-org matches when visibility is downgraded below sharing threshold
      if (safeVisibility === "HIDDEN" || safeVisibility === "PRIVATE") {
        await tx.crossOrgMatch.deleteMany({
          where: { requestId },
        });
      }
    });

    revalidatePath("/requests");

    return actionSuccess({ id: updatedId! });
  } catch (error) {
    console.error("[UPDATE_REQUEST_VISIBILITY]", error);
    return actionError("Failed to update visibility", "DB_ERROR");
  }
}
