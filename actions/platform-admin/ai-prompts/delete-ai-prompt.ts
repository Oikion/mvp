"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export async function deleteAiSystemPrompt(id: string): Promise<void> {
  await requirePlatformAdmin();

  // Get the prompt first
  const prompt = await prismadb.aiSystemPrompt.findUnique({
    where: { id },
  });

  if (!prompt) {
    throw new Error("Prompt not found");
  }

  // Prevent deletion of system prompts
  if (prompt.isSystemPrompt) {
    throw new Error("Cannot delete system prompts. You can disable them instead.");
  }

  await prismadb.aiSystemPrompt.delete({
    where: { id },
  });
}
