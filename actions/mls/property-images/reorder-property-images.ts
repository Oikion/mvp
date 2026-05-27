"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { requireAction } from "@/lib/permissions/action-guards";

export async function reorderPropertyImages(
  imageIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const guard = await requireAction("property:update");
  if (guard) return { success: false, error: guard.error };

  try {
    const { orgId } = await auth();
    if (!orgId) return { success: false, error: "Unauthorized" };

    await prismadb.$transaction(
      imageIds.map((id, index) =>
        prismadb.propertyImage.updateMany({
          where: { id, organizationId: orgId },
          data: { position: index },
        })
      )
    );

    return { success: true };
  } catch {
    return { success: false, error: "Failed to reorder images" };
  }
}
