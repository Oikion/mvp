import { prismadb } from "@/lib/prisma";

export const getContactsByAccountId = async (accountId: string) => {
  const data = await prismadb.client_Contacts.findMany({
    where: {
      clientsIDs: accountId,
    },
    include: {
      assigned_to_user: {
        select: {
          name: true,
        },
      },
      crate_by_user: {
        select: {
          name: true,
        },
      },
      assigned_client: true,
    },
  });
  return data;
};
