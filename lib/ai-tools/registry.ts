/**
 * AI Tools Registry
 * 
 * Loads and caches enabled tools from the database
 */

import { prismadb } from "@/lib/prisma";
import type { AiTool } from "@prisma/client";
import { unstable_cache } from "next/cache";

// Cache tag for tools registry
export const TOOLS_CACHE_TAG = "ai-tools-registry";

/**
 * Get all enabled AI tools
 * Cached for 60 seconds with automatic revalidation
 */
export const getEnabledTools = unstable_cache(
  async (): Promise<AiTool[]> => {
    return prismadb.aiTool.findMany({
      where: { isEnabled: true },
      orderBy: [{ category: "asc" }, { displayName: "asc" }],
    });
  },
  ["ai-tools-enabled"],
  {
    revalidate: 60, // Revalidate every 60 seconds
    tags: [TOOLS_CACHE_TAG],
  }
);

/**
 * Get enabled tools by category
 */
export const getEnabledToolsByCategory = unstable_cache(
  async (category: string): Promise<AiTool[]> => {
    return prismadb.aiTool.findMany({
      where: { isEnabled: true, category },
      orderBy: { displayName: "asc" },
    });
  },
  ["ai-tools-by-category"],
  {
    revalidate: 60,
    tags: [TOOLS_CACHE_TAG],
  }
);

/**
 * Get a tool by name
 */
export async function getToolByName(name: string): Promise<AiTool | null> {
  return prismadb.aiTool.findUnique({
    where: { name },
  });
}

/**
 * Get an enabled tool by name
 */
export async function getEnabledToolByName(name: string): Promise<AiTool | null> {
  return prismadb.aiTool.findFirst({
    where: { name, isEnabled: true },
  });
}

/**
 * Get tools that require specific scopes
 * Useful for filtering tools available to an API key
 */
export async function getToolsForScopes(scopes: string[]): Promise<AiTool[]> {
  const tools = await getEnabledTools();
  
  // Filter tools where all required scopes are available
  return tools.filter((tool) => {
    if (tool.requiredScopes.length === 0) {
      return true; // No scopes required
    }
    return tool.requiredScopes.every((scope) => scopes.includes(scope));
  });
}

/**
 * Check if a tool is available for given scopes
 */
export async function isToolAvailableForScopes(
  toolName: string,
  scopes: string[]
): Promise<boolean> {
  const tool = await getEnabledToolByName(toolName);
  
  if (!tool) {
    return false;
  }
  
  if (tool.requiredScopes.length === 0) {
    return true;
  }
  
  return tool.requiredScopes.every((scope) => scopes.includes(scope));
}

/**
 * Get tool categories with counts
 */
export async function getToolCategoriesWithCounts(): Promise<
  Array<{ category: string; count: number; enabledCount: number }>
> {
  const tools = await prismadb.aiTool.findMany({
    select: { category: true, isEnabled: true },
  });

  const categoryMap = new Map<string, { count: number; enabledCount: number }>();

  for (const tool of tools) {
    const existing = categoryMap.get(tool.category) || { count: 0, enabledCount: 0 };
    existing.count++;
    if (tool.isEnabled) {
      existing.enabledCount++;
    }
    categoryMap.set(tool.category, existing);
  }

  return Array.from(categoryMap.entries())
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Invalidate the tools cache
 * Call this after creating, updating, or deleting tools
 */
export async function invalidateToolsCache(): Promise<void> {
  // With unstable_cache and tags, we can use revalidateTag
  // However, this function is here for future use when we migrate
  // to a more explicit cache invalidation strategy
  try {
    const { revalidateTag } = await import("next/cache");
    revalidateTag(TOOLS_CACHE_TAG);
  } catch {
    // Ignore errors in environments where revalidateTag is not available
  }
}
