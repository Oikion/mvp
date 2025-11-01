import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";

export const getClient = async (clientId: string) => {
  const organizationId = await getCurrentOrgId();
  const data = await prismadb.clients.findFirst({
    where: { 
      id: clientId,
      organizationId,
    },
    include: {
      assigned_to_user: { select: { name: true, id: true } },
      contacts: true,
    },
  });
  return data;
};


