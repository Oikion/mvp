import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";

export const getContactCount = async () => {
  const organizationId = await getCurrentOrgId();
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
