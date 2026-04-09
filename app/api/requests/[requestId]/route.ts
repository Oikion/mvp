import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { canPerformAction } from "@/lib/permissions";
import { updateRequestSchema } from "@/lib/validations/requests";
import { encryptRequestForOrg, decryptRequestForOrg, decryptContactForOrg } from "@/lib/model-encryption";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { requestId } = await params;

    const readCheck = await canPerformAction("request:read");
    if (!readCheck.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const request = await prismadb.request.findFirst({
      where: { friendlyId: requestId, organizationId },
      include: {
        requestContacts: {
          include: {
            contact: {
              select: {
                id: true,
                friendlyId: true,
                displayName: true,
                isCompany: true,
                companyName: true,
                email: true,
                primaryPhone: true,
                category: true,
              },
            },
          },
        },
        assignedAgent: { select: { id: true, name: true, email: true } },
        propertyMatches: {
          include: {
            property: {
              select: {
                id: true,
                friendlyId: true,
                property_name: true,
                property_type: true,
                price: true,
                address_city: true,
                municipality: true,
                size_net_sqm: true,
                bedrooms: true,
                bathrooms: true,
              },
            },
          },
          orderBy: { matchScore: "desc" },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const decrypted = await decryptRequestForOrg(request, organizationId);
    const decContacts = [];
    for (const rc of request.requestContacts) {
      const decContact = await decryptContactForOrg(rc.contact, organizationId);
      decContacts.push({ ...rc, contact: decContact });
    }

    return NextResponse.json({ ...decrypted, requestContacts: decContacts });
  } catch (error) {
    console.error("[REQUEST_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { requestId } = await params;

    const updateCheck = await canPerformAction("request:update");
    if (!updateCheck.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const body = await req.json();
    const validation = updateRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Encrypt sensitive fields if present
    const toEncrypt: Record<string, unknown> = {};
    if ("notes" in data) toEncrypt.notes = data.notes ?? null;
    if ("locationDisplayName" in data) toEncrypt.locationDisplayName = data.locationDisplayName ?? null;
    if ("communicationNotes" in data) toEncrypt.communicationNotes = data.communicationNotes ?? null;
    if ("areasOfInterest" in data) toEncrypt.areasOfInterest = data.areasOfInterest ?? null;

    const encrypted = Object.keys(toEncrypt).length > 0
      ? await encryptRequestForOrg(toEncrypt, organizationId)
      : {};

    // Look up the real ID first to apply TOCTOU-safe update
    const existing = await prismadb.request.findFirst({
      where: { friendlyId: requestId, organizationId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prismadb.request.update({
      where: { id: existing.id, organizationId },
      data: {
        ...data,
        ...encrypted,
        updatedBy: user.id,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[REQUEST_PUT]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
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
    const { requestId } = await params;

    const deleteCheck = await canPerformAction("request:delete");
    if (!deleteCheck.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Resolve friendlyId → id, then soft-delete
    const existing = await prismadb.request.findFirst({
      where: { friendlyId: requestId, organizationId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prismadb.request.update({
      where: { id: existing.id, organizationId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REQUEST_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
