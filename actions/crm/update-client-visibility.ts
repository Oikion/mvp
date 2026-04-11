"use server";

import { auth } from "@clerk/nextjs/server";
import { ItemVisibility } from "@prisma/client";
import { prismadb } from "@/lib/prisma";

export async function updateClientVisibility(
  clientId: string,
  visibility: ItemVisibility
): Promise<{ success: boolean; error?: string }> {
  try {
    const { orgId } = await auth();
    if (!orgId) return { success: false, error: "Unauthorized" };

    const contact = await prismadb.contact.findFirst({
      where: { id: clientId, organizationId: orgId },
      select: { id: true },
    });
    if (!contact) return { success: false, error: "Client not found" };

    await prismadb.contact.update({
      where: { id: clientId },
      data: { visibility },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update visibility" };
  }
}
