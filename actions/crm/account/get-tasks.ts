import { prismadb } from "@/lib/prisma";

export const getAccountsTasks = async (accountId: string) => {
  const data = await prismadb.crm_Accounts_Tasks.findMany({
    where: {
      account: accountId,
    },
    include: {
      Users: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  
  // Map to expected interface shape
  return data.map(task => ({
    ...task,
    assigned_user: task.Users,
  }));
};
