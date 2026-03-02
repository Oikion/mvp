"use server";

import { getCurrentUserSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const DEFAULT_PAGE_SIZE = 20;

export interface DiscoverAgentItem {
  id: string;
  userId: string;
  slug: string;
  name: string | null;
  avatar: string | null;
  username: string | null;
  bio: string | null;
  specializations: string[];
  serviceAreas: string[];
  visibility: string;
}

export interface DiscoverAgentsResult {
  agents: DiscoverAgentItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

/**
 * Discover PUBLIC agent profiles with optional search and filters.
 * Excludes current user and profiles with hideFromAgentSearch.
 */
export async function discoverAgents(options: {
  cursor?: string | null;
  limit?: number;
  query?: string;
  serviceAreas?: string[];
  specializations?: string[];
}): Promise<DiscoverAgentsResult> {
  const currentUser = await getCurrentUserSafe();
  const isAuthenticated = !!currentUser;
  const limit = options.limit ?? DEFAULT_PAGE_SIZE;

  const where: Prisma.AgentProfileWhereInput = {
    visibility: isAuthenticated ? { in: ["PUBLIC", "SECURE"] } : "PUBLIC",
    hideFromAgentSearch: false,
    Users: {
      username: { not: null },
    },
  };

  if (currentUser?.id) {
    where.userId = { not: currentUser.id };
  }

  if (options.query?.trim()) {
    const q = options.query.trim();
    where.OR = [
      { Users: { name: { contains: q, mode: "insensitive" } } },
      { Users: { username: { contains: q, mode: "insensitive" } } },
      { bio: { contains: q, mode: "insensitive" } },
      { serviceAreas: { hasSome: [q] } },
      { specializations: { hasSome: [q] } },
    ];
  }

  if (options.serviceAreas?.length) {
    where.serviceAreas = { hasSome: options.serviceAreas };
  }

  if (options.specializations?.length) {
    where.specializations = { hasSome: options.specializations };
  }

  const take = limit + 1;

  const profiles = await prismadb.agentProfile.findMany({
    where,
    take,
    orderBy: { updatedAt: "desc" },
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : undefined),
    include: {
      Users: {
        select: {
          id: true,
          name: true,
          avatar: true,
          username: true,
        },
      },
    },
  });

  const hasMore = profiles.length > limit;
  const list = hasMore ? profiles.slice(0, limit) : profiles;
  const nextCursor = hasMore && list.length ? list.at(-1)?.id ?? null : null;

  const agents: DiscoverAgentItem[] = list.map((p) => ({
    id: p.id,
    userId: p.Users?.id ?? "",
    slug: p.Users?.username ?? p.slug,
    name: p.Users?.name ?? null,
    avatar: p.Users?.avatar ?? null,
    username: p.Users?.username ?? null,
    bio: p.bio ?? null,
    specializations: p.specializations ?? [],
    serviceAreas: p.serviceAreas ?? [],
    visibility: p.visibility,
  }));

  return { agents, hasMore, nextCursor };
}
