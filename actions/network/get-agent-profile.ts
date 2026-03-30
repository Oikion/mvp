"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { requireAuth } from "@/lib/permissions/action-guards";

/**
 * Fetch an agent's profile for the in-app profile view.
 * Requires authentication. Returns null if profile is PRIVATE or doesn't exist.
 */
export async function getInAppAgentProfile(username: string) {
  const guard = await requireAuth();
  if (guard) return null;

  const currentUser = await getCurrentUser();

  // Find user by username
  const targetUser = await prismadb.users.findFirst({
    where: {
      username: { equals: username, mode: "insensitive" },
    },
    select: { id: true, name: true, avatar: true, username: true, email: true },
  });

  if (!targetUser) return null;

  // Self-view check — return special marker
  if (targetUser.id === currentUser.id) {
    return { isSelf: true as const };
  }

  // Fetch profile (authenticated = SECURE + PUBLIC visible)
  const profile = await prismadb.agentProfile.findFirst({
    where: {
      userId: targetUser.id,
      visibility: { in: ["PUBLIC", "SECURE"] },
    },
    include: {
      ProfileShowcaseProperty: {
        orderBy: { order: "asc" },
        include: {
          Properties: {
            select: {
              id: true,
              friendlyId: true,
              property_name: true,
              property_type: true,
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
      },
    },
  });

  if (!profile) return null;

  // Fetch connection status + counts in parallel
  const [connection, connectionCount, presence] = await Promise.all([
    prismadb.agentConnection.findFirst({
      where: {
        OR: [
          { followerId: currentUser.id, followingId: targetUser.id },
          { followerId: targetUser.id, followingId: currentUser.id },
        ],
      },
      select: { id: true, status: true, followingId: true },
    }),
    prismadb.agentConnection.count({
      where: {
        OR: [
          { followerId: targetUser.id, status: "ACCEPTED" },
          { followingId: targetUser.id, status: "ACCEPTED" },
        ],
      },
    }),
    prismadb.userPresence.findUnique({
      where: { userId: targetUser.id },
      select: { status: true, lastSeenAt: true },
    }),
  ]);

  // Map connection status
  let connectionStatus: "NONE" | "PENDING" | "ACCEPTED" = "NONE";
  let isIncomingRequest = false;
  if (connection) {
    connectionStatus = connection.status as "NONE" | "PENDING" | "ACCEPTED";
    isIncomingRequest = connection.followingId === currentUser.id;
  }

  // Build showcase properties
  const showcaseProperties = profile.ProfileShowcaseProperty.map((sp) => ({
    id: sp.Properties.id,
    friendlyId: sp.Properties.friendlyId,
    property_name: sp.Properties.property_name,
    property_type: sp.Properties.property_type,
    transaction_type: sp.Properties.transaction_type,
    price: sp.Properties.price ? Number(sp.Properties.price) : null,
    address_city: sp.Properties.address_city,
    address_state: sp.Properties.address_state,
    bedrooms: sp.Properties.bedrooms,
    bathrooms: sp.Properties.bathrooms,
    size_net_sqm: sp.Properties.size_net_sqm ? Number(sp.Properties.size_net_sqm) : null,
    image: sp.Properties.Documents?.[0]?.document_file_url || null,
  }));

  return {
    isSelf: false as const,
    user: {
      id: targetUser.id,
      name: targetUser.name,
      avatar: targetUser.avatar,
      username: targetUser.username,
    },
    profile: {
      bio: profile.bio,
      publicEmail: profile.publicEmail,
      publicPhone: profile.publicPhone,
      specializations: profile.specializations,
      serviceAreas: profile.serviceAreas,
      languages: profile.languages,
      certifications: profile.certifications,
      yearsExperience: profile.yearsExperience,
      socialLinks: profile.socialLinks as Record<string, string> | null,
      visibility: profile.visibility,
      contactFormEnabled: profile.contactFormEnabled,
    },
    showcaseProperties,
    connectionStatus,
    isIncomingRequest,
    connectionCount,
    presence: presence
      ? { status: presence.status as string, lastSeenAt: presence.lastSeenAt }
      : null,
  };
}

export type InAppAgentProfile = NonNullable<Awaited<ReturnType<typeof getInAppAgentProfile>>>;
