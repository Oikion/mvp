// @ts-nocheck
// TODO: Fix type errors
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { requireAuth, requireOrg, handleGuardError } from "@/lib/permissions/action-guards";

/**
 * GET /api/crm/clients/[clientId]/name
 *
 * Lightweight endpoint for fetching just the client name.
 * Used for breadcrumb navigation to display client names instead of UUIDs.
 *
 * Response: { name: string, id: string }
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;

    // Auth check
    const authGuard = await requireAuth();
    if (authGuard) {
      return handleGuardError(authGuard);
    }

    const orgResult = await requireOrg();
    if ("error" in orgResult) {
      return NextResponse.json(
        { error: orgResult.error },
        { status: orgResult.status }
      );
    }

    const { organizationId } = orgResult;

    // Fetch only the name field for performance
    const client = await prismadb.client.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: client.id,
      name: client.name || "Unnamed Client",
    });
  } catch (error) {
    console.error("[API] Error fetching client name:", error);
    return NextResponse.json(
      { error: "Failed to fetch client name" },
      { status: 500 }
    );
  }
}
