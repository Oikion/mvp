import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { decryptContactForOrg, decryptCalendarEventForOrg, decryptDocumentForOrg } from "@/lib/model-encryption";

/**
 * GET /api/mandates/[mandateId]/linked
 * Fetch linked properties and clients for a mandate
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ mandateId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { mandateId } = await params;

    if (!mandateId) {
      return NextResponse.json(
        { error: "Mandate ID is required" },
        { status: 400 }
      );
    }

    // Verify mandate exists and belongs to org
    const mandate = await prismadb.mandate.findFirst({
      where: {
        id: mandateId,
        organizationId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!mandate) {
      return NextResponse.json(
        { error: "Mandate not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch linked properties
    const linkedPropertiesRaw = await prismadb.mandate_Properties.findMany({
      where: {
        mandateId,
      },
      include: {
        Properties: {
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

    // Map to expected field names
    const linkedProperties = linkedPropertiesRaw.map((lp) => ({
      ...lp.Properties,
      assigned_to_user: lp.Properties?.Users_Properties_assigned_toToUsers ?? null,
    }));

    // Mandate_Clients relation no longer exists in the new schema — return empty
    const linkedClients: any[] = [];

    // Fetch calendar events linked to the mandate's clients or properties
    const clientIds = linkedClients.map((c: any) => c.id).filter(Boolean);
    const propertyIds = linkedProperties.map((p: any) => p.id).filter(Boolean);

    let linkedEvents: any[] = [];
    if (propertyIds.length > 0) {
      const linkedEventsRaw = await prismadb.calendarEvent.findMany({
        where: {
          organizationId,
          OR: [
            ...(propertyIds.length > 0
              ? [{ Properties: { some: { id: { in: propertyIds } } } }]
              : []),
          ],
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
            select: { id: true, name: true, email: true },
          },
          Properties: {
            select: { id: true, property_name: true },
          },
        },
        orderBy: { startTime: "desc" },
      });

      linkedEvents = await Promise.all(
        linkedEventsRaw.map(async (event) => {
          const decrypted = await decryptCalendarEventForOrg(event, organizationId);
          return {
            ...decrypted,
            assignedUser: event.Users,
            linkedClients: [],
            linkedProperties: event.Properties.map((p) => ({
              id: p.id,
              property_name: p.property_name,
            })),
          };
        })
      );
    }

    // Fetch linked documents
    const linkedDocumentsRaw = await prismadb.documents.findMany({
      where: {
        organizationId,
        Mandates: { some: { id: mandateId } },
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
      (e) => new Date(e.startTime) >= now
    );
    const pastEvents = linkedEvents.filter(
      (e) => new Date(e.startTime) < now
    );

    // Helper function to serialize Prisma objects (Decimal, Date, etc.)
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
      mandate: serializePrismaObject(mandate),
      properties: serializePrismaObject(linkedProperties),
      clients: serializePrismaObject(linkedClients),
      documents: serializePrismaObject(documents),
      events: {
        upcoming: serializePrismaObject(upcomingEvents),
        past: serializePrismaObject(pastEvents),
        total: linkedEvents.length,
      },
      counts: {
        properties: linkedProperties.length,
        clients: linkedClients.length,
        documents: documents.length,
        events: linkedEvents.length,
        upcomingEvents: upcomingEvents.length,
      },
    });
  } catch (error) {
    console.error("[MANDATE_LINKED_GET]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch linked entities", details: errorMessage },
      { status: 500 }
    );
  }
}
