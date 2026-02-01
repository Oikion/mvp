/**
 * AI Data Aggregator
 *
 * Provides comprehensive organization data access for AI agents.
 * Aggregates data from multiple sources to give the AI full context
 * about the organization's clients, properties, events, documents, and messages.
 */

import { prismadb } from "@/lib/prisma";

// ============================================
// Types
// ============================================

export interface OrganizationContext {
  organization: {
    id: string;
    name: string;
    settings?: Record<string, unknown>;
  };
  summary: {
    totalClients: number;
    totalProperties: number;
    upcomingEvents: number;
    pendingTasks: number;
    unreadMessages: number;
  };
  recentClients: ClientSummary[];
  activeProperties: PropertySummary[];
  upcomingEvents: EventSummary[];
  recentDocuments: DocumentSummary[];
  recentMessages: MessageSummary[];
}

export interface ClientSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  type: string | null;
  lastActivity: string;
}

export interface PropertySummary {
  id: string;
  name: string;
  type: string | null;
  status: string | null;
  price: number | null;
  city: string | null;
  bedrooms: number | null;
}

export interface EventSummary {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  eventType: string | null;
  linkedClients: string[];
  linkedProperties: string[];
}

export interface DocumentSummary {
  id: string;
  name: string;
  type: string | null;
  category: string | null;
  createdAt: string;
}

export interface MessageSummary {
  id: string;
  channelName: string;
  channelType: string;
  lastMessage: string | null;
  lastMessageTime: string;
  unreadCount: number;
}

// ============================================
// Data Fetching Functions
// ============================================

/**
 * Get comprehensive organization context for AI
 *
 * This aggregates data from multiple sources to provide the AI
 * with full context about the organization.
 */
export async function getOrganizationContext(
  organizationId: string,
  options?: {
    clientLimit?: number;
    propertyLimit?: number;
    eventDays?: number;
    documentLimit?: number;
    messageLimit?: number;
  }
): Promise<OrganizationContext> {
  const {
    clientLimit = 50,
    propertyLimit = 50,
    eventDays = 30,
    documentLimit = 20,
    messageLimit = 20,
  } = options || {};

  // Fetch all data in parallel for performance
  const [
    organization,
    clientCount,
    propertyCount,
    eventCount,
    taskCount,
    unreadCount,
    recentClients,
    activeProperties,
    upcomingEvents,
    recentDocuments,
    recentMessages,
  ] = await Promise.all([
    // Organization info
    getOrganizationInfo(organizationId),

    // Counts for summary
    prismadb.clients.count({ where: { organizationId } }),
    prismadb.properties.count({ where: { organizationId } }),
    getUpcomingEventCount(organizationId, eventDays),
    getPendingTaskCount(organizationId),
    getUnreadMessageCount(organizationId),

    // Recent/active data
    getRecentClients(organizationId, clientLimit),
    getActiveProperties(organizationId, propertyLimit),
    getUpcomingEvents(organizationId, eventDays),
    getRecentDocuments(organizationId, documentLimit),
    getRecentMessages(organizationId, messageLimit),
  ]);

  return {
    organization,
    summary: {
      totalClients: clientCount,
      totalProperties: propertyCount,
      upcomingEvents: eventCount,
      pendingTasks: taskCount,
      unreadMessages: unreadCount,
    },
    recentClients,
    activeProperties,
    upcomingEvents,
    recentDocuments,
    recentMessages,
  };
}

/**
 * Get organization info
 */
async function getOrganizationInfo(organizationId: string) {
  const org = await prismadb.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      OrganizationSettings: {
        select: {
          aiProvider: true,
          aiModel: true,
        },
      },
    },
  });

  return {
    id: org?.id || organizationId,
    name: org?.name || "Unknown Organization",
    settings: org?.OrganizationSettings || undefined,
  };
}

/**
 * Get recent clients
 */
async function getRecentClients(
  organizationId: string,
  limit: number
): Promise<ClientSummary[]> {
  const clients = await prismadb.clients.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      client_name: true,
      primary_email: true,
      primary_phone: true,
      client_status: true,
      client_type: true,
      updatedAt: true,
    },
  });

  return clients.map((c) => ({
    id: c.id,
    name: c.client_name,
    email: c.primary_email,
    phone: c.primary_phone,
    status: c.client_status,
    type: c.client_type,
    lastActivity: c.updatedAt.toISOString(),
  }));
}

/**
 * Get active properties
 */
