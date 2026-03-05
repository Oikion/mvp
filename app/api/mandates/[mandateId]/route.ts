import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { canPerformAction } from "@/lib/permissions";
import { decryptMandateForOrg } from "@/lib/model-encryption";

/**
 * GET /api/mandates/[mandateId]
 * Fetch a single mandate by ID
 */
export async function GET(
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

    const mandate = await prismadb.mandate.findFirst({
      where: {
        friendlyId: mandateId,
        organizationId,
      },
      include: {
        assigned_to_user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        client: {
          select: { id: true, client_name: true, primary_email: true, primary_phone: true },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!mandate) {
      return NextResponse.json(
        { error: "Mandate not found or access denied" },
        { status: 404 }
      );
    }

    // Decrypt sensitive fields
    const decrypted = await decryptMandateForOrg(mandate, organizationId);

    return NextResponse.json(
      { mandate: JSON.parse(JSON.stringify(decrypted)) },
      { status: 200 }
    );
  } catch (error) {
    console.error("[MANDATE_GET]", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch mandate", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mandates/[mandateId]
 * Delete a mandate
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ mandateId: string }> }
) {
  try {
    // Permission check: Users need client:delete permission
    const deleteCheck = await canPerformAction("client:delete");
    if (!deleteCheck.allowed) {
      return NextResponse.json(
        { error: deleteCheck.reason || "Permission denied" },
        { status: 403 }
      );
    }

    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { mandateId } = await params;

    if (!mandateId) {
      return NextResponse.json(
        { error: "Mandate ID is required" },
        { status: 400 }
      );
    }

    // Verify the mandate belongs to the current organization
    const existingMandate = await prismadb.mandate.findFirst({
      where: { friendlyId: mandateId, organizationId },
    });

    if (!existingMandate) {
      return NextResponse.json(
        { error: "Mandate not found or access denied" },
        { status: 404 }
      );
    }

    // Delete mandate (MandateComment cascade handled by Prisma onDelete: Cascade)
    await prismadb.mandate.delete({
      where: { id: existingMandate.id },
    });

    await invalidateCache(
      [
        "mandates:list",
        `mandate:${mandateId}`,
        existingMandate.assigned_to
          ? `user:${existingMandate.assigned_to}`
          : "",
      ].filter(Boolean)
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[MANDATE_DELETE]", error);

    // Handle authentication errors
    if (
      error instanceof Error &&
      (error.message === "User not authenticated" ||
        error.message === "User not found in database")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Handle Prisma errors
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === "P2024") {
        return NextResponse.json(
          { error: "Database connection error. Please try again." },
          { status: 503 }
        );
      }
      if (prismaError.code === "P2025") {
        return NextResponse.json(
          { error: "Mandate not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete mandate",
      },
      { status: 500 }
    );
  }
}
