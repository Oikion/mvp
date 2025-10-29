import { prismadb } from "@/lib/prisma";

export const getContactCount = async () => {
  const data = await prismadb.client_Contacts.count();
  return data;
};
