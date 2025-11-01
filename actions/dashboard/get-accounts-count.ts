import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";

export const getAccountsCount = async () => {
  const organizationId = await getCurrentOrgId();
  const data = await prismadb.clients.count({
    where: { organizationId },
  });
  return data;
};
