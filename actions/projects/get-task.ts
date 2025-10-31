import { prismadb } from "@/lib/prisma";

export const getTask = async (taskId: string) => {
  const data = await prismadb.tasks.findFirst({
    where: {
      id: taskId,
    },
    include: {
      assigned_user: {
        select: {
          id: true,
          name: true,
        },
      },
      comments: {
        select: {
          id: true,
          comment: true,
          createdAt: true,
          assigned_user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
    },
  });
  return data;
};
