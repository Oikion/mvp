import {
  parseMentionsFromText,
  resolveMentions,
  mergeMentions,
  type ParsedMentions,
} from "@/lib/documents/parse-mentions";

/**
 * Parse mentions from document description text
 * @param description - Document description text
 * @param organizationId - Organization ID for filtering
 * @returns Parsed mentions with resolved IDs
 */
export async function parseDocumentMentions(
  description: string | null | undefined,
  organizationId: string
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
  const resolved = await resolveMentions(mentions, organizationId);

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
  organizationId: string
): Promise<ParsedMentions> {
  // Parse inline mentions from description
  const parsedMentions = await parseDocumentMentions(description, organizationId);

  // Merge with explicit associations
  const merged = await mergeMentions(parsedMentions, explicitAssociations, organizationId);

  return merged;
}

