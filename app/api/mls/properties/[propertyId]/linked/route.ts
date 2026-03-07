import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { decryptCalendarEventForOrg, decryptClientForOrg, decryptMandateForOrg } from "@/lib/model-encryption";

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

    // Fetch linked clients
    const linkedClientsRaw = await prismadb.client_Properties.findMany({
      where: {
        propertyId,
      },
      include: {
        Clients: {
          select: {
            id: true,
            client_name: true,
            client_type: true,
            client_status: true,
            primary_email: true,
            primary_phone: true,
            intent: true,
            createdAt: true,
            updatedAt: true,
            Users_Clients_assigned_toToUsers: {
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

    // Decrypt and map to expected field names
    const linkedClients = await Promise.all(
      linkedClientsRaw.map(async (lc) => {
        if (!lc.Clients) return { ...lc, client: null };
        const decrypted = await decryptClientForOrg(lc.Clients, property.organizationId);
        return {
          ...lc,
          client: {
            ...decrypted,
            assigned_to_user: lc.Clients.Users_Clients_assigned_toToUsers,
          },
        };
      })
    );

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
        Clients: {
          select: {
            id: true,
            client_name: true,
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
        // Also decrypt linked client names
        const decryptedClients = await Promise.all(
          event.Clients.map(async (c) => {
            const dc = await decryptClientForOrg(c, property.organizationId);
            return { id: dc.id, client_name: dc.client_name };
          })
        );
        return {
          ...decrypted,
          assignedUser: event.Users,
          linkedClients: decryptedClients,
        };
      })
    );

    // Fetch linked mandates
    const linkedMandatesRaw = await prismadb.mandate_Properties.findMany({
      where: { propertyId },
      include: {
        Mandate: {
          select: {
            id: true,
            friendlyId: true,
            title: true,
            transaction_type: true,
            status: true,
            urgency: true,
            budget_min: true,
            budget_max: true,
            organizationId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter to same org and decrypt titles
    const mandates = await Promise.all(
      linkedMandatesRaw
        .filter((lm) => lm.Mandate.organizationId === property!.organizationId)
        .map(async (lm) => {
          const { organizationId: _, ...rest } = lm.Mandate;
          const decrypted = await decryptMandateForOrg(rest, property!.organizationId);
          return decrypted;
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
      clients: serializePrismaObject(linkedClients.map((lc) => lc.client)),
      mandates: serializePrismaObject(mandates),
      events: {
        upcoming: serializePrismaObject(upcomingEvents),
        past: serializePrismaObject(pastEvents),
        total: linkedEvents.length,
      },
      counts: {
        clients: linkedClients.length,
        mandates: mandates.length,
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


