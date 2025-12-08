import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getContactCount = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return 0;
  
  // Filter contacts through their associated client's organizationId
  const data = await prismadb.client_Contacts.count({
    where: {
      assigned_client: {
        organizationId,
      },
    },
  });
  return data;
};
