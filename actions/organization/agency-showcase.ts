"use server";

import { revalidatePath } from "next/cache";

import {
  actionError,
  actionSuccess,
  type ActionResponse,
} from "@/lib/action-response";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { prismadb } from "@/lib/prisma";
import { serializePrismaJson } from "@/lib/prisma-serialize";

/**
 * Get agency showcase properties
 */
export async function getAgencyShowcaseProperties(): Promise<
  ActionResponse<unknown[]>
> {
  const guard = await requireAction("admin:manage_org_settings");
  if (guard) return guard;

  try {
    const organizationId = await getCurrentOrgId();
    const profile = await prismadb.agencyProfile.findUnique({
      where: { organizationId },
      select: { id: true },
    });

    if (!profile) {
      return actionSuccess([]);
    }

    const showcaseRaw = await prismadb.agencyShowcaseProperty.findMany({
      where: { profileId: profile.id },
      include: {
        Properties: {
          select: {
            id: true,
            property_name: true,
            property_type: true,
            property_status: true,
            transaction_type: true,
            price: true,
            address_city: true,
            address_state: true,
            bedrooms: true,
            bathrooms: true,
            size_net_sqm: true,
            Documents: {
              where: { document_file_mimeType: { startsWith: "image/" } },
              select: { document_file_url: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { order: "asc" },
    });

    const serialized = serializePrismaJson(
      showcaseRaw.map((sp) => ({
        id: sp.id,
        propertyId: sp.propertyId,
        order: sp.order,
        property: sp.Properties
          ? { ...sp.Properties, linkedDocuments: sp.Properties.Documents }
          : null,
      }))
    );

    return actionSuccess(serialized);
  } catch (err) {
    console.error("[GET_AGENCY_SHOWCASE]", err);
    return actionError("Failed to load showcase properties", err);
  }
}

/**
 * Get available properties for agency showcase (org's PUBLIC properties)
 */
export async function getAvailablePropertiesForAgencyShowcase(): Promise<
  ActionResponse<unknown[]>
> {
  const guard = await requireAction("admin:manage_org_settings");
  if (guard) return guard;

  try {
    const organizationId = await getCurrentOrgId();
    const profile = await prismadb.agencyProfile.findUnique({
      where: { organizationId },
      select: { id: true },
    });

    const existingPropertyIds = profile
      ? (
          await prismadb.agencyShowcaseProperty.findMany({
            where: { profileId: profile.id },
            select: { propertyId: true },
          })
        ).map((sp) => sp.propertyId)
      : [];

    const propertiesRaw = await prismadb.properties.findMany({
      where: {
        organizationId,
        property_status: "ACTIVE",
        portal_visibility: "PUBLIC",
        id: { notIn: existingPropertyIds },
      },
      select: {
        id: true,
        property_name: true,
        property_type: true,
        property_status: true,
        transaction_type: true,
        price: true,
        address_city: true,
        address_state: true,
        bedrooms: true,
        bathrooms: true,
        size_net_sqm: true,
        Documents: {
          where: { document_file_mimeType: { startsWith: "image/" } },
          select: { document_file_url: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const properties = propertiesRaw.map((p) => ({
      ...p,
      linkedDocuments: p.Documents,
    }));

    return actionSuccess(serializePrismaJson(properties));
  } catch (err) {
    console.error("[GET_AGENCY_AVAILABLE_PROPERTIES]", err);
    return actionError("Failed to load available properties", err);
  }
}

/**
 * Add property to agency showcase
 */
export async function addAgencyShowcaseProperty(
  propertyId: string
): Promise<ActionResponse<unknown>> {
  const guard = await requireAction("property:publish_portal");
  if (guard) return guard;

  try {
    const organizationId = await getCurrentOrgId();

    const property = await prismadb.properties.findFirst({
      where: {
        id: propertyId,
        organizationId,
        portal_visibility: "PUBLIC",
      },
    });

    if (!property) {
      return actionError(
        "Property not found or not public. Only properties with public visibility can be showcased.",
        "VALIDATION_ERROR"
      );
    }

    let profile = await prismadb.agencyProfile.findUnique({
      where: { organizationId },
    });

    if (!profile) {
      return actionError(
        "Please create your agency profile first.",
        "NOT_FOUND"
      );
    }

    const maxOrder = await prismadb.agencyShowcaseProperty.aggregate({
      where: { profileId: profile.id },
      _max: { order: true },
    });

    const newOrder = (maxOrder._max.order ?? -1) + 1;

    const showcasePropertyRaw = await prismadb.agencyShowcaseProperty.create({
      data: {
        profileId: profile.id,
        propertyId,
        order: newOrder,
      },
      include: {
        Properties: {
          select: {
            id: true,
            property_name: true,
            property_type: true,
            price: true,
            address_city: true,
          },
        },
      },
    });

    revalidatePath("/settings/agency-profile");
    revalidatePath(`/agency/${profile.slug}`);

    const showcaseProperty = {
      ...showcasePropertyRaw,
      property: showcasePropertyRaw.Properties,
    };

    return actionSuccess(serializePrismaJson(showcaseProperty));
  } catch (err) {
    console.error("[ADD_AGENCY_SHOWCASE_PROPERTY]", err);
    return actionError("Failed to add property to showcase", err);
  }
}

/**
 * Remove property from agency showcase
 */
export async function removeAgencyShowcaseProperty(
  propertyId: string
): Promise<ActionResponse<void>> {
  const guard = await requireAction("admin:manage_org_settings");
  if (guard) return guard;

  try {
    const organizationId = await getCurrentOrgId();
    const profile = await prismadb.agencyProfile.findUnique({
      where: { organizationId },
    });

    if (!profile) {
      return actionError("Profile not found", "NOT_FOUND");
    }

    await prismadb.agencyShowcaseProperty.deleteMany({
      where: { profileId: profile.id, propertyId },
    });

    const remaining = await prismadb.agencyShowcaseProperty.findMany({
      where: { profileId: profile.id },
      orderBy: { order: "asc" },
    });

    await Promise.all(
      remaining.map((item, index) =>
        prismadb.agencyShowcaseProperty.update({
          where: { id: item.id },
          data: { order: index },
        })
      )
    );

    revalidatePath("/settings/agency-profile");
    revalidatePath(`/agency/${profile.slug}`);

    return actionSuccess();
  } catch (err) {
    console.error("[REMOVE_AGENCY_SHOWCASE_PROPERTY]", err);
    return actionError("Failed to remove property from showcase", err);
  }
}

/**
 * Reorder agency showcase properties
 */
export async function reorderAgencyShowcaseProperties(
  orderedIds: string[]
): Promise<ActionResponse<void>> {
  const guard = await requireAction("admin:manage_org_settings");
  if (guard) return guard;

  try {
    const organizationId = await getCurrentOrgId();
    const profile = await prismadb.agencyProfile.findUnique({
      where: { organizationId },
    });

    if (!profile) {
      return actionError("Profile not found", "NOT_FOUND");
    }

    const existingShowcase = await prismadb.agencyShowcaseProperty.findMany({
      where: { profileId: profile.id },
      select: { propertyId: true },
    });

    const existingIds = new Set(existingShowcase.map((s) => s.propertyId));

    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        return actionError("Invalid property ID in order list", "VALIDATION_ERROR");
      }
    }

    await Promise.all(
      orderedIds.map((propertyId, index) =>
        prismadb.agencyShowcaseProperty.updateMany({
          where: { profileId: profile.id, propertyId },
          data: { order: index },
        })
      )
    );

    revalidatePath("/settings/agency-profile");
    revalidatePath(`/agency/${profile.slug}`);

    return actionSuccess();
  } catch (err) {
    console.error("[REORDER_AGENCY_SHOWCASE]", err);
    return actionError("Failed to reorder showcase properties", err);
  }
}

/**
 * Get public agency showcase properties (for public profile page)
 */
export async function getPublicAgencyShowcaseProperties(slug: string) {
  const profile = await prismadb.agencyProfile.findFirst({
    where: { slug, visibility: { in: ["PUBLIC", "SECURE"] } },
    select: { id: true },
  });

  if (!profile) {
    return [];
  }

  const showcaseRaw = await prismadb.agencyShowcaseProperty.findMany({
    where: { profileId: profile.id },
    include: {
      Properties: {
        select: {
          id: true,
          property_name: true,
          property_type: true,
          transaction_type: true,
          price: true,
          address_city: true,
          address_state: true,
          bedrooms: true,
          bathrooms: true,
          size_net_sqm: true,
          portal_visibility: true,
          Documents: {
            where: { document_file_mimeType: { startsWith: "image/" } },
            select: { document_file_url: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { order: "asc" },
  });

  return serializePrismaJson(
    showcaseRaw
      .map((sp) =>
        sp.Properties
          ? { ...sp.Properties, linkedDocuments: sp.Properties.Documents }
          : null
      )
      .filter(Boolean)
  );
}
