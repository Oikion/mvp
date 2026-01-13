import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getClients = async () => {
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
      Client_Contacts: {
        select: {
          contact_first_name: true,
          contact_last_name: true,
        },
        take: 10, // Limit contacts per client to reduce data transfer
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 500, // Add reasonable limit to prevent over-fetching
  });
  // Map to legacy fields expected by existing UI until refactor completes
  return data.map((c) => ({
    ...c,
    name: c.client_name,
    email: c.primary_email,
    status: c.client_status === "ACTIVE" ? "Active" : "IN_PROGRESS",
    assigned_to_user: c.Users_Clients_assigned_toToUsers,
    contacts: (c.Client_Contacts || []).map((p) => ({
      ...p,
      first_name: p.contact_first_name,
      last_name: p.contact_last_name,
    })),
  }));
};


