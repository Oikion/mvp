import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

/**
 * Get properties that are published (portal_visibility = PUBLIC)
 * These are the listings that have been made available on external portals
 */
export const getListings = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  
  // Return empty array if no organization context
  if (!organizationId) {
    return [];
  }
  
  const data = await prismadb.properties.findMany({
    where: { 
      organizationId,
      portal_visibility: "PUBLIC",
    },
    include: {
      Users_Properties_assigned_toToUsers: { select: { name: true } },
      Documents: {
        where: {
          document_file_mimeType: {
            startsWith: "image/",
          },
        },
        select: {
          document_file_url: true,
        },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
  
  // Map to expected field names for backward compatibility
  const mappedData = data.map((p: Record<string, unknown>) => ({
    ...p,
    assigned_to_user: p.Users_Properties_assigned_toToUsers,
    linkedDocuments: p.Documents,
  }));
  
  // Serialize to plain objects - converts Decimal to number, Date to string
  return JSON.parse(JSON.stringify(mappedData));
};
