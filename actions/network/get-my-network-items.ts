"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

export async function getMyNetworkItems() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return { properties: [], requests: [] };

  const [properties, requests] = await Promise.all([
    prismadb.properties.findMany({
      where: {
        organizationId: orgId,
        visibility: { in: ["SECURE", "PUBLIC"] },
      },
      select: {
        id: true,
        friendlyId: true,
        property_name: true,
        visibility: true,
        property_status: true,
        price: true,
        address_city: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prismadb.request.findMany({
      where: {
        organizationId: orgId,
        visibility: { in: ["SECURE", "PUBLIC"] },
      },
      select: {
        id: true,
        friendlyId: true,
        name: true,
        visibility: true,
        status: true,
        requestType: true,
        budgetMax: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  return { properties, requests };
}
