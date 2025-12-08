import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";

export async function POST(req: Request) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();

    const query = body.query?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({
        properties: [],
        clients: [],
        contacts: [],
        documents: [],
        events: [],
      });
    }

    const db = prismaForOrg(organizationId);

    // Search Properties (MLS) with linked entities
    let properties: any[] = [];
    try {
      properties = await db.properties.findMany({
        where: {
          OR: [
            { property_name: { contains: query, mode: "insensitive" } },
            { area: { contains: query, mode: "insensitive" } },
            { municipality: { contains: query, mode: "insensitive" } },
            { postal_code: { contains: query, mode: "insensitive" } },
            { address_street: { contains: query, mode: "insensitive" } },
            { address_city: { contains: query, mode: "insensitive" } },
            { primary_email: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          linked_clients: {
            include: {
              client: {
                select: { id: true, client_name: true },
              },
            },
            take: 3,
          },
          linkedEvents: {
            select: { id: true, title: true, startTime: true },
            take: 3,
            orderBy: { startTime: "desc" },
          },
          _count: {
            select: {
              linked_clients: true,
              linkedEvents: true,
            },
          },
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      });
    } catch (error) {
      console.error("[GLOBAL_SEARCH] Properties search error:", error);
    }

    // Search Clients (CRM) with linked entities
    let clients: any[] = [];
    try {
      clients = await db.clients.findMany({
        where: {
          OR: [
            { client_name: { contains: query, mode: "insensitive" } },
            { primary_email: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          linked_properties: {
            include: {
              property: {
                select: { id: true, property_name: true },
              },
            },
            take: 3,
          },
          linkedEvents: {
            select: { id: true, title: true, startTime: true },
            take: 3,
            orderBy: { startTime: "desc" },
          },
          _count: {
            select: {
              linked_properties: true,
              linkedEvents: true,
            },
          },
        },
        take: 10,
        orderBy: { updatedAt: "desc" },
      });
    } catch (error) {
      console.error("[GLOBAL_SEARCH] Clients search error:", error);
    }

    // Search Contacts (CRM)
    let contacts: any[] = [];
    try {
      contacts = await db.client_Contacts.findMany({
        where: {
          OR: [
            { contact_first_name: { contains: query, mode: "insensitive" } },
            { contact_last_name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          assigned_client: {
            select: { id: true, client_name: true },
          },
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      });
    } catch (error) {
      console.error("[GLOBAL_SEARCH] Contacts search error:", error);
    }

    // Search Documents
    let documents: any[] = [];
    try {
      documents = await db.documents.findMany({
        where: {
          OR: [
            { document_name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          _count: {
            select: {
              accounts: true,
              linkedProperties: true,
              linkedCalComEvents: true,
            },
          },
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      });
    } catch (error) {
      console.error("[GLOBAL_SEARCH] Documents search error:", error);
    }

    // Search Calendar Events with linked entities
    let events: any[] = [];
    try {
      const calComEventModel = (db as any).calComEvent;
      if (calComEventModel && typeof calComEventModel.findMany === "function") {
        events = await calComEventModel.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { location: { contains: query, mode: "insensitive" } },
              { attendeeName: { contains: query, mode: "insensitive" } },
              { attendeeEmail: { contains: query, mode: "insensitive" } },
              { notes: { contains: query, mode: "insensitive" } },
            ],
          },
          include: {
            linkedClients: {
              select: { id: true, client_name: true },
              take: 3,
            },
            linkedProperties: {
              select: { id: true, property_name: true },
              take: 3,
            },
            _count: {
              select: {
                linkedClients: true,
                linkedProperties: true,
              },
            },
          },
          take: 5,
          orderBy: { startTime: "desc" },
        });
      }
    } catch (eventError: any) {
      console.error("[GLOBAL_SEARCH] Calendar events search error:", eventError?.message || eventError);
      events = [];
    }

    // Helper function to serialize Prisma objects (convert Decimal to number, Date to ISO string)
    const serializePrismaObject = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return obj;
      }
      // Handle Prisma Decimal objects
      if (obj && typeof obj === 'object' && 'toNumber' in obj && typeof obj.toNumber === 'function') {
        return obj.toNumber();
      }
      // Handle Date objects
      if (obj instanceof Date) {
        return obj.toISOString();
      }
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(serializePrismaObject);
      }
      // Handle objects
      if (typeof obj === 'object') {
        const serialized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          serialized[key] = serializePrismaObject(value);
        }
        return serialized;
      }
      return obj;
    };

    // Transform results to include relationship data
    const transformedProperties = properties.map((p: any) => ({
      ...p,
      relationships: {
        clients: {
          count: p._count?.linked_clients || 0,
          preview: p.linked_clients?.map((lc: any) => lc.client) || [],
        },
        events: {
          count: p._count?.linkedEvents || 0,
          preview: p.linkedEvents || [],
        },
      },
    }));

    const transformedClients = clients.map((c: any) => ({
      ...c,
      relationships: {
        properties: {
          count: c._count?.linked_properties || 0,
          preview: c.linked_properties?.map((lp: any) => lp.property) || [],
        },
        events: {
          count: c._count?.linkedEvents || 0,
          preview: c.linkedEvents || [],
        },
      },
    }));

    const transformedContacts = contacts.map((c: any) => ({
      ...c,
      relationships: {
        client: c.assigned_client || null,
      },
    }));

    const transformedDocuments = documents.map((d: any) => ({
      ...d,
      relationships: {
        clients: { count: d._count?.accounts || 0 },
        properties: { count: d._count?.linkedProperties || 0 },
        events: { count: d._count?.linkedCalComEvents || 0 },
      },
    }));

    const transformedEvents = events.map((e: any) => ({
      ...e,
      relationships: {
        clients: {
          count: e._count?.linkedClients || 0,
          preview: e.linkedClients || [],
        },
        properties: {
          count: e._count?.linkedProperties || 0,
          preview: e.linkedProperties || [],
        },
      },
    }));

    return NextResponse.json({
      properties: serializePrismaObject(transformedProperties),
      clients: serializePrismaObject(transformedClients),
      contacts: serializePrismaObject(transformedContacts),
      documents: serializePrismaObject(transformedDocuments),
      events: serializePrismaObject(transformedEvents),
    });
  } catch (error) {
    console.error("[GLOBAL_SEARCH_POST]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Search failed", details: errorMessage },
      { status: 500 }
    );
  }
}

