"use server";

import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, actionNotFound, type ActionResponse } from "@/lib/action-response";
import { ItemVisibility } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createSystemActivity } from "@/actions/activities";

/**
 * Updates a contact's visibility level.
 * When downgrading to HIDDEN or PRIVATE, future cross-org sharing cleanup will apply.
 */
export async function updateContactVisibility(
  contactId: string,
  visibility: ItemVisibility
): Promise<ActionResponse> {
  const guard = await requireAction("contact:update");
  if (guard) return guard;

  const parsedVisibility = z.nativeEnum(ItemVisibility).safeParse(visibility);
  if (!parsedVisibility.success) {
    return actionError("Invalid visibility value", "VALIDATION_ERROR");
  }
  const safeVisibility = parsedVisibility.data;

  const organizationId = await getCurrentOrgId();
  if (!organizationId) return actionError("Unauthorized", "AUTH_ERROR");

  const existing = await prismadb.contact.findFirst({
    where: { id: contactId, organizationId },
    select: { id: true, visibility: true },
  });

  if (!existing) return actionNotFound("Contact");

  try {
    await prismadb.contact.update({
      where: { id: contactId, organizationId },
      data: { visibility: safeVisibility },
    });

    void createSystemActivity({
      organizationId,
      parentType: "CONTACT",
      parentId: contactId,
      kind: "OTHER",
      body: `Visibility changed from ${existing.visibility} to ${safeVisibility}`,
    });

    revalidatePath("/crm/contacts");
    return actionSuccess();
  } catch (error) {
    console.error("[UPDATE_CONTACT_VISIBILITY]", error);
    return actionError("Failed to update visibility", error as Error);
  }
}
