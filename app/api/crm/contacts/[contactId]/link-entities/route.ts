import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";

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
      await prismadb.requestContact.deleteMany({
        where: {
          requestId,
          contactId,
          organizationId,
        },
      });
    }

    // Unlink a property (set ownerId to null, only if current owner matches)
    if (propertyId) {
      await prismadb.properties.updateMany({
        where: {
          id: propertyId,
          organizationId,
          ownerId: contactId,
        },
        data: { ownerId: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONTACT_LINK_ENTITIES]", error);
    return NextResponse.json({ error: "Failed to unlink entity" }, { status: 500 });
  }
}
