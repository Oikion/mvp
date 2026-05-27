"use server";

import { z } from "zod";
import { ItemVisibility } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";

export async function updateClientVisibility(
  clientId: string,
  visibility: ItemVisibility
): Promise<{ success: boolean; error?: string }> {
  const guard = await requireAction("contact:update");
  if (guard) return { success: false, error: "Unauthorized" };

  const parsedVisibility = z.nativeEnum(ItemVisibility).safeParse(visibility);
  if (!parsedVisibility.success) {
    return { success: false, error: "Invalid visibility value" };
  }
  const safeVisibility = parsedVisibility.data;

  try {
    const organizationId = await getCurrentOrgId();

    const contact = await prismadb.contact.findFirst({
      where: { id: clientId, organizationId },
      select: { id: true },
    });
    if (!contact) return { success: false, error: "Client not found" };

    await prismadb.contact.update({
      where: { id: clientId, organizationId },
      data: { visibility: safeVisibility },
    });

    return { success: true };
  } catch (error) {
    console.error("[UPDATE_CLIENT_VISIBILITY]", error);
    return { success: false, error: "Update failed" };
  }
}
