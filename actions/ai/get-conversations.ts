"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";

interface GetConversationsOptions {
  limit?: number;
  cursor?: string;
}

export async function getConversations(options: GetConversationsOptions = {}) {
  const { limit = 20, cursor } = options;
  
  const user = await getCurrentUser();
  const organizationId = await getCurrentOrgIdSafe();
  
  if (!user || !organizationId) {
    return [];
  }

  try {
    const conversations = await prismadb.aiConversation.findMany({
      where: {
        organizationId,
        userId: user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      select: {
        id: true,
        title: true,
        messages: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return conversations.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error("[GET_CONVERSATIONS]", error);
    return [];
  }
}
