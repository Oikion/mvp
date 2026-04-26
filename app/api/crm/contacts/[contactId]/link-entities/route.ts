import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";
import { createChangeLogEntry } from "@/lib/entity-change-log";
import {
  logEntityLinkedSymmetric,
  logEntityUnlinkedSymmetric,
} from "@/lib/activity-logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateCheck = await canPerformAction("contact:update");
    if (!updateCheck.allowed) {
      return NextResponse.json({ error: updateCheck.reason || "Permission denied" }, { status: 403 });
    }

    const { contactId } = await params;

    // Verify the contact belongs to this org
    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true, friendlyId: true },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const body = await req.json();
    const { requestIds, propertyIds } = body as {
      requestIds?: string[];
      propertyIds?: string[];
    };

    let linkedRequests = 0;
    let linkedProperties = 0;

    // Activity Log — contact label/URL precomputed (displayName is encrypted; use friendlyId)
    const contactLabel = contact.friendlyId ?? "Contact";
    const contactUrl = `/app/crm/contacts/${contactId}`;

    // Link requests via RequestContact join table
    if (requestIds && requestIds.length > 0) {
      const result = await prismadb.requestContact.createMany({
        data: requestIds.map((requestId) => ({
          organizationId,
          requestId,
          contactId,
        })),
        skipDuplicates: true,
      });
      linkedRequests = result.count;

      // Fetch request labels for changelog (only the ones actually inserted)
      const linkedRequestRecords = await prismadb.request.findMany({
        where: { id: { in: requestIds }, organizationId },
        select: { id: true, friendlyId: true },
      });
      for (const req of linkedRequestRecords) {
        createChangeLogEntry({
          organizationId,
          entityType: "CONTACT",
          entityId: contactId,
          eventType: "LINKED",
          actorUserId: userId,
          linkTarget: {
            type: "REQUEST",
            id: req.id,
            friendlyId: req.friendlyId ?? undefined,
            label: req.friendlyId ?? req.id,
          },
        }).catch((err) => console.error("[CONTACT_LINKED_LOG]", err));

        // Activity Log — symmetric Contact ↔ Request link
        void logEntityLinkedSymmetric({
          organizationId,
          aType: "CONTACT",
          aId: contactId,
          aLabel: contactLabel,
          aUrl: contactUrl,
          bType: "REQUEST",
          bId: req.id,
          bLabel: req.friendlyId ?? "Request",
          bUrl: `/app/requests/${req.id}`,
          createdByUserId: userId,
        });
      }
    }

    // Link properties via ContactProperty M2M join table
    if (propertyIds && propertyIds.length > 0) {
      const result = await prismadb.contactProperty.createMany({
        data: propertyIds.map((propertyId) => ({ organizationId, contactId, propertyId })),
        skipDuplicates: true,
      });
      linkedProperties = result.count;

      // Fetch property labels for changelog
      const linkedPropertyRecords = await prismadb.properties.findMany({
        where: { id: { in: propertyIds }, organizationId },
        select: { id: true, friendlyId: true, property_name: true },
      });
      for (const prop of linkedPropertyRecords) {
        createChangeLogEntry({
          organizationId,
          entityType: "CONTACT",
          entityId: contactId,
          eventType: "LINKED",
          actorUserId: userId,
          linkTarget: {
            type: "PROPERTY",
            id: prop.id,
            friendlyId: prop.friendlyId ?? undefined,
            label: prop.property_name ?? prop.friendlyId ?? prop.id,
          },
        }).catch((err) => console.error("[CONTACT_LINKED_LOG]", err));

        // Activity Log — symmetric Contact ↔ Property link
        void logEntityLinkedSymmetric({
          organizationId,
          aType: "CONTACT",
          aId: contactId,
          aLabel: contactLabel,
          aUrl: contactUrl,
          bType: "PROPERTY",
          bId: prop.id,
          bLabel: prop.property_name ?? prop.friendlyId ?? "Property",
          bUrl: `/app/mls/properties/${prop.friendlyId ?? prop.id}`,
          createdByUserId: userId,
        });
      }
    }

    return NextResponse.json({
      success: true,
      linked: { requests: linkedRequests, properties: linkedProperties },
    });
  } catch (error) {
    console.error("[CONTACT_LINK_ENTITIES]", error);
    return NextResponse.json({ error: "Failed to link entities" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateCheck = await canPerformAction("contact:update");
    if (!updateCheck.allowed) {
      return NextResponse.json({ error: updateCheck.reason || "Permission denied" }, { status: 403 });
    }

    const { contactId } = await params;

    // Verify the contact belongs to this org
    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true, friendlyId: true },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const contactLabel = contact.friendlyId ?? "Contact";
    const contactUrl = `/app/crm/contacts/${contactId}`;

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");
    const propertyId = searchParams.get("propertyId");

    if (!requestId && !propertyId) {
      return NextResponse.json(
        { error: "Must provide requestId or propertyId query parameter" },
        { status: 400 }
      );
    }

    // Unlink a request
    if (requestId) {
      // Fetch label before deleting
      const unlinkedRequest = await prismadb.request.findFirst({
        where: { id: requestId, organizationId },
        select: { id: true, friendlyId: true },
      });

      await prismadb.requestContact.deleteMany({
        where: {
          requestId,
          contactId,
          organizationId,
        },
      });

      if (unlinkedRequest) {
        createChangeLogEntry({
          organizationId,
          entityType: "CONTACT",
          entityId: contactId,
          eventType: "UNLINKED",
          actorUserId: userId,
          linkTarget: {
            type: "REQUEST",
            id: unlinkedRequest.id,
            friendlyId: unlinkedRequest.friendlyId ?? undefined,
            label: unlinkedRequest.friendlyId ?? unlinkedRequest.id,
          },
        }).catch((err) => console.error("[CONTACT_UNLINKED_LOG]", err));

        // Activity Log — symmetric Contact ↔ Request unlink
        void logEntityUnlinkedSymmetric({
          organizationId,
          aType: "CONTACT",
          aId: contactId,
          aLabel: contactLabel,
          aUrl: contactUrl,
          bType: "REQUEST",
          bId: unlinkedRequest.id,
          bLabel: unlinkedRequest.friendlyId ?? "Request",
          bUrl: `/app/requests/${unlinkedRequest.id}`,
          createdByUserId: userId,
        });
      }
    }

    // Unlink a property via ContactProperty M2M join table
    if (propertyId) {
      // Fetch label before unlinking
      const unlinkedProperty = await prismadb.properties.findFirst({
        where: { id: propertyId, organizationId, linkedContacts: { some: { contactId } } },
        select: { id: true, friendlyId: true, property_name: true },
      });

      await prismadb.contactProperty.deleteMany({
        where: { contactId, propertyId, organizationId },
      });

      if (unlinkedProperty) {
        createChangeLogEntry({
          organizationId,
          entityType: "CONTACT",
          entityId: contactId,
          eventType: "UNLINKED",
          actorUserId: userId,
          linkTarget: {
            type: "PROPERTY",
            id: unlinkedProperty.id,
            friendlyId: unlinkedProperty.friendlyId ?? undefined,
            label: unlinkedProperty.property_name ?? unlinkedProperty.friendlyId ?? unlinkedProperty.id,
          },
        }).catch((err) => console.error("[CONTACT_UNLINKED_LOG]", err));

        // Activity Log — symmetric Contact ↔ Property unlink
        void logEntityUnlinkedSymmetric({
          organizationId,
          aType: "CONTACT",
          aId: contactId,
          aLabel: contactLabel,
          aUrl: contactUrl,
          bType: "PROPERTY",
          bId: unlinkedProperty.id,
          bLabel: unlinkedProperty.property_name ?? unlinkedProperty.friendlyId ?? "Property",
          bUrl: `/app/mls/properties/${unlinkedProperty.friendlyId ?? unlinkedProperty.id}`,
          createdByUserId: userId,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONTACT_LINK_ENTITIES]", error);
    return NextResponse.json({ error: "Failed to unlink entity" }, { status: 500 });
  }
}
