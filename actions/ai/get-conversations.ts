"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { decryptAiConversationForOrg } from "@/lib/model-encryption";

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

    const results = [];
    for (const c of conversations) {
      try {
        const decrypted = await decryptAiConversationForOrg(c, organizationId);
        results.push({
          ...decrypted,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        });
      } catch (err) {
        console.error(`[GET_CONVERSATIONS] Failed to decrypt conversation ${c.id}:`, err);
      }
    }
    return results;
  } catch (error) {
    console.error("[GET_CONVERSATIONS]", error);
    return [];
  }
}
