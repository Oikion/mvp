"use server";

import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";
import { decryptContactForOrg } from "@/lib/model-encryption";

export interface ShareableItem {
  id: string;
  type: "property" | "contact";
  title: string;
  subtitle?: string;
}

export async function getShareableItems(): Promise<{
  properties: ShareableItem[];
  contacts: ShareableItem[];
}> {
  const orgId = await getCurrentOrgIdSafe();

  if (!orgId) {
    return { properties: [], contacts: [] };
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

    // Fetch contacts that can be shared (maybe with consent)
    const clients = await prisma.contact.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        displayName: true,
        status: true,
      },
    });

    return {
      properties: properties.map((p) => ({
        id: p.id,
        type: "property" as const,
        title: p.property_name || "Unnamed Property",
        subtitle: [p.municipality, p.area].filter(Boolean).join(", ") || undefined,
      })),
      contacts: await Promise.all(
        clients.map(async (c) => {
          const decrypted = await decryptContactForOrg(c, orgId);
          return {
            id: decrypted.id,
            type: "contact" as const,
            title: decrypted.displayName || "Unnamed Contact",
            subtitle: decrypted.status || undefined,
          };
        })
      ),
    };
  } catch (error) {
    console.error("Error fetching shareable items:", error);
    return { properties: [], contacts: [] };
  }
}















