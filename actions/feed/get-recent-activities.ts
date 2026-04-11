"use server";

import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";
import {
  decryptPropertyForOrg,
  decryptContactForOrg,
  decryptDocumentForOrg,
  decryptCalendarEventForOrg,
} from "@/lib/model-encryption";

export interface ActivityItem {
  id: string;
  type: "property" | "client" | "document" | "event";
  action: "created" | "updated" | "deleted";
  title: string;
  description?: string;
  timestamp: string;
  actor?: {
    id: string;
    name: string;
    avatar?: string;
  };
  entityId: string;
  entityFriendlyId?: string;
  metadata?: Record<string, any>;
}

export async function getRecentActivities(limit: number = 50): Promise<ActivityItem[]> {
  const orgId = await getCurrentOrgIdSafe();
  if (!orgId) {
    return [];
  }

  const prisma = prismaForOrg(orgId);
  const activities: ActivityItem[] = [];

  // 30-day cutoff to bound all queries
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const perType = Math.floor(limit / 4);

  // Run all four queries concurrently (fixes sequential execution)
  const [properties, clients, documents, events] = await Promise.all([
    prisma.properties.findMany({
      take: perType,
      where: { createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: "desc" },
      include: {
        Users_Properties_assigned_toToUsers: {
          select: { id: true, name: true, avatar: true },
        },
      },
    }),
    prisma.contact.findMany({
      take: perType,
      where: { createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: "desc" },
      include: {
        assignedAgent: {
          select: { id: true, name: true, avatar: true },
        },
      },
    }),
    prisma.documents.findMany({
      take: perType,
      where: { createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: "desc" },
      include: {
        Users_Documents_created_by_userToUsers: {
          select: { id: true, name: true, avatar: true },
        },
      },
    }),
    prisma.calendarEvent.findMany({
      take: perType,
      where: { createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: "desc" },
    }).catch(() => [] as Awaited<ReturnType<typeof prisma.calendarEvent.findMany>>),
  ]);

  // Decrypt all entity types concurrently
  const [decryptedProperties, decryptedClients, decryptedDocs, decryptedEvents] = await Promise.all([
    Promise.all(properties.map((p) => decryptPropertyForOrg(p, orgId))),
    Promise.all(clients.map((c) => decryptContactForOrg(c, orgId))),
    Promise.all(documents.map((d) => decryptDocumentForOrg(d, orgId))),
    Promise.all(events.map((e) => decryptCalendarEventForOrg(e, orgId))),
  ]);

  for (const property of decryptedProperties) {
    const isUpdated = property.updatedAt && property.updatedAt > property.createdAt;
    const assignedUser = property.Users_Properties_assigned_toToUsers;
    activities.push({
      id: `property-${property.id}`,
      type: "property",
      action: isUpdated ? "updated" : "created",
      title: property.property_name || "Unnamed Property",
      description: property.description || undefined,
      timestamp: (isUpdated ? property.updatedAt : property.createdAt)?.toISOString() || new Date().toISOString(),
      actor: assignedUser ? {
        id: assignedUser.id,
        name: assignedUser.name || "Unknown",
        avatar: assignedUser.avatar || undefined,
      } : undefined,
      entityId: property.id,
      entityFriendlyId: (property as any).friendlyId,
      metadata: {
        propertyType: property.property_type,
        transactionType: property.transaction_type,
        price: property.price !== null && property.price !== undefined ? Number(property.price) : undefined,
      },
    });
  }

  for (const client of decryptedClients) {
    const isUpdated = client.updatedAt && client.updatedAt > client.createdAt;
    const assignedUser = (client as any).assignedAgent;
    activities.push({
      id: `client-${client.id}`,
      type: "client",
      action: isUpdated ? "updated" : "created",
      title: client.displayName || "Unnamed Contact",
      description: (client as any).description || undefined,
      timestamp: (isUpdated ? client.updatedAt : client.createdAt)?.toISOString() || new Date().toISOString(),
      actor: assignedUser ? {
        id: assignedUser.id,
        name: assignedUser.name || "Unknown",
        avatar: assignedUser.avatar || undefined,
      } : undefined,
      entityId: client.id,
      entityFriendlyId: (client as any).friendlyId,
      metadata: {
        status: client.status,
      },
    });
  }

  for (const doc of decryptedDocs) {
    const isUpdated = doc.updatedAt && doc.createdAt && doc.updatedAt > doc.createdAt;
    const createdBy = doc.Users_Documents_created_by_userToUsers;
    activities.push({
      id: `document-${doc.id}`,
      type: "document",
      action: isUpdated ? "updated" : "created",
      title: doc.document_name || "Unnamed Document",
      description: doc.description || undefined,
      timestamp: (isUpdated ? doc.updatedAt : doc.createdAt)?.toISOString() || new Date().toISOString(),
      actor: createdBy ? {
        id: createdBy.id,
        name: createdBy.name || "Unknown",
        avatar: createdBy.avatar || undefined,
      } : undefined,
      entityId: doc.id,
      entityFriendlyId: (doc as any).friendlyId,
      metadata: {
        documentType: doc.document_type,
        mimeType: doc.document_file_mimeType,
      },
    });
  }

  for (const event of decryptedEvents) {
    activities.push({
      id: `event-${event.id}`,
      type: "event",
      action: "created",
      title: event.title || "Unnamed Event",
      description: event.description || undefined,
      timestamp: event.createdAt?.toISOString() || new Date().toISOString(),
      actor: undefined,
      entityId: event.id,
      entityFriendlyId: (event as any).friendlyId,
      metadata: {
        startTime: event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime,
        endTime: event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime,
        location: event.location,
      },
    });
  }

  // Sort all activities by timestamp (most recent first)
  activities.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Return limited results
  return activities.slice(0, limit);
}

