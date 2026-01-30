import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getPropertiesCount = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return 0;
  
  const count = await prismadb.properties.count({
    where: { organizationId },
  });
  return count;
};

export const getPropertiesByStatus = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];
  
  const properties = await prismadb.properties.findMany({
    where: { organizationId },
    select: {
      property_status: true,
    },
  });

  const statusCounts = properties.reduce((acc: any, property: any) => {
    const status = property.property_status || "ACTIVE";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Ensure all statuses are present so charts render even with zero counts
  const ALL_STATUSES = [
    "ACTIVE",
    "PENDING",
    "SOLD",
    "OFF_MARKET",
    "WITHDRAWN",
  ];

  return ALL_STATUSES.map((status) => {
    const count = statusCounts[status] || 0;
    return {
      name: status,
      value: typeof count === 'number' && !Number.isNaN(count) ? count : 0,
    };
  });
};

export const getPropertiesByMonth = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];
  
  const properties = await prismadb.properties.findMany({
    where: { organizationId },
    select: {
      createdAt: true,
    },
  });

  if (!properties || properties.length === 0) {
    return [];
  }

  const propertiesByMonth = properties.reduce((acc: any, property: any) => {
    const date = new Date(property.createdAt);
    const yearMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;
    acc[yearMonth] = (acc[yearMonth] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.keys(propertiesByMonth)
    .sort()
    .map((yearMonth: any) => {
      const [year, month] = yearMonth.split("-");
      return {
        year: parseInt(year),
        month: parseInt(month),
        name: `${month}/${year}`,
        Number: propertiesByMonth[yearMonth],
      };
    });

  return chartData;
};

export const getPropertiesByMonthAndYear = async (year: number) => {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];
  
  const properties = await prismadb.properties.findMany({
    where: { organizationId },
    select: {
      createdAt: true,
    },
  });

  if (!properties || properties.length === 0) {
    return [];
  }

  const propertiesByMonth = properties.reduce((acc: any, property: any) => {
    const yearCreated = new Date(property.createdAt).getFullYear();
    const month = new Date(property.createdAt).toLocaleString("default", {
      month: "long",
    });

    if (yearCreated === year) {
      acc[month] = (acc[month] || 0) + 1;
    }

    return acc;
  }, {});

  const chartData = Object.keys(propertiesByMonth).map((month: any) => {
    return {
      name: month,
      Number: propertiesByMonth[month],
    };
  });

  return chartData;
};

