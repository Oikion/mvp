"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { deleteFromBlob } from "@/lib/vercel-blob";
import { requireAction } from "@/lib/permissions/action-guards";

export async function deletePropertyImage(
  imageId: string
): Promise<{ success: boolean; error?: string }> {
  const guard = await requireAction("property:update");
  if (guard) return { success: false, error: guard.error };

  try {
    const { orgId } = await auth();
    if (!orgId) return { success: false, error: "Unauthorized" };

    // Find image scoped to organization
    const image = await prismadb.propertyImage.findFirst({
      where: { id: imageId, organizationId: orgId },
    });

    if (!image) return { success: false, error: "Image not found" };

    // Delete from blob storage
    await deleteFromBlob(image.url);

    // Delete DB record
    await prismadb.propertyImage.delete({
      where: { id: imageId },
    });

    // If deleted image was primary, promote next image (lowest position) to primary
    if (image.isPrimary) {
      const scopeWhere = image.propertyId
        ? { propertyId: image.propertyId, organizationId: orgId }
        : { uploadSessionId: image.uploadSessionId, organizationId: orgId };

      const nextImage = await prismadb.propertyImage.findFirst({
        where: scopeWhere,
        orderBy: { position: "asc" },
      });

      if (nextImage) {
        await prismadb.propertyImage.update({
          where: { id: nextImage.id },
          data: { isPrimary: true },
        });
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete image" };
  }
}
