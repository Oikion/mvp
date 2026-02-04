"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

interface CreateConversationInput {
  title?: string;
  messages: Array<{
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    toolCallId?: string;
    toolCalls?: unknown;
  }>;
  context?: Record<string, unknown>;
}

export async function createConversation(input: CreateConversationInput) {
  const user = await getCurrentUser();
  const organizationId = await getCurrentOrgIdSafe();
  
  if (!user || !organizationId) {
    throw new Error("Unauthorized");
  }

  try {
    const conversation = await prismadb.aiConversation.create({
      data: {
        organizationId,
        userId: user.id,
        title: input.title || null,
        messages: input.messages as Prisma.InputJsonValue,
        context: input.context ? (input.context as Prisma.InputJsonValue) : Prisma.JsonNull,
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
    console.error("[CREATE_CONVERSATION]", error);
    throw new Error("Failed to create conversation");
  }
}
