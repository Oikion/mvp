"use server";

import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";

export interface ShareableItem {
  id: string;
  type: "property" | "client";
  title: string;
  subtitle?: string;
}

export async function getShareableItems(): Promise<{
  properties: ShareableItem[];
  clients: ShareableItem[];
}> {
  const orgId = await getCurrentOrgIdSafe();
  
  if (!orgId) {
    return { properties: [], clients: [] };
  }

  const prisma = prismaForOrg(orgId);

  try {
    // Fetch properties that can be shared
    const properties = await prisma.properties.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        property_name: true,
        municipality: true,
        area: true,
        price: true,
        property_type: true,
      },
    });

    // Fetch clients that can be shared (maybe with consent)
    const clients = await prisma.clients.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        client_name: true,
        intent: true,
        person_type: true,
      },
    });

    return {
      properties: properties.map((p) => ({
        id: p.id,
        type: "property" as const,
        title: p.property_name || "Unnamed Property",
        subtitle: [p.municipality, p.area].filter(Boolean).join(", ") || undefined,
      })),
      clients: clients.map((c) => ({
        id: c.id,
        type: "client" as const,
        title: c.client_name || "Unnamed Client",
        subtitle: c.intent || undefined,
      })),
    };
  } catch (error) {
    console.error("Error fetching shareable items:", error);
    return { properties: [], clients: [] };
  }
}




