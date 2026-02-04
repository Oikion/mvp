import { prismadb } from "@/lib/prisma";

export const getCrMTask = async (taskId: string) => {
  const data = await prismadb.crm_Accounts_Tasks.findFirst({
    where: {
      id: taskId,
    },
    include: {
      Users: {
        select: {
          id: true,
          name: true,
        },
      },
      crm_Accounts_Tasks_Comments: {
        select: {
          id: true,
          comment: true,
          createdAt: true,
          Users: {
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
  
  if (!data) return null;
  
  // Map to expected interface shape
  return {
    ...data,
    assigned_user: data.Users,
    comments: data.crm_Accounts_Tasks_Comments.map(c => ({
      ...c,
      assigned_user: c.Users,
    })),
  };
};
