"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import type { AiSystemPrompt } from "@prisma/client";

export async function toggleAiSystemPrompt(id: string): Promise<AiSystemPrompt> {
  const admin = await requirePlatformAdmin();

  const prompt = await prismadb.aiSystemPrompt.findUnique({
    where: { id },
  });

  if (!prompt) {
    throw new Error("Prompt not found");
  }

  return prismadb.aiSystemPrompt.update({
    where: { id },
    data: {
      isEnabled: !prompt.isEnabled,
      updatedById: admin.clerkId,
    },
  });
}
