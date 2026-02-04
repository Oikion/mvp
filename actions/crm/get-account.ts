import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getAccount = async (accountId: string) => {
  const organizationId = await getCurrentOrgIdSafe();
  
  // Return null if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return null;
  }
  const data = await prismadb.clients.findFirst({
    where: {
      id: accountId,
      organizationId,
    },
    include: {
      Client_Contacts: true,
      Users_Clients_assigned_toToUsers: {
        select: {
          name: true,
        },
      },
    },
  });
  
  if (!data) return null;
  
  // Map to expected field names for backward compatibility
  return {
    ...data,
    contacts: data.Client_Contacts,
    assigned_to_user: data.Users_Clients_assigned_toToUsers,
  };
};
