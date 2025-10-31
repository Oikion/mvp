import { prismadb } from "@/lib/prisma";
import { getCacheStrategy } from "@/lib/prisma-cache";

export const getDocuments = async () => {
  const data = await prismadb.documents.findMany({
    include: {
      created_by: {
        select: {
          name: true,
        },
      },
      assigned_to_user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      date_created: "desc",
    },
    ...getCacheStrategy(30, ["documents:list"]),
  });
  return data;
};
