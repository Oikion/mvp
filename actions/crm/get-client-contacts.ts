import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getClientContacts = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  
  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }
  const data = await prismadb.client_Contacts.findMany({
    where: {
      organizationId: organizationId,
    },
    include: {
      Users_Client_Contacts_assigned_toToUsers: {
        select: {
          name: true,
        },
      },
      Users_Client_Contacts_created_byToUsers: {
        select: {
          name: true,
        },
      },
      Clients: true,
    },
  });
  // Map to legacy fields expected by existing UI until refactor completes
  return data.map((p: any) => ({
    ...p,
    first_name: p.contact_first_name,
    last_name: p.contact_last_name,
    assigned_accounts: p.Clients,
    assigned_to_user: p.Users_Client_Contacts_assigned_toToUsers,
    created_by_user: p.Users_Client_Contacts_created_byToUsers,
  }));
};


