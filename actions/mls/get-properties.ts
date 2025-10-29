import { prismadb } from "@/lib/prisma";

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
  });
  return data;
};


