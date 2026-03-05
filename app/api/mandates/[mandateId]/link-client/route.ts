import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";

/**
 * POST /api/mandates/[mandateId]/link-client
 * Link a client to a mandate
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ mandateId: string }> }
) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { mandateId } = await params;
    const body = await req.json();
    const { clientId } = body;

    if (!mandateId) {
      return NextResponse.json(
        { error: "Mandate ID is required" },
        { status: 400 }
      );
    }

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    // Verify mandate belongs to this organization
    const mandate = await prismadb.mandate.findFirst({
      where: { id: mandateId, organizationId },
    });

    if (!mandate) {
      return NextResponse.json(
        { error: "Mandate not found or access denied" },
        { status: 404 }
      );
    }

    // Verify client exists in the same organization
    const client = await prismadb.clients.findFirst({
      where: { id: clientId, organizationId },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 404 }
      );
    }

    // Link client to mandate
    const updatedMandate = await prismadb.mandate.update({
      where: { id: mandateId },
      data: {
        clientId,
        client_linked_at: new Date(),
      },
      include: {
        client: {
          select: { id: true, client_name: true },
        },
      },
    });

    await invalidateCache(
      [
        `mandate:${mandateId}`,
        "mandates:list",
        `account:${clientId}`,
      ]
    );

    return NextResponse.json(
      { mandate: updatedMandate },
      { status: 200 }
    );
  } catch (error) {
    console.error("[MANDATE_LINK_CLIENT_POST]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to link client to mandate",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mandates/[mandateId]/link-client
 * Unlink a client from a mandate
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ mandateId: string }> }
) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { mandateId } = await params;

    if (!mandateId) {
      return NextResponse.json(
        { error: "Mandate ID is required" },
        { status: 400 }
      );
    }

    // Verify mandate belongs to this organization
    const mandate = await prismadb.mandate.findFirst({
      where: { id: mandateId, organizationId },
    });

    if (!mandate) {
      return NextResponse.json(
        { error: "Mandate not found or access denied" },
        { status: 404 }
      );
    }

    const previousClientId = mandate.clientId;

    // Unlink client from mandate
    await prismadb.mandate.update({
      where: { id: mandateId },
      data: {
        clientId: null,
        client_linked_at: null,
      },
    });

    await invalidateCache(
      [
        `mandate:${mandateId}`,
        "mandates:list",
        previousClientId ? `account:${previousClientId}` : "",
      ].filter(Boolean)
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[MANDATE_LINK_CLIENT_DELETE]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to unlink client from mandate",
      },
      { status: 500 }
    );
  }
}
