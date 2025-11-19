import { prismadb } from "@/lib/prisma";

export const getContact = async (contactId: string) => {
  const data = await prismadb.client_Contacts.findFirst({
    where: {
      id: contactId,
    },
    include: {
      assigned_client: true,
    },
  });
  return data;
};
