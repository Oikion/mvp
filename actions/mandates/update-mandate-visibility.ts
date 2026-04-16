"use server";

import { ItemVisibility } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { requireAction } from "@/lib/permissions/action-guards";
import { getCurrentOrgId } from "@/lib/get-current-user";

export async function updateMandateVisibility(
  mandateId: string,
  visibility: ItemVisibility
): Promise<{ success: boolean; error?: string }> {
  try {
    const guard = await requireAction("request:update");
    if (guard) return guard;
    const organizationId = await getCurrentOrgId();

    const mandate = await prismadb.mandate.findFirst({
      where: { id: mandateId, organizationId },
      select: { id: true },
    });
    if (!mandate) return { success: false, error: "Mandate not found" };

    await prismadb.$transaction(async (tx) => {
      await tx.mandate.update({
        where: { id: mandateId },
        data: { visibility },
      });

      // CrossOrgMatch v2 links to Requests (not Mandates) via requestId.
      // Mandate visibility no longer drives cross-org match cleanup directly.
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update visibility" };
  }
}
