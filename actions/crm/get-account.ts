import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";

export const getAccount = async (accountId: string) => {
  const organizationId = await getCurrentOrgId();
  const data = await prismadb.clients.findFirst({
    where: {
      id: accountId,
      organizationId,
    },
    include: {
      contacts: true,
      assigned_to_user: {
        select: {
          name: true,
        },
      },
    },
  });
  return data;
};
