"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

export async function reorderPropertyImages(
  imageIds: string[]
): Promise<{ success: boolean; error?: string }> {
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
