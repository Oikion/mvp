import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";

/**
 * Entity types that can be searched
 */
type SearchEntityType = "property" | "client" | "contact" | "document" | "event";

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
    const types = body.types || ["property", "client", "contact", "document", "event"];
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
        meta: {
          query: query || "",
          page,
          limit,
          counts: { properties: 0, clients: 0, contacts: 0, documents: 0, events: 0, total: 0 },
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
            Client_Properties: {
              include: { Clients: { select: { id: true, client_name: true } } },
              take: 3,
            },
            CalComEvent: {
              select: { id: true, title: true, startTime: true },
              take: 3,
              orderBy: { startTime: "desc" },
            },
            _count: { select: { Client_Properties: true, CalComEvent: true } },
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

    // Clients search
    if (types.includes("client")) {
      const clientWhere = {
        OR: [
          { client_name: { contains: query, mode: "insensitive" as const } },
          { primary_email: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } },
        ],
      };

      searchPromises.push(
        db.clients.findMany({
          where: clientWhere,
          include: includeRelationships ? {
            Client_Properties: {
              include: { Properties: { select: { id: true, property_name: true } } },
              take: 3,
            },
            CalComEvent: {
              select: { id: true, title: true, startTime: true },
              take: 3,
              orderBy: { startTime: "desc" },
            },
            _count: { select: { Client_Properties: true, CalComEvent: true } },
          } : undefined,
          take: limit,
          skip,
          orderBy: { updatedAt: "desc" },
        }).catch(() => [])
      );
      countPromises.push(db.clients.count({ where: clientWhere }).catch(() => 0));
    } else {
      searchPromises.push(Promise.resolve([]));
      countPromises.push(Promise.resolve(0));
    }

    // Contacts search
    if (types.includes("contact")) {
      const contactWhere = {
        OR: [
          { contact_first_name: { contains: query, mode: "insensitive" as const } },
          { contact_last_name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      };

      searchPromises.push(
        db.client_Contacts.findMany({
          where: contactWhere,
          include: includeRelationships ? {
            Clients: { select: { id: true, client_name: true } },
          } : undefined,
          take: limit,
          skip,
          orderBy: { updatedAt: "desc" },
        }).catch(() => [])
      );
      countPromises.push(db.client_Contacts.count({ where: contactWhere }).catch(() => 0));
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
            _count: { select: { Clients: true, Properties: true, CalComEvent: true } },
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
      const calComEventModel = (db as any).calComEvent;
      if (calComEventModel && typeof calComEventModel.findMany === "function") {
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
          calComEventModel.findMany({
            where: eventWhere,
            include: includeRelationships ? {
              linkedClients: { select: { id: true, client_name: true }, take: 3 },
              linkedProperties: { select: { id: true, property_name: true }, take: 3 },
              _count: { select: { linkedClients: true, linkedProperties: true } },
            } : undefined,
            take: limit,
            skip,
            orderBy: { startTime: "desc" },
          }).catch(() => [])
        );
        countPromises.push(calComEventModel.count({ where: eventWhere }).catch(() => 0));
      } else {
        searchPromises.push(Promise.resolve([]));
        countPromises.push(Promise.resolve(0));
      }
    } else {
      searchPromises.push(Promise.resolve([]));
      countPromises.push(Promise.resolve(0));
    }

    // Execute all searches and counts in parallel
    const [searchResults, counts] = await Promise.all([
      Promise.all(searchPromises),
      Promise.all(countPromises),
    ]);

    const [properties, clients, contacts, documents, events] = searchResults;
    const [propertiesCount, clientsCount, contactsCount, documentsCount, eventsCount] = counts;

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
          count: p._count?.Client_Properties || 0,
          preview: p.Client_Properties?.map((cp: any) => cp.Clients) || [],
        },
        events: {
          count: p._count?.CalComEvent || 0,
          preview: p.CalComEvent || [],
        },
      } : undefined,
    }));

    const transformedClients = clients.map((c: any) => ({
      ...c,
      relationships: includeRelationships ? {
        properties: {
          count: c._count?.Client_Properties || 0,
          preview: c.Client_Properties?.map((cp: any) => cp.Properties) || [],
        },
        events: {
          count: c._count?.CalComEvent || 0,
          preview: c.CalComEvent || [],
        },
      } : undefined,
    }));

    const transformedContacts = contacts.map((c: any) => ({
      ...c,
      relationships: includeRelationships ? {
        client: c.Clients || null,
      } : undefined,
    }));

    const transformedDocuments = documents.map((d: any) => ({
      ...d,
      relationships: includeRelationships ? {
        clients: { count: d._count?.Clients || 0 },
        properties: { count: d._count?.Properties || 0 },
        events: { count: d._count?.CalComEvent || 0 },
      } : undefined,
    }));

    const transformedEvents = events.map((e: any) => ({
      ...e,
      relationships: includeRelationships ? {
        clients: {
          count: e._count?.linkedClients || 0,
          preview: e.linkedClients || [],
        },
        properties: {
          count: e._count?.linkedProperties || 0,
          preview: e.linkedProperties || [],
        },
      } : undefined,
    }));

    const totalCount = propertiesCount + clientsCount + contactsCount + documentsCount + eventsCount;
    const totalResults = properties.length + clients.length + contacts.length + documents.length + events.length;

    const response: SearchResponse = {
      properties: serializePrismaObject(transformedProperties),
      clients: serializePrismaObject(transformedClients),
      contacts: serializePrismaObject(transformedContacts),
      documents: serializePrismaObject(transformedDocuments),
      events: serializePrismaObject(transformedEvents),
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
          total: totalCount,
        },
        hasMore: skip + totalResults < totalCount,
        timing: performance.now() - startTime,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GLOBAL_SEARCH_POST]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Search failed", details: errorMessage },
      { status: 500 }
    );
  }
}
