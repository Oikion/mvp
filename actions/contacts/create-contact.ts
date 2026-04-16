"use server";

import { Prisma } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { encryptContactForOrg } from "@/lib/model-encryption";
import { generateFriendlyId } from "@/lib/friendly-id";
import { createContactSchema, type CreateContactInput } from "@/lib/validations/contacts";
import { actionSuccess, actionError, actionValidationError, type ActionResponse } from "@/lib/action-response";
import { revalidatePath } from "next/cache";

/**
 * Creates a new contact in the current organization.
 * Encrypts PII fields, generates friendly ID, and validates input.
 */
export async function createContact(
  input: CreateContactInput
): Promise<ActionResponse<{ id: string; friendlyId: string }>> {
  const guard = await requireAction("contact:create");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const user = await getCurrentUser();
  if (!organizationId || !user) {
    return actionError("Unauthorized", "AUTH_ERROR");
  }

  // Validate input
  const validation = createContactSchema.safeParse(input);
  if (!validation.success) {
    return actionValidationError(
      "Validation failed",
      validation.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const data = validation.data;

  try {
    // Generate friendly ID
    const friendlyId = await generateFriendlyId(prismadb, "Contact", organizationId);

    // Encrypt sensitive fields
    const encrypted = await encryptContactForOrg(
      {
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        displayName: data.displayName,
        companyName: data.companyName ?? null,
        email: data.email ?? null,
        secondaryEmail: data.secondaryEmail ?? null,
        primaryPhone: data.primaryPhone ?? null,
        secondaryPhone: data.secondaryPhone ?? null,
        officePhone: data.officePhone ?? null,
        whatsapp: data.whatsapp ?? null,
        viber: data.viber ?? null,
        taxId: data.taxId ?? null,
        doy: data.doy ?? null,
        vatNumber: data.vatNumber ?? null,
        companyGemi: data.companyGemi ?? null,
        companyId: data.companyId ?? null,
        idDocument: data.idDocument ?? null,
        notes: data.notes ?? null,
        communicationNotes: data.communicationNotes ?? null,
        addresses: data.addresses ?? null,
      },
      organizationId
    );

    const contact = await prismadb.contact.create({
      data: {
        organizationId,
        friendlyId,
        createdBy: user.id,
        updatedBy: user.id,

        // Encrypted fields
        firstName: encrypted.firstName,
        lastName: encrypted.lastName,
        displayName: encrypted.displayName!,
        companyName: encrypted.companyName,
        email: encrypted.email,
        secondaryEmail: encrypted.secondaryEmail,
        primaryPhone: encrypted.primaryPhone,
        secondaryPhone: encrypted.secondaryPhone,
        officePhone: encrypted.officePhone,
        whatsapp: encrypted.whatsapp,
        viber: encrypted.viber,
        taxId: encrypted.taxId,
        doy: encrypted.doy,
        vatNumber: encrypted.vatNumber,
        companyGemi: encrypted.companyGemi,
        companyId: encrypted.companyId,
        idDocument: encrypted.idDocument,
        notes: encrypted.notes,
        communicationNotes: encrypted.communicationNotes ?? Prisma.JsonNull,
        addresses: encrypted.addresses ?? Prisma.JsonNull,

        // Plain fields
        isCompany: data.isCompany ?? false,
        category: data.category,
        status: data.status ?? "LEAD",
        source: data.source ?? null,
        visibility: data.visibility ?? "PRIVATE",
        assignedAgentId: data.assignedAgentId ?? null,
        languagePreference: data.languagePreference ?? null,
        tags: data.tags ?? [],
        leadScore: data.leadScore ?? null,
        doNotContact: data.doNotContact ?? false,
        gdprConsentGiven: data.gdprConsentGiven ?? false,
        gdprConsentDate: data.gdprConsentGiven ? new Date() : null,
        allowMarketing: data.allowMarketing ?? false,
        referredById: data.referredById ?? null,
      },
    });

    revalidatePath("/crm/contacts");

    return actionSuccess({ id: contact.id, friendlyId: contact.friendlyId! });
  } catch (error) {
    console.error("[CREATE_CONTACT]", error);
    return actionError("Failed to create contact", error instanceof Error ? error : undefined);
  }
}
