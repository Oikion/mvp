"use server";

import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";

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
  metadata?: Record<string, any>;
}

export async function getRecentActivities(limit: number = 50): Promise<ActivityItem[]> {
  const orgId = await getCurrentOrgIdSafe();
  if (!orgId) {
    return [];
  }

  const prisma = prismaForOrg(orgId);
  const activities: ActivityItem[] = [];

  // Fetch recent properties
  const properties = await prisma.properties.findMany({
    take: Math.floor(limit / 4),
    orderBy: { createdAt: "desc" },
    include: {
      Users_Properties_assigned_toToUsers: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
  });

  for (const property of properties) {
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
      metadata: {
        propertyType: property.property_type,
        transactionType: property.transaction_type,
        price: property.price,
      },
    });
  }

  // Fetch recent clients
  const clients = await prisma.clients.findMany({
    take: Math.floor(limit / 4),
    orderBy: { createdAt: "desc" },
    include: {
      Users_Clients_assigned_toToUsers: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
  });

  for (const client of clients) {
    const isUpdated = client.updatedAt && client.updatedAt > client.createdAt;
    const assignedUser = client.Users_Clients_assigned_toToUsers;
    activities.push({
      id: `client-${client.id}`,
      type: "client",
      action: isUpdated ? "updated" : "created",
      title: client.client_name || "Unnamed Client",
      description: client.description || undefined,
      timestamp: (isUpdated ? client.updatedAt : client.createdAt)?.toISOString() || new Date().toISOString(),
      actor: assignedUser ? {
        id: assignedUser.id,
        name: assignedUser.name || "Unknown",
        avatar: assignedUser.avatar || undefined,
      } : undefined,
      entityId: client.id,
      metadata: {
        personType: client.person_type,
        intent: client.intent,
        status: client.client_status,
      },
    });
  }

  // Fetch recent documents
  const documents = await prisma.documents.findMany({
    take: Math.floor(limit / 4),
    orderBy: { createdAt: "desc" },
    include: {
      Users_Documents_created_by_userToUsers: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
  });

  for (const doc of documents) {
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
      metadata: {
        documentType: doc.document_type,
        mimeType: doc.document_file_mimeType,
      },
    });
  }

  // Fetch recent calendar events
  try {
    const events = await prisma.calendarEvent.findMany({
      take: Math.floor(limit / 4),
      orderBy: { createdAt: "desc" },
    });

    for (const event of events) {
      activities.push({
        id: `event-${event.id}`,
        type: "event",
        action: "created",
        title: event.title || "Unnamed Event",
        description: event.description || undefined,
        timestamp: event.createdAt?.toISOString() || new Date().toISOString(),
        actor: undefined,
        entityId: event.id,
        metadata: {
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
        },
      });
    }
  } catch (error) {
    // CalendarEvent might not exist yet, skip silently
  }

  // Sort all activities by timestamp (most recent first)
  activities.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Return limited results
  return activities.slice(0, limit);
}

