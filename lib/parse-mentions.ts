/**
 * Parse mentions from text content
 * Supports formats: @username, @[userId], @{userId}
 */

import type { PrismaClient } from "@prisma/client";

/**
 * Extract user IDs from mention patterns in text
 * Supports: @username, @[userId], @{userId}
 */
export function parseMentions(content: string): string[] {
  if (!content) return [];

  const mentions: string[] = [];
  
  // Match @[userId] or @{userId} patterns (explicit user ID mentions)
  const idPatterns = Array.from(content.matchAll(/@[\[{]([a-zA-Z0-9_-]+)[\]}]/g));
  for (const match of idPatterns) {
    if (match[1]) {
      mentions.push(match[1]);
    }
  }

  return Array.from(new Set(mentions)); // Remove duplicates
}

/**
 * Extract usernames from @username patterns
 * This can be used to look up user IDs from usernames
 */
export function parseUsernameMentions(content: string): string[] {
  if (!content) return [];

  const usernames: string[] = [];
  
  // Match @username patterns (word characters, no brackets)
  const usernamePatterns = Array.from(content.matchAll(/@([a-zA-Z0-9_]+)(?![}\]])/g));
  for (const match of usernamePatterns) {
    if (match[1]) {
      usernames.push(match[1]);
    }
  }

  return Array.from(new Set(usernames)); // Remove duplicates
}

/**
 * Resolve usernames to user IDs
 * This should be called with a database query to convert usernames to IDs
 */
export async function resolveUsernamesToIds(
  usernames: string[],
  organizationId: string,
  prisma: PrismaClient
): Promise<string[]> {
  if (usernames.length === 0) return [];

  try {
    // TODO: filter by org membership once a Prisma relation from Users to
    // organizations is available. Currently org membership is Clerk-only and
    // the Users model has no organizationId field, so we cannot scope this
    // query to the org via Prisma alone.
    const users = await prisma.users.findMany({
      where: {
        username: { in: usernames },
        userStatus: "ACTIVE",
      },
      select: { id: true },
    });

    return users.map((u) => u.id);
  } catch (error) {
    console.error("[PARSE_MENTIONS] Failed to resolve usernames:", error);
    return [];
  }
}
