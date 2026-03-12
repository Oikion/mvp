"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

export async function linkImagesToProperty(
  propertyId: string,
  uploadSessionId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { orgId } = await auth();
    if (!orgId) return { success: false, error: "Unauthorized" };

    // Verify property belongs to organization
    const property = await prismadb.properties.findFirst({
      where: { id: propertyId, organizationId: orgId },
      select: { id: true },
    });

    if (!property) return { success: false, error: "Property not found" };

    // Link all session images (that have no property yet) to this property
    const result = await prismadb.propertyImage.updateMany({
      where: {
        uploadSessionId,
        propertyId: null,
        organizationId: orgId,
      },
      data: { propertyId },
    });

    return { success: true, count: result.count };
  } catch {
    return { success: false, error: "Failed to link images to property" };
  }
}
