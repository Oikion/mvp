"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

export async function getMyNetworkItems() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return { properties: [], mandates: [] };

  const [properties, mandates] = await Promise.all([
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
    prismadb.mandate.findMany({
      where: {
        organizationId: orgId,
        visibility: { in: ["SECURE", "PUBLIC"] },
      },
      select: {
        id: true,
        friendlyId: true,
        title: true,
        visibility: true,
        status: true,
        transaction_type: true,
        budget_max: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  return { properties, mandates };
}
