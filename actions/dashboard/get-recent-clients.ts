import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getRecentClients = async (limit: number = 5) => {
  const organizationId = await getCurrentOrgIdSafe();
  
  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }
  
  const data = await prismadb.clients.findMany({
    where: { organizationId },
    select: {
      id: true,
      client_name: true,
      primary_email: true,
      client_status: true,
      createdAt: true,
      assigned_to: true,
      Users_Clients_assigned_toToUsers: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
  // Map to consistent format
  return data.map((c) => ({
    id: c.id,
    name: c.client_name,
    email: c.primary_email,
    status: c.client_status,
    createdAt: c.createdAt,
    assigned_to: c.assigned_to,
    assigned_to_user: c.Users_Clients_assigned_toToUsers,
  }));
};

