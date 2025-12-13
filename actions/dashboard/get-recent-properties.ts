import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { serializePrismaJson } from "@/lib/prisma-serialize";

export const getRecentProperties = async (limit: number = 5) => {
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
    take: limit,
  });
  // Serialize to plain objects - converts Decimal to number, Date to string
  return serializePrismaJson(data);
};

