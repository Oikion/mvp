import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import dayjs from "dayjs";

export const getTasksPastDue = async () => {
  const user = await getCurrentUser();
  const today = dayjs().startOf("day");
  const nextWeek = dayjs().add(7, "day").startOf("day");
  
  const getTaskPastDue = await prismadb.tasks.findMany({
    where: {
      AND: [
        {
          user: user.id,
        },
        {
          dueDateAt: {
            lte: new Date(),
          },
        },
        {
          taskStatus: {
            not: "COMPLETE",
          },
        },
      ],
    },
    include: {
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
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  const getTaskPastDueInSevenDays = await prismadb.tasks.findMany({
    where: {
      AND: [
        {
          user: user.id,
        },
        {
          dueDateAt: {
            //lte: dayjs().add(7, "day").toDate(),
            gt: today.toDate(), // Due date is greater than or equal to today
            lt: nextWeek.toDate(), // Due date is less than next week (not including today)
          },
        },
        {
          taskStatus: {
            not: "COMPLETE",
          },
        },
      ],
    },
    include: {
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
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  const data = {
    getTaskPastDue,
    getTaskPastDueInSevenDays,
  };

  return data;
};
