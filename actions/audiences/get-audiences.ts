"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

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
  const currentUser = await getCurrentUser();
  const organizationId = await getCurrentOrgId();

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
    createdBy: a.createdBy,
    memberCount: a._count.members,
    members: a.members,
  }));
}

/**
 * Get personal audiences only (created by user, no org)
 */
export async function getPersonalAudiences(): Promise<AudienceWithMembers[]> {
  const currentUser = await getCurrentUser();

  const audiences = await prismadb.audience.findMany({
    where: {
      createdById: currentUser.id,
      organizationId: null,
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
    createdBy: a.createdBy,
    memberCount: a._count.members,
    members: a.members,
  }));
}

/**
 * Get organization audiences only
 */
export async function getOrgAudiences(): Promise<AudienceWithMembers[]> {
  const organizationId = await getCurrentOrgId();

  const audiences = await prismadb.audience.findMany({
    where: {
      organizationId,
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
    createdBy: a.createdBy,
    memberCount: a._count.members,
    members: a.members,
  }));
}



