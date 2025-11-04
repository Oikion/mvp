import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";

export const getRecentClients = async (limit: number = 5) => {
  const organizationId = await getCurrentOrgId();
  const data = await prismadb.clients.findMany({
    where: { organizationId },
    select: {
      id: true,
      client_name: true,
      primary_email: true,
      client_status: true,
      createdAt: true,
      assigned_to: true,
      assigned_to_user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
  // Map to consistent format
  return data.map((c: any) => ({
    ...c,
    name: c.client_name,
    email: c.primary_email,
    status: c.client_status,
  }));
};

