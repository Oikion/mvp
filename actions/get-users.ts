import { prismadb } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

import { getCurrentUser } from "@/lib/get-current-user";

//Get all users  for admin module
export const getUsers = async () => {
  const { userId } = await auth();
  if (!userId) return [];

  const currentUser = await getCurrentUser();
  if (!currentUser?.is_admin) {
    throw new Error("Forbidden");
  }

  const data = await prismadb.users.findMany({
    orderBy: {
      created_on: "desc",
    },
  });
  return data;
};

//Get active users for Selects in app etc
export const getActiveUsers = async () => {
  const { userId } = await auth();
  if (!userId) return [];

  const data = await prismadb.users.findMany({
    where: {
      userStatus: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
    orderBy: {
      created_on: "desc",
    },
  });
  return data;
};

//Get new users by month for chart
export const getUsersByMonthAndYear = async (year: number) => {
  const { userId } = await auth();
  if (!userId) return {};

  const users = await prismadb.users.findMany({
    select: {
      created_on: true,
    },
  });

  if (!users) {
    return {};
  }

  const usersByMonth = users.reduce((acc: any, user: any) => {
    const yearCreated = new Date(user.created_on).getFullYear();
    const month = new Date(user.created_on).toLocaleString("default", {
      month: "long",
    });

    if (yearCreated === year) {
      acc[month] = (acc[month] || 0) + 1;
    }

    return acc;
  }, {});

  const chartData = Object.keys(usersByMonth).map((month: any) => {
    return {
      name: month,
      Number: usersByMonth[month],
    };
  });

  return chartData;
};

//Get new users by month for chart
export const getUsersByMonth = async () => {
  const { userId } = await auth();
  if (!userId) return {};

  const users = await prismadb.users.findMany({
    select: {
      created_on: true,
    },
  });

  if (!users) {
    return {};
  }

  const usersByMonth = users.reduce((acc: any, user: any) => {
    const month = new Date(user.created_on).toLocaleString("default", {
      month: "long",
    });

    acc[month] = (acc[month] || 0) + 1;

    return acc;
  }, {});

  const chartData = Object.keys(usersByMonth).map((month: any) => {
    return {
      name: month,
      Number: usersByMonth[month],
    };
  });

  return chartData;
};

export const getUsersCountOverall = async () => {
  const { userId } = await auth();
  if (!userId) return [];

  const users = await prismadb.users.findMany({
    select: {
      created_on: true,
    },
  });

  if (!users) {
    return {};
  }

  const usersByMonth = users.reduce((acc: any, user: any) => {
    const date = new Date(user.created_on);
    const yearMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;

    acc[yearMonth] = (acc[yearMonth] || 0) + 1;

    return acc;
  }, {});

  const chartData = Object.keys(usersByMonth).map((yearMonth: any) => {
    const [year, month] = yearMonth.split("-");
    return {
      year: parseInt(year),
      month: parseInt(month),
      name: `${month}/${year}`,
      Number: usersByMonth[yearMonth],
    };
  });

  return chartData;
};
