"use server";

import { getCurrentOrgIdSafe, getCurrentUserSafe } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";
import { prismadb } from "@/lib/prisma";

export interface ShareableProperty {
  id: string;
  type: "property";
  title: string;
  subtitle?: string;
  price?: number;
  image?: string;
}

export interface ShareableClient {
  id: string;
  type: "client";
  title: string;
  subtitle?: string;
}

export interface ShareableDocument {
  id: string;
  type: "document";
  title: string;
  subtitle?: string;
  fileType?: string;
}

export interface ShareableEvent {
  id: string;
  type: "event";
  title: string;
  subtitle?: string;
  startTime: string;
  endTime?: string;
}

export interface ShareableEntities {
  properties: ShareableProperty[];
  clients: ShareableClient[];
  documents: ShareableDocument[];
  events: ShareableEvent[];
}

/**
 * Get all shareable entities for the current user/organization
 * Used in the chat to share properties, clients, documents, or events
 */
export async function getShareableEntities(): Promise<ShareableEntities> {
  const orgId = await getCurrentOrgIdSafe();
  const currentUser = await getCurrentUserSafe();
  
  if (!orgId || !currentUser) {
    return { properties: [], clients: [], documents: [], events: [] };
  }

  const prisma = prismaForOrg(orgId);

  try {
    // Fetch properties
    const properties = await prisma.properties.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        property_name: true,
        municipality: true,
        area: true,
        price: true,
        property_type: true,
      },
    });

    // Fetch clients
    const clients = await prisma.clients.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        client_name: true,
        intent: true,
        person_type: true,
      },
    });

    // Fetch documents (user's documents in the org)
    const documents = await prismadb.documents.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { createdBy: currentUser.id },
          { linkEnabled: true },
        ],
      },
      take: 50,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        document_name: true,
        createdAt: true,
      },
    });

    // Fetch upcoming calendar events
    const now = new Date();
    const events = await prismadb.calendarEvent.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { assignedUserId: currentUser.id },
          { EventInvitee: { some: { userId: currentUser.id } } },
        ],
        startTime: { gte: now },
      },
      take: 50,
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        location: true,
        eventType: true,
      },
    });

    return {
      properties: properties.map((p) => ({
        id: p.id,
        type: "property" as const,
        title: p.property_name || "Unnamed Property",
        subtitle: [p.municipality, p.area].filter(Boolean).join(", ") || undefined,
        price: p.price ? Number(p.price) : undefined,
      })),
      clients: clients.map((c) => ({
        id: c.id,
        type: "client" as const,
        title: c.client_name || "Unnamed Client",
        subtitle: c.intent || undefined,
      })),
      documents: documents.map((d) => ({
        id: d.id,
        type: "document" as const,
        title: d.document_name || "Untitled Document",
        subtitle: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : undefined,
      })),
      events: events.map((e) => ({
        id: e.id,
        type: "event" as const,
        title: e.title || "Untitled Event",
        subtitle: e.location || e.eventType || undefined,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime?.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error fetching shareable entities:", error);
    return { properties: [], clients: [], documents: [], events: [] };
  }
}

/**
 * Get a specific entity's details for sharing preview
 */
export async function getEntityDetails(
  entityType: "property" | "client" | "document" | "event",
  entityId: string
): Promise<{
  success: boolean;
  entity?: {
    id: string;
    type: string;
    title: string;
    subtitle?: string;
    metadata?: Record<string, unknown>;
  };
  error?: string;
}> {
  const orgId = await getCurrentOrgIdSafe();
  
  if (!orgId) {
    return { success: false, error: "Not authenticated" };
  }

  const prisma = prismaForOrg(orgId);

  try {
    switch (entityType) {
      case "property": {
        const property = await prisma.properties.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            property_name: true,
            municipality: true,
            area: true,
            price: true,
            property_type: true,
            transaction_type: true,
          },
        });
        if (!property) return { success: false, error: "Property not found" };
        return {
          success: true,
          entity: {
            id: property.id,
            type: "property",
            title: property.property_name || "Unnamed Property",
            subtitle: [property.municipality, property.area].filter(Boolean).join(", "),
            metadata: {
              price: property.price ? Number(property.price) : null,
              propertyType: property.property_type,
              transactionType: property.transaction_type,
            },
          },
        };
      }
      case "client": {
        const client = await prisma.clients.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            client_name: true,
            intent: true,
            person_type: true,
          },
        });
        if (!client) return { success: false, error: "Client not found" };
        return {
          success: true,
          entity: {
            id: client.id,
            type: "client",
            title: client.client_name || "Unnamed Client",
            subtitle: client.intent || undefined,
            metadata: {
              intent: client.intent,
              personType: client.person_type,
            },
          },
        };
      }
      case "document": {
        const document = await prismadb.documents.findFirst({
          where: { id: entityId, organizationId: orgId },
          select: {
            id: true,
            document_name: true,
            createdAt: true,
          },
        });
        if (!document) return { success: false, error: "Document not found" };
        return {
          success: true,
          entity: {
            id: document.id,
            type: "document",
            title: document.document_name || "Untitled Document",
            subtitle: document.createdAt
              ? new Date(document.createdAt).toLocaleDateString()
              : undefined,
          },
        };
      }
      case "event": {
        const event = await prismadb.calendarEvent.findFirst({
          where: { id: entityId, organizationId: orgId },
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            location: true,
          },
        });
        if (!event) return { success: false, error: "Event not found" };
        return {
          success: true,
          entity: {
            id: event.id,
            type: "event",
            title: event.title || "Untitled Event",
            subtitle: event.location || undefined,
            metadata: {
              startTime: event.startTime.toISOString(),
              endTime: event.endTime?.toISOString(),
            },
          },
        };
      }
      default:
        return { success: false, error: "Invalid entity type" };
    }
  } catch (error) {
    console.error("Error fetching entity details:", error);
    return { success: false, error: "Failed to fetch entity details" };
  }
}
