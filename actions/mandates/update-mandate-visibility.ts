"use server";

import { auth } from "@clerk/nextjs/server";
import { ItemVisibility } from "@prisma/client";
import { prismadb } from "@/lib/prisma";

export async function updateMandateVisibility(
  mandateId: string,
  visibility: ItemVisibility
): Promise<{ success: boolean; error?: string }> {
  try {
    const { orgId } = await auth();
    if (!orgId) return { success: false, error: "Unauthorized" };

    const mandate = await prismadb.mandate.findFirst({
      where: { id: mandateId, organizationId: orgId },
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
