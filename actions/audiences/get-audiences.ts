"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUserSafe, getCurrentOrgIdSafe } from "@/lib/get-current-user";

export interface AudienceWithMembers {
  id: string;
  name: string;
  description: string | null;
  organizationId: string | null;
  isAutoSync: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  memberCount: number;
  members: {
    id: string;
    userId: string;
    addedAt: Date;
    user: {
      id: string;
      name: string | null;
      email: string;
      avatar: string | null;
    };
  }[];
}

/**
 * Get all audiences accessible to the current user:
 * - Personal audiences created by the user
 * - Organization-level audiences in the user's org
 */
export async function getAudiences(): Promise<AudienceWithMembers[]> {
  const currentUser = await getCurrentUserSafe();
  const organizationId = await getCurrentOrgIdSafe();
  
  // Return empty array if no user context (e.g., session not synced yet)
  if (!currentUser) {
    return [];
  }

  const audiences = await prismadb.audience.findMany({
    where: {
      OR: [
        // Personal audiences created by this user
        { createdById: currentUser.id, organizationId: null },
        // Organization audiences (if user has an org)
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
    orderBy: { createdAt: "desc" },
  });

  return audiences.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    organizationId: a.organizationId,
    isAutoSync: a.isAutoSync,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    createdById: a.createdById,
    createdBy: a.Users,
    memberCount: a._count.AudienceMember,
    members: a.AudienceMember.map(m => ({ ...m, user: m.Users })),
  }));
}

/**
 * Get personal audiences only (created by user, no org)
 */
export async function getPersonalAudiences(): Promise<AudienceWithMembers[]> {
  const currentUser = await getCurrentUserSafe();
  
  // Return empty array if no user context (e.g., session not synced yet)
  if (!currentUser) {
    return [];
  }

  const audiences = await prismadb.audience.findMany({
    where: {
      createdById: currentUser.id,
      organizationId: null,
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
    orderBy: { createdAt: "desc" },
  });

  return audiences.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    organizationId: a.organizationId,
    isAutoSync: a.isAutoSync,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    createdById: a.createdById,
    createdBy: a.Users,
    memberCount: a._count.AudienceMember,
    members: a.AudienceMember.map(m => ({ ...m, user: m.Users })),
  }));
}

/**
 * Get organization audiences only
 */
export async function getOrgAudiences(): Promise<AudienceWithMembers[]> {
  const organizationId = await getCurrentOrgIdSafe();
  
  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }

  const audiences = await prismadb.audience.findMany({
    where: {
      organizationId,
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
    orderBy: { createdAt: "desc" },
  });

  return audiences.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    organizationId: a.organizationId,
    isAutoSync: a.isAutoSync,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    createdById: a.createdById,
    createdBy: a.Users,
    memberCount: a._count.AudienceMember,
    members: a.AudienceMember.map(m => ({ ...m, user: m.Users })),
  }));
}














