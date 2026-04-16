import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getContacts = async () => {
  const organizationId = await getCurrentOrgIdSafe();

  if (!organizationId) {
    return [];
  }

  const data = await prismadb.contact.findMany({
    where: {
      organizationId,
    },
    include: {
      assignedAgent: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return data;
};

