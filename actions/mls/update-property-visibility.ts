"use server";

import { auth } from "@clerk/nextjs/server";
import { ItemVisibility } from "@prisma/client";
import { prismadb } from "@/lib/prisma";

export async function updatePropertyVisibility(
  propertyId: string,
  visibility: ItemVisibility
): Promise<{ success: boolean; error?: string }> {
  try {
    const { orgId } = await auth();
    if (!orgId) return { success: false, error: "Unauthorized" };

    const property = await prismadb.properties.findFirst({
      where: { id: propertyId, organizationId: orgId },
      select: { id: true },
    });
    if (!property) return { success: false, error: "Property not found" };

    // Use transaction for atomicity: visibility update + match cleanup
    await prismadb.$transaction(async (tx) => {
      await tx.properties.update({
        where: { id: propertyId },
        data: { visibility },
      });

      // Clean up cross-org matches when visibility is downgraded
      if (visibility === "HIDDEN" || visibility === "PRIVATE") {
        await tx.crossOrgMatch.deleteMany({
          where: { propertyId },
        });
      }
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update visibility" };
  }
}
