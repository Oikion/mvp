import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";

/**
 * POST /api/documents/[documentId]/link-entities
 * Link clients, properties, or mandates TO a document
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { documentId } = await params;
    const body = await req.json();
    const { clientIds, propertyIds, mandateIds } = body;

    const hasEntities =
      (Array.isArray(clientIds) && clientIds.length > 0) ||
      (Array.isArray(propertyIds) && propertyIds.length > 0) ||
      (Array.isArray(mandateIds) && mandateIds.length > 0);

    if (!hasEntities) {
      return NextResponse.json(
        { error: "At least one of clientIds, propertyIds, or mandateIds is required" },
        { status: 400 }
      );
    }

    // Verify document belongs to organization
    const document = await prismadb.documents.findFirst({
      where: { id: documentId, organizationId },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found or access denied" },
        { status: 404 }
      );
    }

    // Build connect operations and verify ownership
    const connectData: Record<string, unknown> = {};
    const pushData: Record<string, unknown> = {};

    if (Array.isArray(clientIds) && clientIds.length > 0) {
      const clients = await prismadb.contact.findMany({
        where: { id: { in: clientIds }, organizationId },
        select: { id: true },
      });
      if (clients.length !== clientIds.length) {
        return NextResponse.json(
          { error: "Some clients not found or access denied" },
          { status: 404 }
        );
      }
      connectData.Contacts = { connect: clientIds.map((id: string) => ({ id })) };
      pushData.accountsIDs = { push: clientIds };
    }

    if (Array.isArray(propertyIds) && propertyIds.length > 0) {
      const properties = await prismadb.properties.findMany({
        where: { id: { in: propertyIds }, organizationId },
        select: { id: true },
      });
      if (properties.length !== propertyIds.length) {
        return NextResponse.json(
          { error: "Some properties not found or access denied" },
          { status: 404 }
        );
      }
      connectData.Properties = { connect: propertyIds.map((id: string) => ({ id })) };
      pushData.linkedPropertiesIds = { push: propertyIds };
    }

    if (Array.isArray(mandateIds) && mandateIds.length > 0) {
      const mandates = await prismadb.mandate.findMany({
        where: { id: { in: mandateIds }, organizationId },
        select: { id: true },
      });
      if (mandates.length !== mandateIds.length) {
        return NextResponse.json(
          { error: "Some mandates not found or access denied" },
          { status: 404 }
        );
      }
      connectData.Mandates = { connect: mandateIds.map((id: string) => ({ id })) };
      pushData.linkedMandatesIds = { push: mandateIds };
    }

    await prismadb.documents.update({
      where: { id: documentId },
      data: {
        ...connectData,
        ...pushData,
      },
    });

    await invalidateCache([`document:${documentId}`, "documents:list"]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[DOCUMENT_LINK_ENTITIES_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/documents/[documentId]/link-entities
 * Unlink clients, properties, or mandates FROM a document
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { documentId } = await params;
    const { searchParams } = new URL(req.url);

    const clientIds = searchParams.get("clientIds")?.split(",").filter(Boolean) || [];
    const propertyIds = searchParams.get("propertyIds")?.split(",").filter(Boolean) || [];
    const mandateIds = searchParams.get("mandateIds")?.split(",").filter(Boolean) || [];

    if (clientIds.length === 0 && propertyIds.length === 0 && mandateIds.length === 0) {
      return NextResponse.json(
        { error: "At least one of clientIds, propertyIds, or mandateIds is required" },
        { status: 400 }
      );
    }

    // Verify document belongs to organization
    const document = await prismadb.documents.findFirst({
      where: { id: documentId, organizationId },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found or access denied" },
        { status: 404 }
      );
    }

    const disconnectData: Record<string, unknown> = {};

    if (clientIds.length > 0) {
      disconnectData.Clients = { disconnect: clientIds.map((id) => ({ id })) };
    }
    if (propertyIds.length > 0) {
      disconnectData.Properties = { disconnect: propertyIds.map((id) => ({ id })) };
    }
    if (mandateIds.length > 0) {
      disconnectData.Mandates = { disconnect: mandateIds.map((id) => ({ id })) };
    }

    // Update legacy array fields by removing the IDs
    const updateArrays: Record<string, string[]> = {};
    if (clientIds.length > 0) {
      updateArrays.accountsIDs = (document.accountsIDs || []).filter(
        (id) => !clientIds.includes(id)
      );
    }
    if (propertyIds.length > 0) {
      updateArrays.linkedPropertiesIds = (document.linkedPropertiesIds || []).filter(
        (id) => !propertyIds.includes(id)
      );
    }
    if (mandateIds.length > 0) {
      updateArrays.linkedMandatesIds = (document.linkedMandatesIds || []).filter(
        (id) => !mandateIds.includes(id)
      );
    }

    await prismadb.documents.update({
      where: { id: documentId },
      data: {
        ...disconnectData,
        ...updateArrays,
      },
    });

    await invalidateCache([`document:${documentId}`, "documents:list"]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[DOCUMENT_LINK_ENTITIES_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
