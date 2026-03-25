/**
 * Import History Detail API Route
 *
 * GET:    Fetch a single import history record by ID
 * DELETE: Soft-delete an import batch
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getImportDetail, deleteImportBatch } from "@/lib/import/history";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/**
 * GET /api/import/history/[id]
 *
 * Returns the full import history record including row-level details.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const record = await getImportDetail(id, orgId);

    if (!record) {
      return NextResponse.json(
        { error: "Import record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("[IMPORT_HISTORY_DETAIL_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch import record" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/import/history/[id]
 *
 * Soft-deletes an import batch (marks it as deleted without removing data).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const record = await deleteImportBatch(id, orgId);

    return NextResponse.json(record);
  } catch (error) {
    console.error("[IMPORT_HISTORY_DETAIL_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete import batch" },
      { status: 500 }
    );
  }
}
