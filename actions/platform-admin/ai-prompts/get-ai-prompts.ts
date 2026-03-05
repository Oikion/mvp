"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import type { AiSystemPrompt } from "@prisma/client";

export interface GetAiSystemPromptsParams {
  category?: string;
  locale?: string;
  isEnabled?: boolean;
  search?: string;
}

export async function getAiSystemPrompts(
  params: GetAiSystemPromptsParams = {}
): Promise<AiSystemPrompt[]> {
  await requirePlatformAdmin();

  const { category, locale, isEnabled, search } = params;

  const where: Record<string, unknown> = {};

  if (category) {
    where.category = category;
  }

  if (locale) {
    where.locale = locale;
  }

  if (isEnabled !== undefined) {
    where.isEnabled = isEnabled;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { displayName: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  return prismadb.aiSystemPrompt.findMany({
    where,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getAiSystemPromptById(
  id: string
): Promise<AiSystemPrompt | null> {
  await requirePlatformAdmin();

  return prismadb.aiSystemPrompt.findUnique({
    where: { id },
  });
}

export async function getAiSystemPromptByName(
  name: string,
  locale: string = "en"
): Promise<AiSystemPrompt | null> {
  // This function doesn't require platform admin - it's used by the AI system
  return prismadb.aiSystemPrompt.findFirst({
    where: {
      name,
      locale,
      isEnabled: true,
    },
  });
}

/**
 * Get a prompt by name with locale fallback
 * If the prompt is not found for the specified locale, falls back to English
 */
export async function getAiSystemPromptWithFallback(
  name: string,
  locale: string = "en"
): Promise<AiSystemPrompt | null> {
  // Try the specified locale first
  let prompt = await prismadb.aiSystemPrompt.findFirst({
    where: {
      name,
      locale,
      isEnabled: true,
    },
  });

  // Fall back to English if not found and locale wasn't English
  if (!prompt && locale !== "en") {
    prompt = await prismadb.aiSystemPrompt.findFirst({
      where: {
        name,
        locale: "en",
        isEnabled: true,
      },
    });
  }

  return prompt;
}

/**
 * Get all unique categories for filtering
 */
export async function getPromptCategories(): Promise<string[]> {
  await requirePlatformAdmin();

  const categories = await prismadb.aiSystemPrompt.groupBy({
    by: ["category"],
    orderBy: { category: "asc" },
  });

  return categories.map((c) => c.category);
}
