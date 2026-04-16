import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";
import { decryptMandateForOrg } from "@/lib/model-encryption";

/**
 * Entity types that can be searched
 */
type SearchEntityType = "property" | "client" | "contact" | "document" | "event" | "mandate" | "request";

/**
 * Request body for search
 */
interface SearchRequestBody {
  query: string;
  /** Entity types to search (default: all) */
  types?: SearchEntityType[];
  /** Page number for pagination (1-indexed, default: 1) */
  page?: number;
  /** Items per page (default: 50, max: 100) */
  limit?: number;
  /** Whether to include relationship data (default: true) */
  includeRelationships?: boolean;
}

/**
 * Response structure with pagination metadata
 */
interface SearchResponse {
  properties: any[];
  clients: any[];
  contacts: any[];
  documents: any[];
  events: any[];
  requests: any[];
  meta: {
    query: string;
    page: number;
    limit: number;
    counts: {
      properties: number;
      clients: number;
      contacts: number;
      documents: number;
      events: number;
      requests: number;
      total: number;
    };
    hasMore: boolean;
    timing: number;
  };
}

export async function POST(req: Request) {
  const startTime = performance.now();
  
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body: SearchRequestBody = await req.json();

    const query = body.query?.trim();
    const types = body.types || ["property", "client", "contact", "document", "event", "request"];
    const page = Math.max(1, body.page || 1);
    const limit = Math.min(100, Math.max(1, body.limit || 50));
    const includeRelationships = body.includeRelationships !== false;
    const skip = (page - 1) * limit;

    if (!query || query.length < 2) {
      return NextResponse.json({
        properties: [],
        clients: [],
        contacts: [],
        documents: [],
        events: [],
        requests: [],
        meta: {
          query: query || "",
          page,
          limit,
          counts: { properties: 0, clients: 0, contacts: 0, documents: 0, events: 0, requests: 0, total: 0 },
          hasMore: false,
          timing: performance.now() - startTime,
        },
      });
    }

    const db = prismaForOrg(organizationId);

    // Run searches in parallel for performance
    const searchPromises: Promise<any>[] = [];
    const countPromises: Promise<number>[] = [];

    // Properties search
    if (types.includes("property")) {
      const propertyWhere = {
        OR: [
          { property_name: { contains: query, mode: "insensitive" as const } },
          { area: { contains: query, mode: "insensitive" as const } },
          { municipality: { contains: query, mode: "insensitive" as const } },
          { postal_code: { contains: query, mode: "insensitive" as const } },
          { address_street: { contains: query, mode: "insensitive" as const } },
          { address_city: { contains: query, mode: "insensitive" as const } },
          { primary_email: { contains: query, mode: "insensitive" as const } },
        ],
      };

      searchPromises.push(
        db.properties.findMany({
          where: propertyWhere,
          include: includeRelationships ? {
            linkedContacts: {
              include: { contact: { select: { id: true, displayName: true } } },
              take: 3,
            },
            CalendarEvent: {
              select: { id: true, title: true, startTime: true },
              take: 3,
              orderBy: { startTime: "desc" },
            },
            Mandate_Properties: {
              include: { Mandate: { select: { id: true, title: true, friendlyId: true } } },
              take: 3,
            },
            _count: { select: { linkedContacts: true, CalendarEvent: true, Mandate_Properties: true } },
          } : undefined,
          take: limit,
          skip,
          orderBy: { updatedAt: "desc" },
        }).catch(() => [])
      );
      countPromises.push(db.properties.count({ where: propertyWhere }).catch(() => 0));
    } else {
      searchPromises.push(Promise.resolve([]));
      countPromises.push(Promise.resolve(0));
    }

    // Clients/Contacts search (now unified Contact model)
    if (types.includes("client")) {
      const clientWhere = {
        OR: [
          { displayName: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
          { notes: { contains: query, mode: "insensitive" as const } },
        ],
      };

      searchPromises.push(
        db.contact.findMany({
          where: clientWhere,
          include: includeRelationships ? {
            linkedProperties: {
              include: { property: { select: { id: true, property_name: true } } },
              take: 3,
            },
            _count: { select: { linkedProperties: true } },
          } : undefined,
          take: limit,
          skip,
          orderBy: { updatedAt: "desc" },
        }).catch(() => [])
      );
      countPromises.push(db.contact.count({ where: clientWhere }).catch(() => 0));
    } else {
      searchPromises.push(Promise.resolve([]));
      countPromises.push(Promise.resolve(0));
    }

    // Contacts search (legacy — now same as client search, return empty to avoid duplicates)
    if (types.includes("contact")) {
      const contactWhere = {
        OR: [
          { firstName: { contains: query, mode: "insensitive" as const } },
          { lastName: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      };

      searchPromises.push(
        db.contact.findMany({
          where: contactWhere,
          take: limit,
          skip,
          orderBy: { updatedAt: "desc" },
        }).catch(() => [])
      );
      countPromises.push(db.contact.count({ where: contactWhere }).catch(() => 0));
    } else {
      searchPromises.push(Promise.resolve([]));
      countPromises.push(Promise.resolve(0));
    }

    // Documents search
    if (types.includes("document")) {
      const documentWhere = {
        OR: [
          { document_name: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } },
        ],
      };

      searchPromises.push(
        db.documents.findMany({
          where: documentWhere,
          include: includeRelationships ? {
            _count: { select: { Contacts: true, Properties: true, CalendarEvent: true } },
          } : undefined,
          take: limit,
          skip,
          orderBy: { updatedAt: "desc" },
        }).catch(() => [])
      );
      countPromises.push(db.documents.count({ where: documentWhere }).catch(() => 0));
    } else {
      searchPromises.push(Promise.resolve([]));
      countPromises.push(Promise.resolve(0));
    }

    // Events search
    if (types.includes("event")) {
      const calendarEventModel = (db as any).calendarEvent;
      if (calendarEventModel && typeof calendarEventModel.findMany === "function") {
        const eventWhere = {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { description: { contains: query, mode: "insensitive" as const } },
            { location: { contains: query, mode: "insensitive" as const } },
            { attendeeName: { contains: query, mode: "insensitive" as const } },
            { attendeeEmail: { contains: query, mode: "insensitive" as const } },
            { notes: { contains: query, mode: "insensitive" as const } },
          ],
        };

        searchPromises.push(
          calendarEventModel.findMany({
            where: eventWhere,
            include: includeRelationships ? {
              linkedProperties: { select: { id: true, property_name: true }, take: 3 },
              _count: { select: { linkedProperties: true } },
            } : undefined,
            take: limit,
            skip,
            orderBy: { startTime: "desc" },
          }).catch(() => [])
        );
        countPromises.push(calendarEventModel.count({ where: eventWhere }).catch(() => 0));
      } else {
        searchPromises.push(Promise.resolve([]));
        countPromises.push(Promise.resolve(0));
      }
    } else {
      searchPromises.push(Promise.resolve([]));
      countPromises.push(Promise.resolve(0));
    }

    // Requests search (encrypted title — fetch, decrypt, filter in-memory)
    // Accept both "request" (new) and "mandate" (backward compat) as type values
    if (types.includes("request") || types.includes("mandate")) {
      const mandateWhere: any = {};

      // We can only filter by plaintext fields at DB level
      // friendlyId is plaintext, so we can use it
      // title is encrypted, so we fetch a larger batch and filter after decryption
      const fetchLimit = Math.max(limit * 5, 50);

      searchPromises.push(
        db.mandate.findMany({
          where: mandateWhere,
          include: includeRelationships ? {
            Mandate_Properties: {
              include: { Properties: { select: { id: true, property_name: true } } },
              take: 3,
            },
            _count: { select: { Mandate_Properties: true } },
          } : undefined,
          take: fetchLimit,
          orderBy: { createdAt: "desc" },
        }).then(async (mandates: any[]) => {
          // Decrypt and filter in memory
          const decrypted = await Promise.all(
            mandates.map((m: any) => decryptMandateForOrg(m, organizationId))
          );
          const searchTerm = query.toLowerCase();
          const filtered = decrypted.filter((m: any) => {
            const title = (m.title || "").toLowerCase();
            const fid = (m.friendlyId || "").toLowerCase();
            const txType = (m.transaction_type || "").toLowerCase();
            return title.includes(searchTerm) || fid.includes(searchTerm) || txType.includes(searchTerm);
          });
          return filtered.slice(skip, skip + limit);
        }).catch(() => [])
      );
      // Count also needs decrypt + filter
      countPromises.push(
        db.mandate.findMany({
          where: mandateWhere,
          select: { id: true, title: true, friendlyId: true, transaction_type: true },
          take: 500,
        }).then(async (mandates: any[]) => {
          const decrypted = await Promise.all(
            mandates.map((m: any) => decryptMandateForOrg(m, organizationId))
          );
          const searchTerm = query.toLowerCase();
          return decrypted.filter((m: any) => {
            const title = (m.title || "").toLowerCase();
            const fid = (m.friendlyId || "").toLowerCase();
            const txType = (m.transaction_type || "").toLowerCase();
            return title.includes(searchTerm) || fid.includes(searchTerm) || txType.includes(searchTerm);
          }).length;
        }).catch(() => 0)
      );
    } else {
      searchPromises.push(Promise.resolve([]));
      countPromises.push(Promise.resolve(0));
    }

    // Execute all searches and counts in parallel
    const [searchResults, counts] = await Promise.all([
      Promise.all(searchPromises),
      Promise.all(countPromises),
    ]);

    const [properties, clients, contacts, documents, events, requests] = searchResults;
    const [propertiesCount, clientsCount, contactsCount, documentsCount, eventsCount, requestsCount] = counts;

    // Helper function to serialize Prisma objects
    const serializePrismaObject = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (obj && typeof obj === 'object' && 'toNumber' in obj && typeof obj.toNumber === 'function') {
        return obj.toNumber();
      }
      if (obj instanceof Date) return obj.toISOString();
      if (Array.isArray(obj)) return obj.map(serializePrismaObject);
      if (typeof obj === 'object') {
        const serialized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          serialized[key] = serializePrismaObject(value);
        }
        return serialized;
      }
      return obj;
    };

    // Transform results
    const transformedProperties = properties.map((p: any) => ({
      ...p,
      relationships: includeRelationships ? {
        clients: {
          count: p._count?.ContactProperty || 0,
          preview: p.ContactProperty?.map((cp: any) => cp.Contact) || [],
        },
        events: {
          count: p._count?.CalendarEvent || 0,
          preview: p.CalendarEvent || [],
        },
        requests: {
          count: p._count?.Mandate_Properties || 0,
          preview: p.Mandate_Properties?.map((mp: any) => mp.Mandate) || [],
        },
      } : undefined,
    }));

    const transformedClients = clients.map((c: any) => ({
      ...c,
      relationships: includeRelationships ? {
        properties: {
          count: c._count?.ContactProperty || 0,
          preview: c.ContactProperty?.map((cp: any) => cp.Property) || [],
        },
        events: {
          count: 0,
          preview: [],
        },
        requests: {
          count: 0,
          preview: [],
        },
      } : undefined,
    }));

    const transformedContacts = contacts.map((c: any) => ({
      ...c,
      relationships: undefined,
    }));

    const transformedDocuments = documents.map((d: any) => ({
      ...d,
      relationships: includeRelationships ? {
        clients: { count: d._count?.Contacts || 0 },
        properties: { count: d._count?.Properties || 0 },
        events: { count: d._count?.CalendarEvent || 0 },
      } : undefined,
    }));

    const transformedEvents = events.map((e: any) => ({
      ...e,
      relationships: includeRelationships ? {
        clients: {
          count: 0,
          preview: [],
        },
        properties: {
          count: e._count?.linkedProperties || 0,
          preview: e.linkedProperties || [],
        },
      } : undefined,
    }));

    const transformedRequests = requests.map((m: any) => ({
      ...m,
      relationships: includeRelationships ? {
        clients: {
          count: 0,
          preview: [],
        },
        properties: {
          count: m._count?.Mandate_Properties || 0,
          preview: m.Mandate_Properties?.map((mp: any) => mp.Properties) || [],
        },
      } : undefined,
    }));

    const totalCount = propertiesCount + clientsCount + contactsCount + documentsCount + eventsCount + requestsCount;
    const totalResults = properties.length + clients.length + contacts.length + documents.length + events.length + requests.length;

    const response: SearchResponse = {
      properties: serializePrismaObject(transformedProperties),
      clients: serializePrismaObject(transformedClients),
      contacts: serializePrismaObject(transformedContacts),
      documents: serializePrismaObject(transformedDocuments),
      events: serializePrismaObject(transformedEvents),
      requests: serializePrismaObject(transformedRequests),
      meta: {
        query,
        page,
        limit,
        counts: {
          properties: propertiesCount,
          clients: clientsCount,
          contacts: contactsCount,
          documents: documentsCount,
          events: eventsCount,
          requests: requestsCount,
          total: totalCount,
        },
        hasMore: skip + totalResults < totalCount,
        timing: performance.now() - startTime,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GLOBAL_SEARCH_POST]", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
