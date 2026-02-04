import { prismadb } from "@/lib/prisma";

export const getUserCRMTasks = async (userId: string) => {
  const data = await prismadb.crm_Accounts_Tasks.findMany({
    where: {
      user: userId,
    },
    include: {
      Users: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Map to expected interface shape
  return data.map(task => ({
    ...task,
    assigned_user: task.Users,
  }));
};
