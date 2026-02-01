"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";

interface UpdateConversationInput {
  id: string;
  title?: string;
  messages?: Array<{
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    toolCallId?: string;
    toolCalls?: unknown;
  }>;
}

export async function updateConversation(input: UpdateConversationInput) {
  const user = await getCurrentUser();
  const organizationId = await getCurrentOrgIdSafe();
  
  if (!user || !organizationId) {
    throw new Error("Unauthorized");
  }

  try {
    // Verify ownership
    const existing = await prismadb.aiConversation.findFirst({
      where: {
        id: input.id,
        organizationId,
        userId: user.id,
      },
    });

    if (!existing) {
      throw new Error("Conversation not found");
    }

    const conversation = await prismadb.aiConversation.update({
      where: { id: input.id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.messages !== undefined && { messages: input.messages }),
      },
    });

    revalidatePath("/ai");

    return {
      id: conversation.id,
      title: conversation.title,
      messages: conversation.messages,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error("[UPDATE_CONVERSATION]", error);
    throw new Error("Failed to update conversation");
  }
}
