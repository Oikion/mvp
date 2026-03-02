"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { encryptAiConversationForOrg } from "@/lib/model-encryption";

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
    const encrypted = await encryptAiConversationForOrg({
      title: input.title || null,
      messages: input.messages as Prisma.JsonValue,
      context: input.context ? (input.context as Prisma.JsonValue) : null,
    }, organizationId);

    const conversation = await prismadb.aiConversation.create({
      data: {
        organizationId,
        userId: user.id,
        title: encrypted.title,
        messages: encrypted.messages as Prisma.InputJsonValue,
        context: (encrypted.context as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
      },
    });

    revalidatePath("/ai");

    // Return original plaintext values for immediate display
    return {
      id: conversation.id,
      title: input.title || null,
      messages: input.messages,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error("[CREATE_CONVERSATION]", error);
    throw new Error("Failed to create conversation");
  }
}
