"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

export async function setPrimaryImage(
  imageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { orgId } = await auth();
    if (!orgId) return { success: false, error: "Unauthorized" };

    // Find image scoped to organization
    const image = await prismadb.propertyImage.findFirst({
      where: { id: imageId, organizationId: orgId },
    });

    if (!image) return { success: false, error: "Image not found" };

    // Transaction: unset all isPrimary in scope, then set chosen image
    const scopeWhere = image.propertyId
      ? { propertyId: image.propertyId, organizationId: orgId }
      : { uploadSessionId: image.uploadSessionId, organizationId: orgId };

    await prismadb.$transaction([
      prismadb.propertyImage.updateMany({
        where: scopeWhere,
        data: { isPrimary: false },
      }),
      prismadb.propertyImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to set primary image" };
  }
}
