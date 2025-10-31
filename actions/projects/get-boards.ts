import { prismadb } from "@/lib/prisma";

export const getBoards = async (userId: string) => {
  if (!userId) {
    return null;
  }
  const data = await prismadb.boards.findMany({
    where: {
      OR: [
        {
          user: userId,
        },
        {
          visibility: "public",
        },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      visibility: true,
      updatedAt: true,
      createdAt: true,
      assigned_user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 100, // Add reasonable limit to prevent over-fetching
  });
  return data;
};
