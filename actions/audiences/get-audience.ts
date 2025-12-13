"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import type { AudienceWithMembers } from "./get-audiences";

/**
 * Get a single audience by ID
 * Verifies the user has access to this audience
 */
export async function getAudience(audienceId: string): Promise<AudienceWithMembers | null> {
  const currentUser = await getCurrentUser();
  const organizationId = await getCurrentOrgId();

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
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      members: {
        include: {
          user: {
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
        select: { members: true },
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
    createdBy: audience.createdBy,
    memberCount: audience._count.members,
    members: audience.members,
  };
}






