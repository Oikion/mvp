"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClerkClient } from "@clerk/backend";

import {
  actionError,
  actionSuccess,
  type ActionResponse,
} from "@/lib/action-response";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { Prisma } from "@prisma/client";
import { prismadb } from "@/lib/prisma";

// name and slug are intentionally excluded — they are always sourced from Clerk
const upsertAgencyProfileSchema = z.object({
  logo: z.string().url().optional().nullable().or(z.literal("")),
  description: z.string().max(2000).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  website: z.string().url().max(500).optional().nullable().or(z.literal("")),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(2).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  socialLinks: z
    .record(z.string().url().or(z.literal("")))
    .optional()
    .nullable(),
  visibility: z.enum(["PRIVATE", "SECURE", "PUBLIC"]).optional(),
  yearFounded: z.number().min(1800).max(new Date().getFullYear()).optional().nullable(),
  licenseNumber: z.string().max(100).optional().nullable(),
});

export type AgencyProfileInput = z.infer<typeof upsertAgencyProfileSchema>;

/**
 * Get the current organization's agency profile (for settings).
 * Only available in agency workspace; caller should check workspace type.
 */
export async function getAgencyProfile(): Promise<
  ActionResponse<Awaited<ReturnType<typeof fetchAgencyProfile>>>
> {
  const guard = await requireAction("admin:manage_org_settings");
  if (guard) return guard;

  try {
    const organizationId = await getCurrentOrgId();
    const profile = await fetchAgencyProfile(organizationId);
    return actionSuccess(profile);
  } catch (err) {
    console.error("[GET_AGENCY_PROFILE]", err);
    return actionError("Failed to load agency profile", err as Error);
  }
}

async function fetchAgencyProfile(organizationId: string) {
  return prismadb.agencyProfile.findUnique({
    where: { organizationId },
  });
}

/**
 * Create or update the current organization's agency profile.
 */
export async function upsertAgencyProfile(
  data: AgencyProfileInput
): Promise<ActionResponse<{ id: string; slug: string }>> {
  const guard = await requireAction("admin:manage_org_settings");
  if (guard) return guard;

  const parsed = upsertAgencyProfileSchema.safeParse(data);
  if (!parsed.success) {
    return actionError(
      parsed.error.errors.map((e) => e.message).join("; "),
      "VALIDATION_ERROR"
    );
  }

  try {
    const organizationId = await getCurrentOrgId();
    const input = parsed.data;

    // Always source name and slug from Clerk to keep them in sync
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY ?? "" });
    const organization = await clerk.organizations.getOrganization({ organizationId });

    if (!organization.slug) {
      return actionError("Your organization does not have a slug configured in Clerk. Please set one in your organization settings.", "VALIDATION_ERROR");
    }

    const normalized = {
      name: organization.name,
      slug: organization.slug.toLowerCase().trim(),
      logo: input.logo || null,
      description: input.description || null,
      phone: input.phone || null,
      email: input.email || null,
      website: input.website || null,
      address: input.address || null,
      city: input.city || null,
      region: input.region || null,
      postalCode: input.postalCode || null,
      country: input.country ?? "GR",
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      socialLinks: input.socialLinks ? (input.socialLinks as Prisma.InputJsonValue) : Prisma.JsonNull,
      visibility: input.visibility ?? "PRIVATE",
      yearFounded: input.yearFounded ?? null,
      licenseNumber: input.licenseNumber || null,
    };

    const existing = await prismadb.agencyProfile.findUnique({
      where: { organizationId },
    });

    if (existing) {
      if (existing.slug !== normalized.slug) {
        const slugTaken = await prismadb.agencyProfile.findUnique({
          where: { slug: normalized.slug },
        });
        if (slugTaken) {
          return actionError("This URL slug is already in use", "VALIDATION_ERROR");
        }
      }

      await prismadb.agencyProfile.update({
        where: { organizationId },
        data: {
          ...normalized,
          updatedAt: new Date(),
        },
      });
    } else {
      const slugTaken = await prismadb.agencyProfile.findUnique({
        where: { slug: normalized.slug },
      });
      if (slugTaken) {
        return actionError("This URL slug is already in use", "VALIDATION_ERROR");
      }

      await prismadb.agencyProfile.create({
        data: {
          organizationId,
          ...normalized,
        },
      });
    }

    revalidatePath("/settings/agency-profile");
    revalidatePath(`/agency/${normalized.slug}`);

    const profile = await prismadb.agencyProfile.findUnique({
      where: { organizationId },
      select: { id: true, slug: true },
    });

    if (!profile) {
      return actionError("Profile not found after save", "NOT_FOUND");
    }

    return actionSuccess({ id: profile.id, slug: profile.slug });
  } catch (err) {
    console.error("[UPSERT_AGENCY_PROFILE]", err);
    return actionError("Failed to save agency profile", err as Error);
  }
}

/**
 * Get a public agency profile by slug with showcase properties.
 * Respects visibility: PUBLIC always; SECURE only when authenticated.
 */
export async function getPublicAgencyProfile(
  slug: string,
  isAuthenticated: boolean = false
) {
  const profile = await prismadb.agencyProfile.findFirst({
    where: {
      slug: slug.toLowerCase(),
      visibility: isAuthenticated
        ? { in: ["PUBLIC", "SECURE"] as const }
        : "PUBLIC",
    },
    // Explicit projection — never return organizationId, lat/lng, or timestamps to public visitors
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      description: true,
      phone: true,
      email: true,
      website: true,
      address: true,
      city: true,
      region: true,
      postalCode: true,
      country: true,
      socialLinks: true,
      yearFounded: true,
      licenseNumber: true,
      contactFormEnabled: true,
      contactFormFields: true,
    },
  });

  return profile;
}
