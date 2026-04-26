/**
 * Unified Entity Search Utilities
 *
 * Provides consistent search functionality across all entity types:
 * - Contacts
 * - Properties
 * - Documents
 * - Events
 */

import { prismadb } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  decryptContactForOrg,
  decryptDocumentForOrg,
  decryptCalendarEventForOrg,
  decryptRequestForOrg,
} from "@/lib/model-encryption";

// ============================================
// Types
// ============================================

export type EntityType = "contact" | "property" | "document" | "event" | "request" | "deal";

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
    contactStatus?: string;
    propertyStatus?: string;
    documentType?: string;
    eventType?: string;
    requestStatus?: string;
    dealStage?: string;
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
 * Search contacts (v2.0) by display name, email, phone
 */
async function searchContacts(
  organizationId: string,
  query: string,
  limit: number,
  statusFilter?: string
): Promise<{ results: EntitySearchResult[]; timing: number }> {
  const start = Date.now();

  const where: Prisma.ContactWhereInput = { organizationId };
  if (statusFilter) where.status = statusFilter as any;

  const contacts = await prismadb.contact.findMany({
    where,
    select: {
      id: true,
      friendlyId: true,
      displayName: true,
      email: true,
      primaryPhone: true,
      status: true,
      category: true,
      isCompany: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit * 3, // Over-fetch for post-decrypt filtering
  });

  // Decrypt and filter
  const decrypted = [];
  for (const contact of contacts) {
    try {
      decrypted.push(await decryptContactForOrg(contact, organizationId));
    } catch {
      // Skip records that fail to decrypt
    }
  }

  const searchTerm = query.trim().toLowerCase();
  const filtered = searchTerm
    ? decrypted.filter(
        (c) =>
          c.displayName?.toLowerCase().includes(searchTerm) ||
          c.email?.toLowerCase().includes(searchTerm) ||
          c.primaryPhone?.includes(searchTerm)
      )
    : decrypted;

  const results: EntitySearchResult[] = filtered.slice(0, limit).map((c) => ({
    value: c.id,
    label: c.displayName || "Unknown Contact",
    type: "contact" as const,
    metadata: {
      subtitle: c.email || c.primaryPhone || undefined,
      status: c.status || undefined,
      icon: c.isCompany ? "building" : "user",
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

  // Decrypt encrypted document fields
  const decryptedDocs = await Promise.all(
    documents.map((d) => decryptDocumentForOrg(d, organizationId))
  );

  const results: EntitySearchResult[] = decryptedDocs.map((doc) => ({
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

  // Decrypt encrypted event fields
  const decryptedEvents = await Promise.all(
    events.map((e) => decryptCalendarEventForOrg(e, organizationId))
  );

  const results: EntitySearchResult[] = decryptedEvents.map((event) => {
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
// Requests (v2.0)
// ============================================

async function searchRequests(
  organizationId: string,
  query: string,
  limit: number,
  statusFilter?: string
): Promise<{ results: EntitySearchResult[]; timing: number }> {
  const start = Date.now();

  const where: Prisma.RequestWhereInput = { organizationId };
  if (statusFilter) {
    where.status = statusFilter as Prisma.RequestWhereInput["status"];
  }

  const fetchLimit = query?.trim() ? Math.max(limit * 5, 50) : limit;

  const requests = await prismadb.request.findMany({
    where,
    select: {
      id: true,
      friendlyId: true,
      requestType: true,
      budgetMin: true,
      budgetMax: true,
      locationDisplayName: true,
      municipality: true,
      status: true,
      urgency: true,
      requestContacts: {
        select: {
          contact: { select: { displayName: true } },
        },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: fetchLimit,
  });

  // Decrypt encrypted fields (request fields + nested contact displayName)
  const decrypted = await Promise.all(
    requests.map(async (r) => {
      const dec = await decryptRequestForOrg(r, organizationId);
      const firstContactEntry = dec.requestContacts?.[0];
      if (firstContactEntry?.contact) {
        firstContactEntry.contact = await decryptContactForOrg(
          firstContactEntry.contact,
          organizationId
        );
      }
      return dec;
    })
  );

  // Filter by query after decryption
  let filtered = decrypted;
  if (query?.trim()) {
    const q = query.trim().toLowerCase();
    filtered = decrypted.filter((r) => {
      const fid = (r.friendlyId || "").toLowerCase();
      const loc = (r.locationDisplayName || "").toLowerCase();
      const mun = (r.municipality || "").toLowerCase();
      return fid.includes(q) || loc.includes(q) || mun.includes(q);
    });
  }

  const results: EntitySearchResult[] = filtered.slice(0, limit).map((req) => {
    const budgetParts: string[] = [];
    if (req.budgetMin || req.budgetMax) {
      const min = req.budgetMin ? `€${Number(req.budgetMin).toLocaleString()}` : "";
      const max = req.budgetMax ? `€${Number(req.budgetMax).toLocaleString()}` : "";
      if (min && max) budgetParts.push(`${min}–${max}`);
      else if (min) budgetParts.push(`from ${min}`);
      else if (max) budgetParts.push(`up to ${max}`);
    }

    const subtitleParts = [
      req.requestType,
      req.locationDisplayName || req.municipality,
      budgetParts[0],
    ].filter(Boolean);

    return {
      value: req.id,
      label: `${req.friendlyId} — ${req.requestContacts?.[0]?.contact?.displayName || "Unknown"}`,
      type: "request" as const,
      metadata: {
        subtitle: subtitleParts.join(" · ") || undefined,
        status: req.status || undefined,
        urgency: req.urgency || undefined,
        friendlyId: req.friendlyId || undefined,
      },
    };
  });

  return { results, timing: Date.now() - start };
}

/**
 * Search deals by title, property, or friendly ID
 */
async function searchDeals(
  organizationId: string,
  query: string,
  limit: number,
  stageFilter?: string
): Promise<{ results: EntitySearchResult[]; timing: number }> {
  const start = Date.now();

  const where: Prisma.DealWhereInput = { organizationId };
  if (stageFilter) where.stage = stageFilter as any;

  if (query?.trim()) {
    const searchTerm = query.trim();
    where.OR = [
      { friendlyId: { contains: searchTerm, mode: "insensitive" } },
      { title: { contains: searchTerm, mode: "insensitive" } },
      { property: { property_name: { contains: searchTerm, mode: "insensitive" } } },
    ];
  }

  const deals = await prismadb.deal.findMany({
    where,
    select: {
      id: true,
      friendlyId: true,
      title: true,
      stage: true,
      dealType: true,
      agreedPrice: true,
      property: {
        select: { property_name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const results: EntitySearchResult[] = deals.map((d) => ({
    value: d.id,
    label: d.title || d.property?.property_name || d.friendlyId || "Untitled Deal",
    type: "deal" as const,
    metadata: {
      subtitle: d.friendlyId || undefined,
      status: d.stage || undefined,
      dealType: d.dealType || undefined,
      price: d.agreedPrice ? String(d.agreedPrice) : undefined,
    },
  }));

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
  if (types.includes("contact")) {
    searchPromises.push(
      searchContacts(organizationId, query, limit, filters.contactStatus).then(
        (res) => ({ type: "contact" as const, ...res })
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

  if (types.includes("request")) {
    searchPromises.push(
      searchRequests(organizationId, query, limit, filters.requestStatus).then(
        (res) => ({ type: "request" as const, ...res })
      )
    );
  }

  if (types.includes("deal")) {
    searchPromises.push(
      searchDeals(organizationId, query, limit, filters.dealStage).then(
        (res) => ({ type: "deal" as const, ...res })
      )
    );
  }

  const searchResults = await Promise.all(searchPromises);

  // Group results by type
  const results: Record<EntityType, EntitySearchResult[]> = {
    contact: [],
    property: [],
    document: [],
    event: [],
    request: [],
    deal: [],
  };

  const timingPerType: Record<EntityType, number> = {
    contact: 0,
    property: 0,
    document: 0,
    event: 0,
    request: 0,
    deal: 0,
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
