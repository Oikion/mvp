import { prismadb } from "@/lib/prisma";

export const getAccountsCount = async () => {
  const data = await prismadb.clients.count();
  return data;
};
