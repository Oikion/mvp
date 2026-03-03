"use server";


import {
  actionError,
  actionSuccess,
  type ActionResponse,
} from "@/lib/action-response";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { Prisma } from "@prisma/client";
import { prismadb } from "@/lib/prisma";


/**
 * Get agency contact form settings
 */
export async function getAgencyContactFormSettings(): Promise<
  ActionResponse<{ enabled: boolean; fields: unknown[] | null }>
> {
  const guard = await requireAction("admin:manage_org_settings");
  if (guard) return guard;

  try {
    const organizationId = await getCurrentOrgId();
    const profile = await prismadb.agencyProfile.findUnique({
      where: { organizationId },
      select: {
        contactFormEnabled: true,
        contactFormFields: true,
      },
    });

    if (!profile) {
      return actionSuccess({ enabled: false, fields: null });
    }

    return actionSuccess({
      enabled: profile.contactFormEnabled,
      fields: profile.contactFormFields as unknown[] | null,
    });
  } catch (err) {
    console.error("[GET_AGENCY_CONTACT_FORM_SETTINGS]", err);
    return actionError("Failed to load contact form settings", err as Error);
  }
}

/**
 * Update agency contact form settings
 */
export async function updateAgencyContactFormSettings(
  enabled: boolean,
  fields?: unknown[]
): Promise<ActionResponse<void>> {
  const guard = await requireAction("admin:manage_org_settings");
  if (guard) return guard;

  try {
    const organizationId = await getCurrentOrgId();
    const profile = await prismadb.agencyProfile.findUnique({
      where: { organizationId },
    });

    if (!profile) {
      return actionError("Agency profile not found", "NOT_FOUND");
    }

    await prismadb.agencyProfile.update({
      where: { organizationId },
      data: {
        contactFormEnabled: enabled,
        contactFormFields: fields ? (fields as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return actionSuccess();
  } catch (err) {
    console.error("[UPDATE_AGENCY_CONTACT_FORM_SETTINGS]", err);
    return actionError("Failed to update contact form settings", err as Error);
  }
}

/**
 * Submit contact form for an agency (public action, no auth required)
 */
export async function submitAgencyContactForm(
  slug: string,
  formData: Record<string, unknown>
): Promise<ActionResponse<void>> {
  try {
    const profile = await prismadb.agencyProfile.findFirst({
      where: {
        slug,
        visibility: { in: ["PUBLIC", "SECURE"] },
        contactFormEnabled: true,
      },
      select: { id: true },
    });

    if (!profile) {
      return actionError(
        "Agency profile not found or contact form is disabled",
        "NOT_FOUND"
      );
    }

    await prismadb.agencyContactSubmission.create({
      data: {
        profileId: profile.id,
        formData: formData as Prisma.InputJsonValue,
        senderName: (formData.name as string) ?? null,
        senderEmail: (formData.email as string) ?? null,
      },
    });

    return actionSuccess();
  } catch (err) {
    console.error("[SUBMIT_AGENCY_CONTACT_FORM]", err);
    return actionError("Failed to submit contact form", err as Error);
  }
}
