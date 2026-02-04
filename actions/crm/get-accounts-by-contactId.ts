import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getAccountsByContactId = async (contactId: string) => {
  const organizationId = await getCurrentOrgIdSafe();
  
  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }
  const data = await prismadb.clients.findMany({
    where: {
      organizationId,
      Client_Contacts: {
        some: {
          id: contactId,
        },
      },
    },
    include: {
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
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  
  // Map to expected field names for backward compatibility
  return data.map((client) => ({
    ...client,
    assigned_to_user: client.Users_Clients_assigned_toToUsers,
    contacts: client.Client_Contacts,
  }));
};
