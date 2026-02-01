"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import type { AiSystemPrompt } from "@prisma/client";

export interface CreateAiSystemPromptInput {
  name: string;
  displayName: string;
  description?: string;
  category: string;
  content: string;
  locale?: string;
  variables?: Record<string, unknown>;
  isEnabled?: boolean;
  isSystemPrompt?: boolean;
}

export async function createAiSystemPrompt(
  input: CreateAiSystemPromptInput
): Promise<AiSystemPrompt> {
  const admin = await requirePlatformAdmin();

  const {
    name,
    displayName,
    description,
    category,
    content,
    locale = "en",
    variables,
    isEnabled = true,
    isSystemPrompt = false,
  } = input;

  // Validate name format (snake_case)
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error(
      "Name must be in snake_case format (lowercase letters, numbers, and underscores)"
    );
  }

  // Check if prompt with same name and locale already exists
  const existing = await prismadb.aiSystemPrompt.findFirst({
    where: { name, locale },
  });

  if (existing) {
    throw new Error(
      `A prompt with name "${name}" already exists for locale "${locale}"`
    );
  }

  return prismadb.aiSystemPrompt.create({
    data: {
      name,
      displayName,
      description,
      category,
      content,
      locale,
      variables: variables || null,
      isEnabled,
      isSystemPrompt,
      createdById: admin.clerkId,
    },
  });
}
