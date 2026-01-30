"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { canPerformAction, getActionPermissionContext, getActionPermissionLevel } from "@/lib/permissions";

export const getProperties = async () => {
  // Permission check: Users need property:read permission
  const permCheck = await canPerformAction("property:read");
  if (!permCheck.allowed && !permCheck.requiresOwnership) {
    return [];
  }
  
  const organizationId = await getCurrentOrgIdSafe();
  
  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }
  
  // Check if user can view all properties or only their own
  const userContext = await getActionPermissionContext();
  if (!userContext) {
    return [];
  }
  const permissionLevel = await getActionPermissionLevel("property:read");
  const canViewAll = permissionLevel === "all";
  
  const data = await prismadb.properties.findMany({
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


