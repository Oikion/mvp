import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";

export const getClientsCount = async () => {
  const organizationId = await getCurrentOrgId();
  const count = await prismadb.clients.count({
    where: { organizationId },
  });
  return count;
};

export const getClientsByStatus = async () => {
  const organizationId = await getCurrentOrgId();
  const clients = await prismadb.clients.findMany({
    where: { organizationId },
    select: {
      client_status: true,
    },
  });

  const statusCounts = clients.reduce((acc: any, client: any) => {
    const status = client.client_status || "LEAD";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Ensure all statuses are present so charts render even with zero counts
  const ALL_STATUSES = [
    "LEAD",
    "ACTIVE",
    "INACTIVE",
    "CONVERTED",
    "LOST",
  ];

  return ALL_STATUSES.map((status) => ({
    name: status,
    value: statusCounts[status] || 0,
  }));
};

export const getClientsByMonth = async () => {
  const organizationId = await getCurrentOrgId();
  const clients = await prismadb.clients.findMany({
    where: { organizationId },
    select: {
      createdAt: true,
    },
  });

  if (!clients || clients.length === 0) {
    return [];
  }

  const clientsByMonth = clients.reduce((acc: any, client: any) => {
    const date = new Date(client.createdAt);
    const yearMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;
    acc[yearMonth] = (acc[yearMonth] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.keys(clientsByMonth)
    .sort()
    .map((yearMonth: any) => {
      const [year, month] = yearMonth.split("-");
      return {
        year: parseInt(year),
        month: parseInt(month),
        name: `${month}/${year}`,
        Number: clientsByMonth[yearMonth],
      };
    });

  return chartData;
};

export const getClientsByMonthAndYear = async (year: number) => {
  const organizationId = await getCurrentOrgId();
  const clients = await prismadb.clients.findMany({
    where: { organizationId },
    select: {
      createdAt: true,
    },
  });

  if (!clients || clients.length === 0) {
    return [];
  }

  const clientsByMonth = clients.reduce((acc: any, client: any) => {
    const yearCreated = new Date(client.createdAt).getFullYear();
    const month = new Date(client.createdAt).toLocaleString("default", {
      month: "long",
    });

    if (yearCreated === year) {
      acc[month] = (acc[month] || 0) + 1;
    }

    return acc;
  }, {});

  const chartData = Object.keys(clientsByMonth).map((month: any) => {
    return {
      name: month,
      Number: clientsByMonth[month],
    };
  });

  return chartData;
};

