import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { decryptCalendarEventForOrg, decryptContactForOrg, decryptRequestForOrg, decryptDocumentForOrg } from "@/lib/model-encryption";
import { logPiiAccess } from "@/lib/pii-access-log";

/**
 * GET /api/mls/properties/[propertyId]/linked
 * Fetch linked clients and calendar events for a property
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { propertyId } = await params;

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    // First, try to find property in user's organization
    let property = await prismadb.properties.findFirst({
      where: {
        id: propertyId,
        organizationId,
      },
      select: {
        id: true,
        property_name: true,
        organizationId: true,
      },
    });

    // If not found in org, check if it was shared with the user
    if (!property) {
      const sharedAccess = await prismadb.sharedEntity.findFirst({
        where: {
          entityType: "PROPERTY",
          entityId: propertyId,
          sharedWithId: user.id,
        },
      });

      if (sharedAccess) {
        property = await prismadb.properties.findFirst({
          where: {
            id: propertyId,
          },
          select: {
            id: true,
            property_name: true,
            organizationId: true,
          },
        });
      }
    }

    if (!property) {
      return NextResponse.json(
        { error: "Property not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch linked contacts (via ContactProperty M2M — replaces legacy client_Properties)
    const linkedContactsRaw = await prismadb.contactProperty.findMany({
      where: {
        propertyId,
        contact: { organizationId },
      },
      include: {
        contact: {
          select: {
            id: true,
            friendlyId: true,
            displayName: true,
            email: true,
            primaryPhone: true,
            status: true,
            category: true,
            createdAt: true,
            updatedAt: true,
            assignedAgent: {
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

    // Decrypt and map to shape expected by usePropertyLinked (key: "clients" kept for frontend compat)
    const linkedClients = await Promise.all(
      linkedContactsRaw.map(async (lc) => {
        if (!lc.contact) return null;
        const decrypted = await decryptContactForOrg(lc.contact, property.organizationId);
        logPiiAccess({
          userId: user.id,
          organizationId: property.organizationId,
          entityType: "CONTACT",
          entityId: lc.contact.id,
          action: "DECRYPT",
          fields: ["displayName", "email", "primaryPhone"],
          source: "GET /api/mls/properties/[propertyId]/linked",
        }).catch(() => {});
        return {
          ...decrypted,
          assigned_to_user: lc.contact.assignedAgent,
        };
      })
    ).then((results) => results.filter(Boolean));

    // Fetch linked calendar events (use property's org for shared properties)
    const linkedEventsRaw = await prismadb.calendarEvent.findMany({
      where: {
        organizationId: property.organizationId,
        Properties: {
          some: {
            id: propertyId,
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
        Contacts: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        startTime: "desc",
      },
    });

    // Decrypt and map to expected field names
    const linkedEvents = await Promise.all(
      linkedEventsRaw.map(async (event) => {
        const decrypted = await decryptCalendarEventForOrg(event, property.organizationId);
        logPiiAccess({
          userId: user.id,
          organizationId: property.organizationId,
          entityType: "CALENDAR_EVENT",
          entityId: event.id,
          action: "DECRYPT",
          fields: ["title", "description", "location"],
          source: "GET /api/mls/properties/[propertyId]/linked",
        }).catch(() => {});
        // Decrypt linked contact display names
        const decryptedContacts = await Promise.all(
          event.Contacts.map(async (c) => {
            const dc = await decryptContactForOrg(c, property.organizationId);
            logPiiAccess({
              userId: user.id,
              organizationId: property.organizationId,
              entityType: "CONTACT",
              entityId: c.id,
              action: "DECRYPT",
              fields: ["displayName"],
              source: "GET /api/mls/properties/[propertyId]/linked (event contact)",
            }).catch(() => {});
            return { id: dc.id, client_name: dc.displayName };
          })
        );
        return {
          ...decrypted,
          assignedUser: event.Users,
          // key kept as "linkedClients" for frontend compat (usePropertyLinked / PropertyView)
          linkedClients: decryptedContacts,
        };
      })
    );

    // Fetch linked requests (via PropertyRequestMatch)
    const linkedRequestMatchesRaw = await prismadb.propertyRequestMatch.findMany({
      where: { propertyId, organizationId: property.organizationId },
      include: {
        request: {
          select: {
            id: true,
            friendlyId: true,
            name: true,
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

    // Decrypt titles
    const mandates = await Promise.all(
      linkedRequestMatchesRaw.map(async (match) => {
        const { organizationId: _, ...rest } = match.request;
        const decrypted = await decryptRequestForOrg(rest, property!.organizationId);
        logPiiAccess({
          userId: user.id,
          organizationId: property!.organizationId,
          entityType: "REQUEST",
          entityId: match.request.id,
          action: "DECRYPT",
          fields: ["name", "notes"],
          source: "GET /api/mls/properties/[propertyId]/linked",
        }).catch(() => {});
        return decrypted;
      })
    );

    // Fetch linked documents
    const linkedDocumentsRaw = await prismadb.documents.findMany({
      where: {
        organizationId: property.organizationId,
        Properties: { some: { id: propertyId } },
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
      linkedDocumentsRaw.map(async (doc) => {
        const dec = await decryptDocumentForOrg(doc, property.organizationId);
        logPiiAccess({
          userId: user.id,
          organizationId: property.organizationId,
          entityType: "DOCUMENT",
          entityId: doc.id,
          action: "DECRYPT",
          fields: ["document_name"],
          source: "GET /api/mls/properties/[propertyId]/linked",
        }).catch(() => {});
        return dec;
      })
    );

    // Get upcoming events (future events)
    const now = new Date();
    const upcomingEvents = linkedEvents.filter(
      (event) => new Date(event.startTime) >= now
    );
    const pastEvents = linkedEvents.filter(
      (event) => new Date(event.startTime) < now
    );

    // Helper function to serialize Prisma objects
    const serializePrismaObject = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return obj;
      }
      if (obj && typeof obj === "object" && "toNumber" in obj && typeof obj.toNumber === "function") {
        return obj.toNumber();
      }
      if (obj instanceof Date) {
        return obj.toISOString();
      }
      if (Array.isArray(obj)) {
        return obj.map(serializePrismaObject);
      }
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
      property: serializePrismaObject(property),
      // key "clients" kept for frontend compat — usePropertyLinked and PropertyView both read data?.clients
      clients: serializePrismaObject(linkedClients),
      mandates: serializePrismaObject(mandates),
      documents: serializePrismaObject(documents),
      events: {
        upcoming: serializePrismaObject(upcomingEvents),
        past: serializePrismaObject(pastEvents),
        total: linkedEvents.length,
      },
      counts: {
        clients: linkedClients.length,
        mandates: mandates.length,
        documents: documents.length,
        events: linkedEvents.length,
        upcomingEvents: upcomingEvents.length,
      },
    });
  } catch (error) {
    console.error("[PROPERTY_LINKED_GET]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch linked entities", details: errorMessage },
      { status: 500 }
    );
  }
}


