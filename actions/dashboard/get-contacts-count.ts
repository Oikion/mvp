import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getContactCount = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return 0;

  const data = await prismadb.contact.count({
    where: { organizationId },
  });
  return data;
};
