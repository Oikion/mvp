import type { PrismaClient } from "@prisma/client";
import { prismadb } from "@/lib/prisma";

export interface ParsedMention {
  type: "client" | "property" | "event" | "task";
  name: string;
  id?: string;
  originalText: string;
}

export interface ParsedMentions {
  clients: Array<{ id: string; name: string }>;
  properties: Array<{ id: string; name: string }>;
  events: Array<{ id: string; title: string }>;
  tasks: Array<{ id: string; title: string }>;
}

/**
 * Parse mentions from text input
 * Supports formats: @(entity-name) or @entity-name
 * @param text - Text containing mentions
 * @returns Array of parsed mentions
 */
export function parseMentionsFromText(text: string): ParsedMention[] {
  if (!text) return [];

  const mentions: ParsedMention[] = [];
  
  // Match @(entity-name) or @entity-name patterns
  // Also match with optional type prefix: @(client-name), @(property-name), etc.
  const mentionRegex = /@(?:\(([^)]+)\)|(\w+(?:-\w+)*))/g;
  
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionText = match[1] || match[2]; // Use parentheses content or word
    
    if (!mentionText) continue;

    // Try to detect type from prefix (client-, property-, event-, task-)
    let type: ParsedMention["type"];
    let name = mentionText;

    if (mentionText.startsWith("client-")) {
      type = "client";
      name = mentionText.replace(/^client-/, "");
    } else if (mentionText.startsWith("property-")) {
      type = "property";
      name = mentionText.replace(/^property-/, "");
    } else if (mentionText.startsWith("event-") || mentionText.startsWith("calendar-")) {
      type = "event";
      name = mentionText.replace(/^(event-|calendar-)/, "");
    } else if (mentionText.startsWith("task-")) {
      type = "task";
      name = mentionText.replace(/^task-/, "");
    } else {
      type = "client"; // default
    }

    mentions.push({
      type,
      name: name.trim(),
      originalText: match[0],
    });
  }

  return mentions;
}

/**
 * Resolve mentions to actual database entities
 * @param mentions - Parsed mentions from text
 * @param organizationId - Organization ID for filtering
 * @returns Resolved mentions with IDs
 */
export async function resolveMentions(
  mentions: ParsedMention[],
  organizationId: string,
  prismaClient: PrismaClient = prismadb
): Promise<ParsedMentions> {
  const resolved: ParsedMentions = {
    clients: [],
    properties: [],
    events: [],
    tasks: [],
  };

  // Group mentions by type
  const clientMentions = mentions.filter((m) => m.type === "client");
  const propertyMentions = mentions.filter((m) => m.type === "property");
  const eventMentions = mentions.filter((m) => m.type === "event");
  const taskMentions = mentions.filter((m) => m.type === "task");

  // Resolve clients
  if (clientMentions.length > 0) {
    const clientNames = clientMentions.map((m) => m.name);
    const clients = await prismaClient.clients.findMany({
      where: {
        organizationId,
        client_name: {
          in: clientNames,
        },
      },
      select: {
        id: true,
        client_name: true,
      },
    });

    resolved.clients = clients.map((c) => ({
      id: c.id,
      name: c.client_name,
    }));
  }

  // Resolve properties
  if (propertyMentions.length > 0) {
    const propertyNames = propertyMentions.map((m) => m.name);
    const properties = await prismaClient.properties.findMany({
      where: {
        organizationId,
        property_name: {
          in: propertyNames,
        },
      },
      select: {
        id: true,
        property_name: true,
      },
    });

    resolved.properties = properties.map((p) => ({
      id: p.id,
      name: p.property_name,
    }));
  }

  // Resolve calendar events (CalComEvent)
  if (eventMentions.length > 0) {
    const eventTitles = eventMentions.map((m) => m.name);
    const events = await (prismaClient as any).calComEvent.findMany({
      where: {
        organizationId,
        title: {
          in: eventTitles,
        },
      },
      select: {
        id: true,
        title: true,
      },
    });

    resolved.events = events.map((event: { id: string; title: string | null }) => ({
      id: event.id,
      title: event.title || "",
    }));
  }

  // Resolve tasks (crm_Accounts_Tasks)
  if (taskMentions.length > 0) {
    const taskTitles = taskMentions.map((m) => m.name);
    const tasks = await prismaClient.crm_Accounts_Tasks.findMany({
      where: {
        title: {
          in: taskTitles,
        },
      },
      select: {
        id: true,
        title: true,
      },
    });

    resolved.tasks = tasks.map((t) => ({
      id: t.id,
      title: t.title,
    }));
  }

  return resolved;
}

/**
 * Merge explicit associations with parsed mentions
 * @param parsedMentions - Mentions parsed from text
 * @param explicitAssociations - Explicit associations from EntityLinker
 * @param organizationId - Organization ID
 * @returns Merged mentions with all IDs
 */
export async function mergeMentions(
  parsedMentions: ParsedMentions,
  explicitAssociations: {
    clientIds?: string[];
    propertyIds?: string[];
    eventIds?: string[];
    taskIds?: string[];
  },
  organizationId: string,
  prismaClient: PrismaClient = prismadb
): Promise<ParsedMentions> {
  const merged: ParsedMentions = {
    clients: [...parsedMentions.clients],
    properties: [...parsedMentions.properties],
    events: [...parsedMentions.events],
    tasks: [...parsedMentions.tasks],
  };

  // Add explicit client associations
  if (explicitAssociations.clientIds && explicitAssociations.clientIds.length > 0) {
    const explicitClients = await prismaClient.clients.findMany({
      where: {
        id: { in: explicitAssociations.clientIds },
        organizationId,
      },
      select: {
        id: true,
        client_name: true,
      },
    });

    // Merge, avoiding duplicates
    for (const client of explicitClients) {
      if (!merged.clients.some((c) => c.id === client.id)) {
        merged.clients.push({ id: client.id, name: client.client_name });
      }
    }
  }

  // Add explicit property associations
  if (explicitAssociations.propertyIds && explicitAssociations.propertyIds.length > 0) {
    const explicitProperties = await prismaClient.properties.findMany({
      where: {
        id: { in: explicitAssociations.propertyIds },
        organizationId,
      },
      select: {
        id: true,
        property_name: true,
      },
    });

    for (const property of explicitProperties) {
      if (!merged.properties.some((p) => p.id === property.id)) {
        merged.properties.push({ id: property.id, name: property.property_name });
      }
    }
  }

  // Add explicit event associations
  if (explicitAssociations.eventIds && explicitAssociations.eventIds.length > 0) {
    const explicitEvents = await (prismaClient as any).calComEvent.findMany({
      where: {
        id: { in: explicitAssociations.eventIds },
        organizationId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    for (const event of explicitEvents) {
      if (!merged.events.some((e) => e.id === event.id)) {
        merged.events.push({ id: event.id, title: event.title || "" });
      }
    }
  }

  // Add explicit task associations
  if (explicitAssociations.taskIds && explicitAssociations.taskIds.length > 0) {
    const explicitTasks = await prismaClient.crm_Accounts_Tasks.findMany({
      where: {
        id: { in: explicitAssociations.taskIds },
      },
      select: {
        id: true,
        title: true,
      },
    });

    for (const task of explicitTasks) {
      if (!merged.tasks.some((t) => t.id === task.id)) {
        merged.tasks.push({ id: task.id, title: task.title });
      }
    }
  }

  return merged;
}

