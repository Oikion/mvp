import { prismadb } from "@/lib/prisma";

export const getProperty = async (propertyId: string) => {
  const data = await prismadb.properties.findUnique({
    where: { id: propertyId },
    include: {
      assigned_to_user: { select: { name: true, id: true } },
      contacts: true,
    },
  });
  return data;
};


