import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getClient = async (clientId: string) => {
  const organizationId = await getCurrentOrgIdSafe();
  
  // Return null if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return null;
  }
  const data = await prismadb.clients.findFirst({
    where: { 
      id: clientId,
      organizationId,
    },
    include: {
      Users_Clients_assigned_toToUsers: { select: { name: true, id: true } },
      Client_Contacts: true,
    },
  });
  
  if (!data) {
    return null;
  }
  
  // Map to expected field names for backward compatibility
  const mappedData = {
    ...data,
    assigned_to_user: data.Users_Clients_assigned_toToUsers,
    contacts: data.Client_Contacts,
  };
  
  // Serialize to plain objects - converts Decimal to number, Date to string
  return JSON.parse(JSON.stringify(mappedData));
};


