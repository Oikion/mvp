import { prismadb } from "@/lib/prisma";
import { getCacheStrategy } from "@/lib/prisma-cache";

export const getProperties = async () => {
  const client: any = prismadb as any;
  const delegate = client?.properties;
  if (!delegate) {
    return [] as any[];
  }
  const data = await delegate.findMany({
    include: {
      assigned_to_user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    ...getCacheStrategy(30, ["properties:list"]),
  });
  return data;
};


