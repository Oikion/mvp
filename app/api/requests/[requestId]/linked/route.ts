import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";
import { decryptContactForOrg, decryptCalendarEventForOrg, decryptDocumentForOrg } from "@/lib/model-encryption";

/**
 * GET /api/requests/[requestId]/linked
 * Fetch linked contacts and property matches for a request.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const readCheck = await canPerformAction("request:read");
    if (!readCheck.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { requestId: friendlyId } = await params;

    // Resolve friendlyId to real id
    const request = await prismadb.request.findFirst({
      where: { friendlyId, organizationId },
      select: { id: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Fetch linked contacts via RequestContact join table
    const requestContactRows = await prismadb.requestContact.findMany({
      where: { requestId: request.id, organizationId },
      include: {
        contact: {
          select: {
            id: true,
            friendlyId: true,
            displayName: true,
            isCompany: true,
            email: true,
            primaryPhone: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const contacts = await Promise.all(
      requestContactRows.map(async (rc) => {
        const decrypted = await decryptContactForOrg(rc.contact, organizationId);
        return {
          id: decrypted.id,
          friendlyId: decrypted.friendlyId,
          displayName: decrypted.displayName,
          isCompany: decrypted.isCompany,
          email: decrypted.email,
          primaryPhone: decrypted.primaryPhone,
          category: decrypted.category,
          role: rc.role,
        };
      })
    );

    // Fetch linked property matches via PropertyRequestMatch join table
    const matchRows = await prismadb.propertyRequestMatch.findMany({
      where: { requestId: request.id, organizationId },
      include: {
        property: {
          select: {
            id: true,
            friendlyId: true,
            property_name: true,
            property_type: true,
            address_city: true,
            price: true,
            bedrooms: true,
            bathrooms: true,
          },
        },
      },
      orderBy: { matchScore: "desc" },
    });

    const properties = matchRows.map((m) => ({
      id: m.property.id,
      friendlyId: m.property.friendlyId,
      property_name: m.property.property_name,
      property_type: m.property.property_type,
      address_city: m.property.address_city,
      price: m.property.price ? Number(m.property.price) : undefined,
      bedrooms: m.property.bedrooms,
      bathrooms: m.property.bathrooms,
      matchScore: m.matchScore ? Number(m.matchScore) : undefined,
      matchMethod: m.matchMethod,
      matchStatus: m.status,
    }));

    // Fetch linked documents via M2M
    const linkedDocumentsRaw = await prismadb.documents.findMany({
      where: {
        organizationId,
        Requests: { some: { id: request.id } },
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
        Requests: { some: { id: request.id } },
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

    return NextResponse.json({ contacts, properties, documents, events: allEvents });
  } catch (error) {
    console.error("[REQUEST_LINKED_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
