import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";

export const getProperty = async (propertyId: string) => {
  const organizationId = await getCurrentOrgId();
  const data = await prismadb.properties.findFirst({
    where: { 
      id: propertyId,
      organizationId,
    },
    include: {
      assigned_to_user: { select: { name: true, id: true } },
      contacts: true,
    },
  });
  return data;
};


