import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getProperties = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  
  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }
  const client: any = prismadb as any;
  const delegate = client?.properties;
  if (!delegate) {
    return [] as any[];
  }
  const data = await delegate.findMany({
    where: { organizationId },
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