async function getActiveProperties(
  organizationId: string,
  limit: number
): Promise<PropertySummary[]> {
  const properties = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: { in: ["AVAILABLE", "PENDING", "FOR_RENT"] },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      property_name: true,
      property_type: true,
      property_status: true,
      price: true,
      address_city: true,
      bedrooms: true,
    },
  });

  return properties.map((p) => ({
    id: p.id,
    name: p.property_name,
    type: p.property_type,
    status: p.property_status,
    price: p.price ? Number(p.price) : null,
    city: p.address_city,
    bedrooms: p.bedrooms,
  }));
}

/**
 * Get upcoming events count
 */
async function getUpcomingEventCount(
  organizationId: string,
  days: number
): Promise<number> {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + days);

  return prismadb.CalendarEvent.count({
    where: {
      organizationId,
      startTime: { gte: now, lte: endDate },
      status: { notIn: ["cancelled"] },
    },
  });
}

/**
 * Get upcoming events
 */
async function getUpcomingEvents(
  organizationId: string,
  days: number
): Promise<EventSummary[]> {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + days);

  const events = await prismadb.CalendarEvent.findMany({
    where: {
      organizationId,
      startTime: { gte: now, lte: endDate },
      status: { notIn: ["cancelled"] },
    },
    orderBy: { startTime: "asc" },
    take: 50,
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      eventType: true,
      Clients: { select: { client_name: true } },
      Properties: { select: { property_name: true } },
    },
  });

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    eventType: e.eventType,
    linkedClients: e.Clients.map((c) => c.client_name),
    linkedProperties: e.Properties.map((p) => p.property_name),
  }));
}

/**
 * Get pending task count
 */
async function getPendingTaskCount(organizationId: string): Promise<number> {
  return prismadb.crm_Accounts_Tasks.count({
    where: {
      organizationId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
  });
}

/**
 * Get unread message count
 */
async function getUnreadMessageCount(organizationId: string): Promise<number> {
  // This is a simplified count - in production you'd want per-user unread counts
  const recentMessages = await prismadb.message.count({
    where: {
      organizationId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
    },
  });
  return recentMessages;
}

/**
 * Get recent documents
 */
async function getRecentDocuments(
  organizationId: string,
  limit: number
): Promise<DocumentSummary[]> {
  const documents = await prismadb.documents.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      document_name: true,
      document_type: true,
      category: true,
      createdAt: true,
    },
  });

  return documents.map((d) => ({
    id: d.id,
    name: d.document_name,
    type: d.document_type,
    category: d.category,
    createdAt: d.createdAt.toISOString(),
  }));
}

/**
 * Get recent messages/conversations
 */
async function getRecentMessages(
  organizationId: string,
  limit: number
): Promise<MessageSummary[]> {
  const channels = await prismadb.channel.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      type: true,
      updatedAt: true,
      Message: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          content: true,
          createdAt: true,
        },
      },
    },
  });

  return channels.map((c) => ({
    id: c.id,
    channelName: c.name || "Unnamed Channel",
    channelType: c.type,
    lastMessage: c.Message[0]?.content || null,
    lastMessageTime: c.Message[0]?.createdAt.toISOString() || c.updatedAt.toISOString(),
    unreadCount: 0, // Would need per-user tracking
  }));
}

// ============================================
// Specialized Data Access
// ============================================

/**
 * Get client with full context for AI
 */
export async function getClientContext(
  organizationId: string,
  clientId: string
) {
  const client = await prismadb.clients.findFirst({
    where: { id: clientId, organizationId },
    include: {
      Client_Preferences: true,
      Client_Contacts: {
        select: {
          id: true,
          contact_first_name: true,
          contact_last_name: true,
          contact_email: true,
          contact_phone: true,
        },
      },
      Properties: {
        select: {
          id: true,
          property_name: true,
          property_status: true,
          price: true,
        },
        take: 10,
      },
      CalendarEvent: {
        select: {
          id: true,
          title: true,
          startTime: true,
          status: true,
        },
        orderBy: { startTime: "desc" },
        take: 5,
      },
      Documents: {
        select: {
          id: true,
          document_name: true,
          document_type: true,
        },
        take: 10,
      },
    },
  });

  return client;
}

/**
 * Get property with full context for AI
 */
export async function getPropertyContext(
  organizationId: string,
  propertyId: string
) {
  const property = await prismadb.properties.findFirst({
    where: { id: propertyId, organizationId },
    include: {
      Clients: {
        select: {
          id: true,
          client_name: true,
          client_type: true,
        },
        take: 10,
      },
      CalendarEvent: {
        select: {
          id: true,
          title: true,
          startTime: true,
          eventType: true,
        },
        orderBy: { startTime: "desc" },
        take: 5,
      },
      Documents: {
        select: {
          id: true,
          document_name: true,
          document_type: true,
          document_file_url: true,
        },
        take: 20,
      },
    },
  });

  return property;
}

