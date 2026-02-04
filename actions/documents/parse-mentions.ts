import type { PrismaClient } from "@prisma/client";
import {
  parseMentionsFromText,
  resolveMentions,
  mergeMentions,
  type ParsedMentions,
} from "@/lib/documents/parse-mentions";
import { prismadb } from "@/lib/prisma";

/**
 * Parse mentions from document description text
 * @param description - Document description text
 * @param organizationId - Organization ID for filtering
 * @returns Parsed mentions with resolved IDs
 */
export async function parseDocumentMentions(
  description: string | null | undefined,
  organizationId: string,
  prismaClient: PrismaClient = prismadb
): Promise<ParsedMentions> {
  if (!description) {
    return {
      clients: [],
      properties: [],
      events: [],
      tasks: [],
    };
  }

  const mentions = parseMentionsFromText(description);
  const resolved = await resolveMentions(mentions, organizationId, prismaClient);

  return resolved;
}

/**
 * Merge inline mentions with explicit associations
 * @param description - Document description with inline mentions
 * @param explicitAssociations - Explicit associations from EntityLinker
 * @param organizationId - Organization ID
 * @returns Merged mentions ready to store
 */
export async function mergeDocumentMentions(
  description: string | null | undefined,
  explicitAssociations: {
    clientIds?: string[];
    propertyIds?: string[];
    eventIds?: string[];
    taskIds?: string[];
  },
  organizationId: string,
  prismaClient: PrismaClient = prismadb
): Promise<ParsedMentions> {
  // Parse inline mentions from description
  const parsedMentions = await parseDocumentMentions(
    description,
    organizationId,
    prismaClient
  );

  // Merge with explicit associations
  const merged = await mergeMentions(
    parsedMentions,
    explicitAssociations,
    organizationId,
    prismaClient
  );

  return merged;
}

