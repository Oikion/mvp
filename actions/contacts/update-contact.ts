"use server";

import { Prisma } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { encryptContactForOrg } from "@/lib/model-encryption";
import { updateContactSchema, type UpdateContactInput } from "@/lib/validations/contacts";
import { actionSuccess, actionError, actionValidationError, actionNotFound, type ActionResponse } from "@/lib/action-response";
import { revalidatePath } from "next/cache";

/**
 * Updates an existing contact. Encrypts modified PII fields before write.
 */
export async function updateContact(
  input: UpdateContactInput
): Promise<ActionResponse> {
  const guard = await requireAction("contact:update");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const user = await getCurrentUser();
  if (!organizationId || !user) {
    return actionError("Unauthorized", "AUTH_ERROR");
  }

  const validation = updateContactSchema.safeParse(input);
  if (!validation.success) {
    return actionValidationError(
      "Validation failed",
      validation.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { id, ...data } = validation.data;

  // Verify contact belongs to this org
  const existing = await prismadb.contact.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });

  if (!existing) {
    return actionNotFound("Contact");
  }

  try {
    const encrypted = await encryptContactForOrg(data, organizationId);
    const { addresses, communicationNotes, ...rest } = encrypted as Record<string, unknown>;

    // organizationId in WHERE prevents TOCTOU cross-org writes
    await prismadb.contact.update({
      where: { id, organizationId },
      data: {
        ...(rest as Prisma.ContactUpdateInput),
        ...(addresses !== undefined
          ? { addresses: (addresses ?? Prisma.DbNull) as Prisma.InputJsonValue }
          : {}),
        ...(communicationNotes !== undefined
          ? { communicationNotes: (communicationNotes ?? Prisma.DbNull) as Prisma.InputJsonValue }
          : {}),
        updatedBy: user.id,
      },
    });

    revalidatePath("/crm/contacts");
    return actionSuccess();
  } catch (error) {
    console.error("[UPDATE_CONTACT]", error);
    return actionError("Failed to update contact", error as Error);
  }
}
