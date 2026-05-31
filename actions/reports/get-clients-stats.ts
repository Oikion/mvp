"use server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getClientsCount = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return 0;

  const count = await prismadb.contact.count({
    where: { organizationId },
  });
  return count;
};

export const getClientsByStatus = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const grouped = await prismadb.contact.groupBy({
    by: ["status"],
    where: { organizationId },
    _count: { id: true },
  });

  const statusMap = Object.fromEntries(
    grouped.map((g: any) => [g.status ?? "LEAD", g._count.id])
  );

  const ALL_STATUSES = ["LEAD", "ACTIVE", "INACTIVE", "CONVERTED", "LOST"];
  return ALL_STATUSES.map((status) => ({
    name: status,
    value: (statusMap[status] as number) ?? 0,
  }));
};

export const getClientsByMonth = async () => {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  type MonthRow = { year: number; month: number; count: bigint };
  const rows = await prismadb.$queryRaw<MonthRow[]>`
    SELECT
      EXTRACT(YEAR FROM "createdAt")::int AS year,
      EXTRACT(MONTH FROM "createdAt")::int AS month,
      COUNT(*)::bigint AS count
    FROM contacts
    WHERE "organizationId" = ${organizationId}
    GROUP BY year, month
    ORDER BY year, month
  `;

  return rows.map((r) => ({
    year: r.year,
    month: r.month,
    name: `${r.month}/${r.year}`,
    Number: Number(r.count),
  }));
};

export const getClientsByMonthAndYear = async (year: number) => {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  type YearMonthRow = { month: string; count: bigint };
  const rows = await prismadb.$queryRaw<YearMonthRow[]>`
    SELECT
      TO_CHAR("createdAt", 'FMMonth') AS month,
      COUNT(*)::bigint AS count
    FROM contacts
    WHERE "organizationId" = ${organizationId}
      AND EXTRACT(YEAR FROM "createdAt") = ${year}
    GROUP BY TO_CHAR("createdAt", 'FMMonth'), EXTRACT(MONTH FROM "createdAt")
    ORDER BY EXTRACT(MONTH FROM "createdAt")
  `;

  return rows.map((r) => ({
    name: r.month.trim(),
    Number: Number(r.count),
  }));
};
