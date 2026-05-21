"use server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { decryptContactForOrg } from "@/lib/model-encryption";

export const getRecentClients = async (limit: number = 5) => {
  const organizationId = await getCurrentOrgIdSafe();

  if (!organizationId) {
    return [];
  }

  const data = await prismadb.contact.findMany({
    where: { organizationId },
    select: {
      id: true,
      friendlyId: true,
      displayName: true,
      email: true,
      status: true,
      createdAt: true,
      assignedAgentId: true,
      assignedAgent: {
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

  const decrypted = await Promise.all(
    data.map((c) => decryptContactForOrg(c, organizationId))
  );

  return decrypted.map((c) => ({
    id: c.id,
    friendlyId: c.friendlyId,
    name: c.displayName,
    email: c.email,
    status: c.status,
    createdAt: c.createdAt,
    assigned_to: c.assignedAgentId,
    assigned_to_user: c.assignedAgent,
  }));
};
