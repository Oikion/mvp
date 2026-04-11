import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const check = await canPerformAction("request:update");
    if (!check.allowed) {
      return NextResponse.json(
        { error: check.reason || "Permission denied" },
        { status: 403 }
      );
    }

    const { requestId: friendlyId } = await params;

    const request = await prismadb.request.findFirst({
      where: { friendlyId, organizationId },
      select: { id: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const body = await req.json();
    const { contactIds, propertyIds } = body as {
      contactIds?: string[];
      propertyIds?: string[];
    };

    let linkedContacts = 0;
    let linkedProperties = 0;

    if (contactIds && contactIds.length > 0) {
      const result = await prismadb.requestContact.createMany({
        data: contactIds.map((contactId) => ({
          organizationId,
          requestId: request.id,
          contactId,
        })),
        skipDuplicates: true,
      });
      linkedContacts = result.count;
    }

    if (propertyIds && propertyIds.length > 0) {
      const result = await prismadb.propertyRequestMatch.createMany({
        data: propertyIds.map((propertyId) => ({
          organizationId,
          propertyId,
          requestId: request.id,
          matchMethod: "MANUAL",
          status: "PENDING",
        })),
        skipDuplicates: true,
      });
      linkedProperties = result.count;
    }

    return NextResponse.json({
      success: true,
      linked: { contacts: linkedContacts, properties: linkedProperties },
    });
  } catch (error) {
    console.error("[REQUEST_LINK_ENTITIES]", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const check = await canPerformAction("request:update");
    if (!check.allowed) {
      return NextResponse.json(
        { error: check.reason || "Permission denied" },
        { status: 403 }
      );
    }

    const { requestId: friendlyId } = await params;

    const request = await prismadb.request.findFirst({
      where: { friendlyId, organizationId },
      select: { id: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contactId");
    const propertyId = searchParams.get("propertyId");

    if (!contactId && !propertyId) {
      return NextResponse.json(
        { error: "Must provide contactId or propertyId query parameter" },
        { status: 400 }
      );
    }

    if (contactId) {
      await prismadb.requestContact.deleteMany({
        where: {
          requestId: request.id,
          contactId,
        },
      });
    }

    if (propertyId) {
      await prismadb.propertyRequestMatch.deleteMany({
        where: {
          requestId: request.id,
          propertyId,
          organizationId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REQUEST_LINK_ENTITIES]", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