/**
 * Search across all organization data
 */
export async function searchOrganizationData(
  organizationId: string,
  query: string,
  options?: {
    includeClients?: boolean;
    includeProperties?: boolean;
    includeDocuments?: boolean;
    limit?: number;
  }
) {
  const {
    includeClients = true,
    includeProperties = true,
    includeDocuments = true,
    limit = 10,
  } = options || {};

  const results: {
    clients: ClientSummary[];
    properties: PropertySummary[];
    documents: DocumentSummary[];
  } = {
    clients: [],
    properties: [],
    documents: [],
  };

  const searchPromises = [];

  if (includeClients) {
    searchPromises.push(
      prismadb.clients
        .findMany({
          where: {
            organizationId,
            OR: [
              { client_name: { contains: query, mode: "insensitive" } },
              { primary_email: { contains: query, mode: "insensitive" } },
              { notes: { contains: query, mode: "insensitive" } },
            ],
          },
          take: limit,
          select: {
            id: true,
            client_name: true,
            primary_email: true,
            primary_phone: true,
            client_status: true,
            client_type: true,
            updatedAt: true,
          },
        })
        .then((clients) => {
          results.clients = clients.map((c) => ({
            id: c.id,
            name: c.client_name,
            email: c.primary_email,
            phone: c.primary_phone,
            status: c.client_status,
            type: c.client_type,
            lastActivity: c.updatedAt.toISOString(),
          }));
        })
    );
  }

  if (includeProperties) {
    searchPromises.push(
      prismadb.properties
        .findMany({
          where: {
            organizationId,
            OR: [
              { property_name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { address_city: { contains: query, mode: "insensitive" } },
              { address_street: { contains: query, mode: "insensitive" } },
            ],
          },
          take: limit,
          select: {
            id: true,
            property_name: true,
            property_type: true,
            property_status: true,
            price: true,
            address_city: true,
            bedrooms: true,
          },
        })
        .then((properties) => {
          results.properties = properties.map((p) => ({
            id: p.id,
            name: p.property_name,
            type: p.property_type,
            status: p.property_status,
            price: p.price ? Number(p.price) : null,
            city: p.address_city,
            bedrooms: p.bedrooms,
          }));
        })
    );
  }

  if (includeDocuments) {
    searchPromises.push(
      prismadb.documents
        .findMany({
          where: {
            organizationId,
            OR: [
              { document_name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          },
          take: limit,
          select: {
            id: true,
            document_name: true,
            document_type: true,
            category: true,
            createdAt: true,
          },
        })
        .then((documents) => {
          results.documents = documents.map((d) => ({
            id: d.id,
            name: d.document_name,
            type: d.document_type,
            category: d.category,
            createdAt: d.createdAt.toISOString(),
          }));
        })
    );
  }

  await Promise.all(searchPromises);

  return results;
}

/**
 * Get today's summary for AI assistant
 */
export async function getTodaySummary(organizationId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayEvents, newClients, newTasks, recentActivity] = await Promise.all([
    // Today's events
    prismadb.CalendarEvent.findMany({
      where: {
        organizationId,
        startTime: { gte: today, lt: tomorrow },
        status: { notIn: ["cancelled"] },
      },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        eventType: true,
        location: true,
        Clients: { select: { client_name: true } },
        Properties: { select: { property_name: true } },
      },
    }),

    // New clients today
    prismadb.clients.count({
      where: {
        organizationId,
        createdAt: { gte: today },
      },
    }),

    // Tasks due today
    prismadb.crm_Accounts_Tasks.findMany({
      where: {
        organizationId,
        dueDate: { gte: today, lt: tomorrow },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        dueDate: true,
      },
    }),

    // Recent activity (last 24 hours)
    prismadb.clients.count({
      where: {
        organizationId,
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return {
    date: today.toISOString().split("T")[0],
    events: todayEvents.map((e) => ({
      id: e.id,
      title: e.title,
      time: `${e.startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} - ${e.endTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
      type: e.eventType,
      location: e.location,
      clients: e.Clients.map((c) => c.client_name),
      properties: e.Properties.map((p) => p.property_name),
    })),
    totalEventsToday: todayEvents.length,
    newClientsToday: newClients,
    tasksDueToday: newTasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
    })),
    recentActivityCount: recentActivity,
  };
}
