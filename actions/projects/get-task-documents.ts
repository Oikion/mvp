import { prismadb } from "@/lib/prisma";
import { getCacheStrategy } from "@/lib/prisma-cache";

export const getTaskDocuments = async (taskId: string) => {
  const data = await prismadb.documents.findMany({
    where: {
      tasksIDs: {
        has: taskId,
      },
    },
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
    ...getCacheStrategy(30, ["documents:list", `task:${taskId}`]),
  });
  /*   const data = await prismadb.tasks.findMany({
    where: {
      documents: {
        some: {
          id: taskId,
        },
      },
    },
  }); */
  return data;
};
