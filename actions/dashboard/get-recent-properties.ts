import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { serializePrismaJson } from "@/lib/prisma-serialize";

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
  
  // Map to consistent format and serialize
  const mapped = data.map((p) => ({
    id: p.id,
    name: p.property_name,
    price: p.price,
    status: p.property_status,
    property_type: p.property_type,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    square_feet: p.square_feet,
    address_city: p.address_city,
    createdAt: p.createdAt,
    assigned_to: p.assigned_to,
    assigned_to_user: p.Users_Properties_assigned_toToUsers,
    image_url: p.Documents?.[0]?.document_file_url || null,
  }));
  
  return serializePrismaJson(mapped);
};

