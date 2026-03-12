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

    await prismadb.mandate.update({
      where: { id: mandateId },
      data: { visibility },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update visibility" };
  }
}
