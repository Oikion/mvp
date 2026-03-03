import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getRecentProperties = async (limit: number = 5) => {
  const organizationId = await getCurrentOrgIdSafe();
  
  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }
  
  const data = await prismadb.properties.findMany({
    where: { organizationId },
    select: {
      id: true,
      property_name: true,
      price: true,
      property_status: true,
      property_type: true,
      bedrooms: true,
      bathrooms: true,
      square_feet: true,
      address_city: true,
      createdAt: true,
      updatedAt: true,
      assigned_to: true,
      Users_Properties_assigned_toToUsers: { select: { name: true } },
      Documents: {
        select: { document_file_url: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  
  // Map to PropertyCard-compatible shape, serializing non-plain types explicitly
  return data.map((p) => ({
    id: p.id,
    property_name: p.property_name ?? "",
    price: p.price !== null && p.price !== undefined ? Number(p.price) : undefined,
    property_status: p.property_status ?? undefined,
    property_type: p.property_type ?? undefined,
    bedrooms: p.bedrooms ?? undefined,
    bathrooms: p.bathrooms ?? undefined,
    square_feet: p.square_feet ?? undefined,
    address_city: p.address_city ?? undefined,
    createdAt: p.createdAt?.toISOString(),
    updatedAt: p.updatedAt?.toISOString(),
    assigned_to_user: p.Users_Properties_assigned_toToUsers ?? undefined,
    linkedDocuments: p.Documents ?? [],
  }));
};

