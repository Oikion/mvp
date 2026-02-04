/**
 * Unified Entity Search Utilities
 * 
 * Provides consistent search functionality across all entity types:
 * - Clients
 * - Properties
 * - Documents
 * - Events
 */

import { prismadb } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ============================================
// Types
// ============================================

export type EntityType = "client" | "property" | "document" | "event";

export interface EntitySearchResult {
  value: string;
  label: string;
  type: EntityType;
  metadata: {
    subtitle?: string;
    status?: string;
    icon?: string;
    [key: string]: unknown;
  };
}

export interface EntitySearchOptions {
  query?: string;
  types: EntityType[];
  organizationId: string;
  limit?: number;
  filters?: {
    clientStatus?: string;
    propertyStatus?: string;
    documentType?: string;
    eventType?: string;
  };
}

export interface EntitySearchResponse {
  results: Record<EntityType, EntitySearchResult[]>;
  timing: {
    total: number;
    perType: Record<EntityType, number>;
  };
}

// ============================================
// Search Functions
// ============================================

/**
 * Search clients by multiple fields
 */
async function searchClients(
  organizationId: string,
  query: string,
  limit: number,
  statusFilter?: string
): Promise<{ results: EntitySearchResult[]; timing: number }> {
  const start = Date.now();

  const where: Prisma.ClientsWhereInput = {
    organizationId,
  };

  if (query?.trim()) {
    const searchTerm = query.trim();
    where.OR = [
      { client_name: { contains: searchTerm, mode: "insensitive" } },
      { primary_email: { contains: searchTerm, mode: "insensitive" } },
      { primary_phone: { contains: searchTerm, mode: "insensitive" } },
      { secondary_phone: { contains: searchTerm, mode: "insensitive" } },
      { full_name: { contains: searchTerm, mode: "insensitive" } },
      { company_name: { contains: searchTerm, mode: "insensitive" } },
      { id: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  if (statusFilter) {
    where.client_status = statusFilter as Prisma.ClientsWhereInput["client_status"];
  }

  const clients = await prismadb.clients.findMany({
    where,
    select: {
      id: true,
      client_name: true,
      primary_email: true,
      primary_phone: true,
      client_status: true,
      intent: true,
    },
    orderBy: [{ updatedAt: "desc" }, { client_name: "asc" }],
    take: limit,
  });

  const results: EntitySearchResult[] = clients.map((client) => ({
    value: client.id,
    label: client.client_name,
    type: "client" as const,
    metadata: {
      subtitle: client.primary_email || client.primary_phone || undefined,
      status: client.client_status || undefined,
      intent: client.intent || undefined,
    },
  }));

  return { results, timing: Date.now() - start };
}

/**
 * Search properties by multiple fields
 */
async function searchProperties(
  organizationId: string,
  query: string,
  limit: number,
  statusFilter?: string
): Promise<{ results: EntitySearchResult[]; timing: number }> {
  const start = Date.now();

  const where: Prisma.PropertiesWhereInput = {
    organizationId,
  };

  if (query?.trim()) {
    const searchTerm = query.trim();
    
    // Check if query is a number for price search
    const priceSearch = Number.parseInt(searchTerm.replaceAll(/[,.\s]/g, ""), 10);
    const isPriceQuery = !Number.isNaN(priceSearch) && priceSearch > 1000;

    const orConditions: Prisma.PropertiesWhereInput[] = [
      { property_name: { contains: searchTerm, mode: "insensitive" } },
      { address_street: { contains: searchTerm, mode: "insensitive" } },
      { address_city: { contains: searchTerm, mode: "insensitive" } },
      { municipality: { contains: searchTerm, mode: "insensitive" } },
      { postal_code: { contains: searchTerm, mode: "insensitive" } },
      { id: { contains: searchTerm, mode: "insensitive" } },
    ];

    // Add price range search if query looks like a price
    if (isPriceQuery) {
      orConditions.push({
        price: {
          gte: Math.floor(priceSearch * 0.9),
          lte: Math.ceil(priceSearch * 1.1),
        },
      });
    }

    where.OR = orConditions;
  }

  if (statusFilter) {
    where.property_status = statusFilter as Prisma.PropertiesWhereInput["property_status"];
  }

  const properties = await prismadb.properties.findMany({
    where,
    select: {
      id: true,
      property_name: true,
      address_street: true,
      address_city: true,
      municipality: true,
      price: true,
      property_status: true,
      property_type: true,
      bedrooms: true,
      square_feet: true,
    },
    orderBy: [{ updatedAt: "desc" }, { property_name: "asc" }],
    take: limit,
  });

  const results: EntitySearchResult[] = properties.map((property) => {
    const locationParts = [
      property.address_street,
      property.municipality || property.address_city,
    ].filter(Boolean);
    
    // Build subtitle - prefer location, fallback to price
    let subtitle: string | undefined;
    if (locationParts.length > 0) {
      subtitle = locationParts.join(", ");
    } else if (property.price) {
      subtitle = `€${property.price.toLocaleString()}`;
    }

    return {
      value: property.id,
      label: property.property_name,
      type: "property" as const,
      metadata: {
        subtitle,
        status: property.property_status || undefined,
        propertyType: property.property_type || undefined,
        price: property.price || undefined,
        bedrooms: property.bedrooms || undefined,
        sqft: property.square_feet || undefined,
      },
    };
  });

  return { results, timing: Date.now() - start };
}

/**
 * Search documents by multiple fields
 */
async function searchDocuments(
  organizationId: string,
  query: string,
  limit: number,
  typeFilter?: string
): Promise<{ results: EntitySearchResult[]; timing: number }> {
  const start = Date.now();

  const where: Prisma.DocumentsWhereInput = {
    organizationId,
  };

  if (query?.trim()) {
    const searchTerm = query.trim();
    where.OR = [
      { document_name: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
      { id: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  if (typeFilter) {
    where.document_type = typeFilter;
  }

  const documents = await prismadb.documents.findMany({
    where,
    select: {
      id: true,
      document_name: true,
      description: true,
      document_type: true,
      document_system_type: true,
      document_file_mimeType: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { document_name: "asc" }],
    take: limit,
  });

  const results: EntitySearchResult[] = documents.map((doc) => ({
    value: doc.id,
    label: doc.document_name,
    type: "document" as const,
    metadata: {
      subtitle: doc.description || doc.document_type || undefined,
      documentType: doc.document_type || undefined,
      systemType: doc.document_system_type || undefined,
      mimeType: doc.document_file_mimeType,
    },
  }));

  return { results, timing: Date.now() - start };
}

/**
 * Search calendar events by multiple fields
 */
async function searchEvents(
  organizationId: string,
  query: string,
  limit: number,
  typeFilter?: string
): Promise<{ results: EntitySearchResult[]; timing: number }> {
  const start = Date.now();

  const where: Prisma.CalendarEventWhereInput = {
    organizationId,
  };

  if (query?.trim()) {
    const searchTerm = query.trim();
    where.OR = [
      { title: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
      { location: { contains: searchTerm, mode: "insensitive" } },
      { id: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  if (typeFilter) {
    where.eventType = typeFilter as Prisma.CalendarEventWhereInput["eventType"];
  }

  const events = await prismadb.calendarEvent.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      startTime: true,
      endTime: true,
      eventType: true,
      status: true,
    },
    orderBy: [{ startTime: "desc" }],
    take: limit,
  });

  const results: EntitySearchResult[] = events.map((event) => {
    const dateStr = event.startTime
      ? new Date(event.startTime).toLocaleDateString("el-GR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : undefined;

    return {
      value: event.id,
      label: event.title || "Untitled Event",
      type: "event" as const,
      metadata: {
        subtitle: event.location || dateStr || undefined,
        eventType: event.eventType || undefined,
        status: event.status || undefined,
        startTime: event.startTime?.toISOString(),
        endTime: event.endTime?.toISOString(),
      },
    };
  });

  return { results, timing: Date.now() - start };
}

// ============================================
// Main Search Function
// ============================================

/**
 * Search all entity types in parallel
 * Returns results grouped by type with timing information
 */
export async function searchEntities(
  options: EntitySearchOptions
): Promise<EntitySearchResponse> {
  const { query = "", types, organizationId, limit = 10, filters = {} } = options;
  const totalStart = Date.now();

  const searchPromises: Promise<{
    type: EntityType;
    results: EntitySearchResult[];
    timing: number;
  }>[] = [];

  // Run searches in parallel for each requested type
  if (types.includes("client")) {
    searchPromises.push(
      searchClients(organizationId, query, limit, filters.clientStatus).then(
        (res) => ({ type: "client" as const, ...res })
      )
    );
  }

  if (types.includes("property")) {
    searchPromises.push(
      searchProperties(organizationId, query, limit, filters.propertyStatus).then(
        (res) => ({ type: "property" as const, ...res })
      )
    );
  }

  if (types.includes("document")) {
    searchPromises.push(
      searchDocuments(organizationId, query, limit, filters.documentType).then(
        (res) => ({ type: "document" as const, ...res })
      )
    );
  }

  if (types.includes("event")) {
    searchPromises.push(
      searchEvents(organizationId, query, limit, filters.eventType).then(
        (res) => ({ type: "event" as const, ...res })
      )
    );
  }

  const searchResults = await Promise.all(searchPromises);

  // Group results by type
  const results: Record<EntityType, EntitySearchResult[]> = {
    client: [],
    property: [],
    document: [],
    event: [],
  };

  const timingPerType: Record<EntityType, number> = {
    client: 0,
    property: 0,
    document: 0,
    event: 0,
  };

  for (const result of searchResults) {
    results[result.type] = result.results;
    timingPerType[result.type] = result.timing;
  }

  return {
    results,
    timing: {
      total: Date.now() - totalStart,
      perType: timingPerType,
    },
  };
}

/**
 * Get top entities (recently updated) for initial display
 * Used when no search query is provided
 */
export async function getTopEntities(
  organizationId: string,
  types: EntityType[],
  limit = 10
): Promise<EntitySearchResponse> {
  return searchEntities({
    organizationId,
    types,
    limit,
    query: "",
  });
}
