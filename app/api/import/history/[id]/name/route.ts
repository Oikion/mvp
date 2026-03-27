import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { requireAuth, requireOrg, handleGuardError } from "@/lib/permissions/action-guards";

/**
 * GET /api/import/history/[id]/name
 *
 * Lightweight endpoint for fetching a friendly import name.
 * Used by breadcrumb navigation to display "import-00001" instead of UUIDs.
 *
 * The friendly number is the 1-based position of this import within the org,
 * ordered by createdAt ascending (oldest = 00001).
 *
 * Response: { name: string, id: string }
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Fetch the import record's createdAt
    const record = await prismadb.importHistory.findFirst({
      where: { id, organizationId },
      select: { id: true, createdAt: true, sourceFilename: true },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Import not found" },
        { status: 404 }
      );
    }

    // Count how many imports were created before (or at the same time as) this one
    const position = await prismadb.importHistory.count({
      where: {
        organizationId,
        createdAt: { lte: record.createdAt },
      },
    });

    const friendlyId = `import-${String(position).padStart(5, "0")}`;

    return NextResponse.json({
      id: record.id,
      name: friendlyId,
    });
  } catch (error) {
    console.error("[API_IMPORT_NAME]", error);
    return NextResponse.json(
      { error: "Failed to fetch import name" },
      { status: 500 }
    );
  }
}
