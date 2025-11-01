import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";

export const getProperties = async () => {
  const organizationId = await getCurrentOrgId();
  const client: any = prismadb as any;
  const delegate = client?.properties;
  if (!delegate) {
    return [] as any[];
  }
  const data = await delegate.findMany({
    where: { organizationId },
    include: {
      assigned_to_user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return data;
};


