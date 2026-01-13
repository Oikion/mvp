"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUserSafe, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import type { AudienceWithMembers } from "./get-audiences";

/**
 * Get a single audience by ID
 * Verifies the user has access to this audience
 */
export async function getAudience(audienceId: string): Promise<AudienceWithMembers | null> {
  const currentUser = await getCurrentUserSafe();
  const organizationId = await getCurrentOrgIdSafe();
  
  // Return null if no user context (e.g., session not synced yet)
  if (!currentUser) {
    return null;
  }

  const audience = await prismadb.audience.findFirst({
    where: {
      id: audienceId,
      OR: [
        // User created this personal audience
        { createdById: currentUser.id, organizationId: null },
        // It's an org audience the user belongs to
        ...(organizationId ? [{ organizationId }] : []),
      ],
    },
    include: {
      Users: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      AudienceMember: {
        include: {
          Users: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: { addedAt: "desc" },
      },
      _count: {
        select: { AudienceMember: true },
      },
    },
  });

  if (!audience) return null;

  return {
    id: audience.id,
    name: audience.name,
    description: audience.description,
    organizationId: audience.organizationId,
    isAutoSync: audience.isAutoSync,
    createdAt: audience.createdAt,
    updatedAt: audience.updatedAt,
    createdById: audience.createdById,
    createdBy: audience.Users,
    memberCount: audience._count.AudienceMember,
    members: audience.AudienceMember.map(m => ({ ...m, user: m.Users })),
  };
}














