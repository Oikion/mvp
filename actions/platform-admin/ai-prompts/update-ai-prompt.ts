"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import type { AiSystemPrompt } from "@prisma/client";

export interface UpdateAiSystemPromptInput {
  id: string;
  displayName?: string;
  description?: string;
  category?: string;
  content?: string;
  variables?: Record<string, unknown>;
  isEnabled?: boolean;
}

export async function updateAiSystemPrompt(
  input: UpdateAiSystemPromptInput
): Promise<AiSystemPrompt> {
  const admin = await requirePlatformAdmin();

  const { id, ...updateData } = input;

  // Get the existing prompt
  const existing = await prismadb.aiSystemPrompt.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Prompt not found");
  }

  // If content is being updated, increment version and store previous version
  const versionUpdate =
    updateData.content && updateData.content !== existing.content
      ? {
          version: existing.version + 1,
          previousVersion: existing.id,
        }
      : {};

  return prismadb.aiSystemPrompt.update({
    where: { id },
    data: {
      ...updateData,
      ...versionUpdate,
      updatedById: admin.clerkId,
    },
  });
}
