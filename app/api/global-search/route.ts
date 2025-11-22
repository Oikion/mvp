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

    // Search Properties (MLS)
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
        take: 5,
        orderBy: { updatedAt: "desc" },
      });
    } catch (error) {
      console.error("[GLOBAL_SEARCH] Properties search error:", error);
    }

    // Search Clients (CRM)
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
        take: 10, // Increased limit to ensure we get results
        orderBy: { updatedAt: "desc" },
      });

      // Debug logging (remove in production)
      if (process.env.NODE_ENV === "development") {
        console.log("[GLOBAL_SEARCH] Query:", query);
        console.log("[GLOBAL_SEARCH] Organization ID:", organizationId);
        console.log("[GLOBAL_SEARCH] Clients found:", clients.length);
        if (clients.length > 0) {
          console.log("[GLOBAL_SEARCH] Sample client names:", clients.map((c: any) => ({
            name: c.client_name,
            orgId: c.organizationId
          })).slice(0, 5));
        } else {
          // Try a direct query to see if clients exist at all
          const allClients = await db.clients.findMany({ take: 5 });
          console.log("[GLOBAL_SEARCH] Total clients in org:", allClients.length);
          if (allClients.length > 0) {
            console.log("[GLOBAL_SEARCH] Sample all client names:", allClients.map((c: any) => c.client_name));
          }
        }
      }
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
        take: 5,
        orderBy: { updatedAt: "desc" },
      });
    } catch (error) {
      console.error("[GLOBAL_SEARCH] Documents search error:", error);
    }

    // Search Calendar Events (wrap in try-catch in case model isn't available)
    let events: any[] = [];
    try {
      // Check if calComEvent exists on the db object
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
          take: 5,
          orderBy: { startTime: "desc" },
        });
      }
    } catch (eventError: any) {
      console.error("[GLOBAL_SEARCH] Calendar events search error:", eventError?.message || eventError);
      // Continue without events if there's an error
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

    return NextResponse.json({
      properties: serializePrismaObject(properties),
      clients: serializePrismaObject(clients),
      contacts: serializePrismaObject(contacts),
      documents: serializePrismaObject(documents),
      events: serializePrismaObject(events),
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

