import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";

export const getAccountsByContactId = async (contactId: string) => {
  const organizationId = await getCurrentOrgId();
  const data = await prismadb.clients.findMany({
    where: {
      organizationId,
      contacts: {
        some: {
          id: contactId,
        },
      },
    },
    include: {
      assigned_to_user: {
        select: {
          name: true,
        },
      },
      contacts: {
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
  return data;
};
