import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptClientForOrg } from "@/lib/model-encryption";

export const getClient = async (clientId: string) => {
  // Check permission to read clients
  const guard = await requireAction("client:read");
  if (guard) return null;

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

  const decryptedData = await decryptClientForOrg(data, organizationId);

  // Map to expected field names for backward compatibility
  const mappedData = {
    ...decryptedData,
    assigned_to_user: decryptedData.Users_Clients_assigned_toToUsers,
    // NOTE: Client_Contacts fields are not encrypted — if contact fields are
    // ever encrypted at write time, add decryptContact() calls here.
    contacts: decryptedData.Client_Contacts,
  };
  
  // Serialize to plain objects - converts Decimal to number, Date to string
  return JSON.parse(JSON.stringify(mappedData));
};


