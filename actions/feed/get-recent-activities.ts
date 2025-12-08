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
      assigned_to_user: {
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
    activities.push({
      id: `property-${property.id}`,
      type: "property",
      action: isUpdated ? "updated" : "created",
      title: property.property_name || "Unnamed Property",
      description: property.description || undefined,
      timestamp: (isUpdated ? property.updatedAt : property.createdAt)?.toISOString() || new Date().toISOString(),
      actor: property.assigned_to_user ? {
        id: property.assigned_to_user.id,
        name: property.assigned_to_user.name || "Unknown",
        avatar: property.assigned_to_user.avatar || undefined,
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
      assigned_to_user: {
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
    activities.push({
      id: `client-${client.id}`,
      type: "client",
      action: isUpdated ? "updated" : "created",
      title: client.client_name || "Unnamed Client",
      description: client.description || undefined,
      timestamp: (isUpdated ? client.updatedAt : client.createdAt)?.toISOString() || new Date().toISOString(),
      actor: client.assigned_to_user ? {
        id: client.assigned_to_user.id,
        name: client.assigned_to_user.name || "Unknown",
        avatar: client.assigned_to_user.avatar || undefined,
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
      created_by: {
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
    activities.push({
      id: `document-${doc.id}`,
      type: "document",
      action: isUpdated ? "updated" : "created",
      title: doc.document_name || "Unnamed Document",
      description: doc.description || undefined,
      timestamp: (isUpdated ? doc.updatedAt : doc.createdAt)?.toISOString() || new Date().toISOString(),
      actor: doc.created_by ? {
        id: doc.created_by.id,
        name: doc.created_by.name || "Unknown",
        avatar: doc.created_by.avatar || undefined,
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
    const events = await prisma.calComEvent.findMany({
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
    // CalComEvent might not exist yet, skip silently
    console.log("CalComEvent not available:", error);
  }

  // Sort all activities by timestamp (most recent first)
  activities.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Return limited results
  return activities.slice(0, limit);
}

