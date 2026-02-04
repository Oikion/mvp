"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import { serializePrismaJson } from "@/lib/prisma-serialize";

/**
 * Get the current user's showcase properties with order
 */
export async function getShowcaseProperties() {
  const currentUser = await getCurrentUser();

  const profile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });

  if (!profile) {
    return [];
  }

  const showcasePropertiesRaw = await prismadb.profileShowcaseProperty.findMany({
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
          square_feet: true,
          size_net_sqm: true,
          Documents: {
            where: {
              document_file_mimeType: {
                startsWith: "image/",
              },
            },
            select: {
              document_file_url: true,
            },
            take: 1,
          },
        },
      },
    },
    orderBy: { order: "asc" },
  });

  // Serialize to plain objects - converts Decimal to number, Date to string
  return serializePrismaJson(showcasePropertiesRaw.map((sp) => ({
    id: sp.id,
    propertyId: sp.propertyId,
    order: sp.order,
    property: sp.Properties ? {
      ...sp.Properties,
      linkedDocuments: sp.Properties.Documents,
    } : null,
  })));
}

/**
 * Get available properties for showcase (user's own properties)
 */
export async function getAvailablePropertiesForShowcase() {
  const currentUser = await getCurrentUser();
  const organizationId = await getCurrentOrgId();

  const profile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });

  // Get IDs of properties already in showcase
  const showcasedPropertyIds = profile
    ? (
        await prismadb.profileShowcaseProperty.findMany({
          where: { profileId: profile.id },
          select: { propertyId: true },
        })
      ).map((sp) => sp.propertyId)
    : [];

  // Get user's properties that are not yet showcased
  const propertiesRaw = await prismadb.properties.findMany({
    where: {
      organizationId,
      assigned_to: currentUser.id,
      property_status: "ACTIVE",
      id: {
        notIn: showcasedPropertyIds,
      },
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
      square_feet: true,
      size_net_sqm: true,
      Documents: {
        where: {
          document_file_mimeType: {
            startsWith: "image/",
          },
        },
        select: {
          document_file_url: true,
        },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Map to expected field names
  const properties = propertiesRaw.map((p) => ({
    ...p,
    linkedDocuments: p.Documents,
  }));

  // Serialize to plain objects - converts Decimal to number, Date to string
  return serializePrismaJson(properties);
}

/**
 * Add a property to the showcase
 */
export async function addShowcaseProperty(propertyId: string) {
  const currentUser = await getCurrentUser();
  const organizationId = await getCurrentOrgId();

  // Verify the property belongs to the user
  const property = await prismadb.properties.findFirst({
    where: {
      id: propertyId,
      assigned_to: currentUser.id,
      organizationId,
    },
  });

  if (!property) {
    throw new Error("Property not found or you don't have permission to add it.");
  }

  // Get or create the agent profile
  let profile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
  });

  if (!profile) {
    throw new Error("Please create your public profile first.");
  }

  // Get the current max order
  const maxOrder = await prismadb.profileShowcaseProperty.aggregate({
    where: { profileId: profile.id },
    _max: { order: true },
  });

  const newOrder = (maxOrder._max.order ?? -1) + 1;

  // Add to showcase
  const showcasePropertyRaw = await prismadb.profileShowcaseProperty.create({
    data: {
      id: crypto.randomUUID(),
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

  revalidatePath("/profile/public");
  // Use username for revalidation since that's the URL
  if (currentUser.username) {
    revalidatePath(`/agent/${currentUser.username}`);
  }

  // Map to expected field name
  const showcaseProperty = {
    ...showcasePropertyRaw,
    property: showcasePropertyRaw.Properties,
  };

  // Serialize to plain objects - converts Decimal to number, Date to string
  return serializePrismaJson(showcaseProperty);
}

/**
 * Remove a property from the showcase
 */
export async function removeShowcaseProperty(propertyId: string) {
  const currentUser = await getCurrentUser();

  const profile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
  });

  if (!profile) {
    throw new Error("Profile not found.");
  }

  // Remove from showcase
  await prismadb.profileShowcaseProperty.deleteMany({
    where: {
      profileId: profile.id,
      propertyId,
    },
  });

  // Re-order remaining properties
  const remaining = await prismadb.profileShowcaseProperty.findMany({
    where: { profileId: profile.id },
    orderBy: { order: "asc" },
  });

  // Update order for all remaining items
  await Promise.all(
    remaining.map((item, index) =>
      prismadb.profileShowcaseProperty.update({
        where: { id: item.id },
        data: { order: index },
      })
    )
  );

  revalidatePath("/profile/public");
  // Use username for revalidation since that's the URL
  if (currentUser.username) {
    revalidatePath(`/agent/${currentUser.username}`);
  }

  return { success: true };
}

/**
 * Reorder showcase properties
 * @param orderedIds - Array of property IDs in the desired order
 */
export async function reorderShowcaseProperties(orderedIds: string[]) {
  const currentUser = await getCurrentUser();

  const profile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
  });

  if (!profile) {
    throw new Error("Profile not found.");
  }

  // Verify all properties belong to the user's profile
  const existingShowcase = await prismadb.profileShowcaseProperty.findMany({
    where: { profileId: profile.id },
    select: { propertyId: true },
  });

  const existingIds = new Set(existingShowcase.map((s) => s.propertyId));

  for (const id of orderedIds) {
    if (!existingIds.has(id)) {
      throw new Error("Invalid property ID in order list.");
    }
  }

  // Update the order for each property
  await Promise.all(
    orderedIds.map((propertyId, index) =>
      prismadb.profileShowcaseProperty.updateMany({
        where: {
          profileId: profile.id,
          propertyId,
        },
        data: { order: index },
      })
    )
  );

  revalidatePath("/profile/public");
  // Use username for revalidation since that's the URL
  if (currentUser.username) {
    revalidatePath(`/agent/${currentUser.username}`);
  }

  return { success: true };
}

/**
 * Get showcase properties for a public profile by slug
 */
export async function getPublicShowcaseProperties(slug: string) {
  const profile = await prismadb.agentProfile.findFirst({
    where: {
      slug,
      visibility: { in: ["PUBLIC", "SECURE"] },
    },
    select: { id: true },
  });

  if (!profile) {
    return [];
  }

  const showcasePropertiesRaw = await prismadb.profileShowcaseProperty.findMany({
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
          square_feet: true,
          size_net_sqm: true,
          Documents: {
            where: {
              document_file_mimeType: {
                startsWith: "image/",
              },
            },
            select: {
              document_file_url: true,
            },
            take: 1,
          },
        },
      },
    },
    orderBy: { order: "asc" },
  });

  // Serialize to plain objects - converts Decimal to number, Date to string
  return serializePrismaJson(showcasePropertiesRaw.map((sp) => sp.Properties ? {
    ...sp.Properties,
    linkedDocuments: sp.Properties.Documents,
  } : null).filter(Boolean));
}

