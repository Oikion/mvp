import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { decryptCalendarEventForOrg, decryptDocumentForOrg } from "@/lib/model-encryption";

/**
 * GET /api/crm/clients/[clientId]/linked
 * Fetch linked properties, calendar events, requests, and documents for a contact.
 * Route preserved under /clients/ path for backwards compatibility with usePrefetch.ts.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { clientId } = await params;

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    // Verify contact belongs to organization
    const client = await prismadb.contact.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
      select: {
        id: true,
        displayName: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch linked properties
    const linkedPropertiesRaw = await prismadb.contactProperty.findMany({
      where: {
        contactId: clientId,
      },
      include: {
        property: {
          select: {
            id: true,
            friendlyId: true,
            property_name: true,
            property_type: true,
            property_status: true,
            address_street: true,
            address_city: true,
            area: true,
            price: true,
            bedrooms: true,
            bathrooms: true,
            createdAt: true,
            updatedAt: true,
            Users_Properties_assigned_toToUsers: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const linkedProperties = linkedPropertiesRaw.map((lp) => ({
      ...lp,
      property: lp.property ? {
        ...lp.property,
        assigned_to_user: lp.property.Users_Properties_assigned_toToUsers,
      } : null,
    }));

    // Fetch linked calendar events
    const linkedEventsRaw = await prismadb.calendarEvent.findMany({
      where: {
        organizationId,
        EventContacts: {
          some: {
            contactId: clientId,
          },
        },
      },
      select: {
        id: true,
        friendlyId: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        location: true,
        status: true,
        eventType: true,
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Properties: {
          select: {
            id: true,
            property_name: true,
          },
        },
      },
      orderBy: {
        startTime: "desc",
      },
    });

    const linkedEvents = await Promise.all(
      linkedEventsRaw.map(async (event) => {
        const decrypted = await decryptCalendarEventForOrg(event, organizationId);
        return {
          ...decrypted,
          assignedUser: event.Users,
          linkedProperties: event.Properties,
        };
      })
    );

    // Fetch linked requests (formerly mandates)
    const linkedRequestsRaw = await prismadb.requestContact.findMany({
      where: { contactId: clientId },
      include: {
        request: {
          select: {
            id: true,
            friendlyId: true,
            requestType: true,
            status: true,
            urgency: true,
            budgetMin: true,
            budgetMax: true,
            organizationId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mandates = linkedRequestsRaw
      .filter((lr) => lr.request.organizationId === organizationId)
      .map((lr) => {
        const { organizationId: _, ...rest } = lr.request;
        return rest;
      });

    // Fetch linked documents
    const linkedDocumentsRaw = await prismadb.documents.findMany({
      where: {
        organizationId,
        Contacts: { some: { id: clientId } },
      },
      select: {
        id: true,
        friendlyId: true,
        document_name: true,
        document_type: true,
        document_file_mimeType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const documents = await Promise.all(
      linkedDocumentsRaw.map((doc) => decryptDocumentForOrg(doc, organizationId))
    );

    const now = new Date();
    const upcomingEvents = linkedEvents.filter(
      (event) => new Date(event.startTime) >= now
    );
    const pastEvents = linkedEvents.filter(
      (event) => new Date(event.startTime) < now
    );

    const serializePrismaObject = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (obj && typeof obj === "object" && "toNumber" in obj && typeof obj.toNumber === "function") {
        return obj.toNumber();
      }
      if (obj instanceof Date) return obj.toISOString();
      if (Array.isArray(obj)) return obj.map(serializePrismaObject);
      if (typeof obj === "object") {
        const serialized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          serialized[key] = serializePrismaObject(value);
        }
        return serialized;
      }
      return obj;
    };

    return NextResponse.json({
      client: serializePrismaObject({ ...client, client_name: client.displayName }),
      properties: serializePrismaObject(linkedProperties.map((lp) => lp.property)),
      mandates: serializePrismaObject(mandates),
      documents: serializePrismaObject(documents),
      events: {
        upcoming: serializePrismaObject(upcomingEvents),
        past: serializePrismaObject(pastEvents),
        total: linkedEvents.length,
      },
      counts: {
        properties: linkedProperties.length,
        mandates: mandates.length,
        documents: documents.length,
        events: linkedEvents.length,
        upcomingEvents: upcomingEvents.length,
      },
    });
  } catch (error) {
    console.error("[CLIENT_LINKED_GET]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch linked entities", details: errorMessage },
      { status: 500 }
    );
  }
}
