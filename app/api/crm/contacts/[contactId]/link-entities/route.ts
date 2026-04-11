import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";
import { createChangeLogEntry } from "@/lib/entity-change-log";

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
      select: { id: true },
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
        select: { id: true, friendlyId: true, requestType: true },
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
      }
    }

    // Link properties by setting ownerId
    if (propertyIds && propertyIds.length > 0) {
      const result = await prismadb.properties.updateMany({
        where: {
          id: { in: propertyIds },
          organizationId,
        },
        data: { ownerId: contactId },
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
      select: { id: true },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

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
      }
    }

    // Unlink a property (set ownerId to null, only if current owner matches)
    if (propertyId) {
      // Fetch label before unlinking
      const unlinkedProperty = await prismadb.properties.findFirst({
        where: { id: propertyId, organizationId, ownerId: contactId },
        select: { id: true, friendlyId: true, property_name: true },
      });

      await prismadb.properties.updateMany({
        where: {
          id: propertyId,
          organizationId,
          ownerId: contactId,
        },
        data: { ownerId: null },
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
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONTACT_LINK_ENTITIES]", error);
    return NextResponse.json({ error: "Failed to unlink entity" }, { status: 500 });
  }
}
