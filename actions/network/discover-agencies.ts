"use server";

import { getCurrentUserSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const DEFAULT_PAGE_SIZE = 20;

export interface DiscoverAgencyItem {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  description: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  visibility: string;
}

export interface DiscoverAgenciesResult {
  agencies: DiscoverAgencyItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

/**
 * Discover PUBLIC agency profiles with optional search and location filters.
 */
export async function discoverAgencies(options: {
  cursor?: string | null;
  limit?: number;
  query?: string;
  city?: string;
  region?: string;
}): Promise<DiscoverAgenciesResult> {
  const currentUser = await getCurrentUserSafe();
  const isAuthenticated = !!currentUser;
  const limit = options.limit ?? DEFAULT_PAGE_SIZE;

  const where: Prisma.AgencyProfileWhereInput = {
    visibility: isAuthenticated ? { in: ["PUBLIC", "SECURE"] } : "PUBLIC",
  };

  if (options.query?.trim()) {
    const q = options.query.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { region: { contains: q, mode: "insensitive" } },
    ];
  }

  if (options.city?.trim()) {
    where.city = { contains: options.city.trim(), mode: "insensitive" };
  }

  if (options.region?.trim()) {
    where.region = { contains: options.region.trim(), mode: "insensitive" };
  }

  const take = limit + 1;

  const agenciesRaw = await prismadb.agencyProfile.findMany({
    where,
    take,
    orderBy: { updatedAt: "desc" },
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : undefined),
  });

  const hasMore = agenciesRaw.length > limit;
  const list = hasMore ? agenciesRaw.slice(0, limit) : agenciesRaw;
  const nextCursor = hasMore && list.length ? list.at(-1)?.id ?? null : null;

  const agencies: DiscoverAgencyItem[] = list.map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    logo: a.logo ?? null,
    description: a.description ?? null,
    city: a.city ?? null,
    region: a.region ?? null,
    country: a.country ?? null,
    visibility: a.visibility,
  }));

  return { agencies, hasMore, nextCursor };
}
