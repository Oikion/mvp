import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";
import { decryptCalendarEventForOrg, decryptDocumentForOrg } from "@/lib/model-encryption";
/**
 * GET /api/crm/contacts/[contactId]/linked
 * Fetch linked requests and owned properties for a contact.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const readCheck = await canPerformAction("contact:read");
    if (!readCheck.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { contactId } = await params;

    // Verify the contact belongs to this org
    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Fetch linked requests via RequestContact join table
    const requestContactRows = await prismadb.requestContact.findMany({
      where: { contactId, organizationId },
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
            locationDisplayName: true,
            municipality: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const requests = requestContactRows.map((rc) => ({
      id: rc.request.id,
      friendlyId: rc.request.friendlyId,
      requestType: rc.request.requestType,
      status: rc.request.status,
      urgency: rc.request.urgency,
      budgetMin: rc.request.budgetMin ? Number(rc.request.budgetMin) : undefined,
      budgetMax: rc.request.budgetMax ? Number(rc.request.budgetMax) : undefined,
      locationDisplayName: rc.request.locationDisplayName,
      municipality: rc.request.municipality,
      role: rc.role,
    }));

    // Fetch owned properties via Property.ownerId FK
    const ownedProperties = await prismadb.properties.findMany({
      where: { ownerId: contactId, organizationId },
      select: {
        id: true,
        friendlyId: true,
        property_name: true,
        property_type: true,
        property_status: true,
        address_city: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    const properties = ownedProperties.map((p) => ({
      ...p,
      price: p.price ? Number(p.price) : undefined,
    }));

    // Fetch linked documents via M2M
    const linkedDocumentsRaw = await prismadb.documents.findMany({
      where: {
        organizationId,
        Contacts: { some: { id: contactId } },
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
      take: 20,
    });

    const documents = await Promise.all(
      linkedDocumentsRaw.map((doc) => decryptDocumentForOrg(doc, organizationId))
    );

    // Fetch linked calendar events via M2M
    const linkedEventsRaw = await prismadb.calendarEvent.findMany({
      where: {
        organizationId,
        Contacts: { some: { id: contactId } },
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
      },
      orderBy: { startTime: "desc" },
      take: 20,
    });

    const events = await Promise.all(
      linkedEventsRaw.map((event) => decryptCalendarEventForOrg(event, organizationId))
    );

    const allEvents = events.map((e) => ({
      ...e,
      startTime: e.startTime instanceof Date ? e.startTime.toISOString() : e.startTime,
      endTime: e.endTime instanceof Date ? e.endTime.toISOString() : e.endTime,
    }));

    return NextResponse.json({ requests, properties, documents, events: allEvents });
  } catch (error) {
    console.error("[CONTACT_LINKED_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
