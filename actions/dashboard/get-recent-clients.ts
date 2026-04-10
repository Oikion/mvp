"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptContactForOrg } from "@/lib/model-encryption";
import { serializePrisma } from "@/lib/prisma-serialize";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";

export async function getRecentClients(limit = 5): Promise<ActionResponse> {
  const guard = await requireAction("contact:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  try {
    const contacts = await prismadb.contact.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        friendlyId: true,
        displayName: true,
        email: true,
        status: true,
        createdAt: true,
        assignedAgentId: true,
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    const decrypted = await Promise.all(
      contacts.map((c) => decryptContactForOrg(c, organizationId))
    );

    const result = decrypted.map((c) => ({
      id: c.id,
      friendlyId: c.friendlyId,
      name: c.displayName,
      email: c.email,
      status: c.status,
      createdAt: c.createdAt,
      assigned_to: c.assignedAgentId,
      assigned_to_user: c.assignedAgent,
    }));

    return actionSuccess(serializePrisma(result));
  } catch (error) {
    console.error("[GET_RECENT_CONTACTS]", error);
    return actionError("Failed to fetch recent contacts", error as Error);
  }
}
