import { prismadb } from "@/lib/prisma";

export const getClient = async (clientId: string) => {
  const data = await prismadb.clients.findUnique({
    where: { id: clientId },
    include: {
      assigned_to_user: { select: { name: true, id: true } },
      contacts: true,
    },
  });
  return data;
};


