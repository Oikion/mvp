/**
 * Import History API Route
 *
 * GET:  List import history for the current organization
 * POST: Record a new import batch
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getImportHistory } from "@/lib/import/history";
import { recordImport } from "@/lib/import/history";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/**
 * GET /api/import/history
 *
 * Query params:
 * - limit:      Number of records to return (default: 20)
 * - cursor:     Cursor-based pagination token
 * - importType: Filter by entity type (e.g. "CLIENT", "PROPERTY", "MANDATE")
 */
export async function GET(req: NextRequest) {
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

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const cursor = searchParams.get("cursor") || undefined;
    const importTypeParam = searchParams.get("importType");
    const importType = (importTypeParam as import("@prisma/client").ImportEntityType) || undefined;

    const result = await getImportHistory(orgId, {
      limit,
      cursor,
      importType,
    });

    return NextResponse.json({
      data: result.items,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    console.error("[IMPORT_HISTORY_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch import history" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/import/history
 *
 * Body:
 * - importType:     Entity type imported (e.g. "CLIENT", "PROPERTY", "MANDATE")
 * - sourceFilename: Original filename of the uploaded file
 * - rowCount:       Number of rows processed
 * - result:         Import result summary object
 * - entityIds:      Array of created/updated entity IDs
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { importType, sourceFilename, rowCount, result, entityIds } = body;

    if (!importType || !sourceFilename) {
      return NextResponse.json(
        { error: "importType and sourceFilename are required" },
        { status: 400 }
      );
    }

    const record = await recordImport({
      orgId,
      userId,
      importType,
      sourceFilename,
      rowCount: rowCount ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result: (result ?? {}) as any,
      entityIds: entityIds ?? [],
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("[IMPORT_HISTORY_POST]", error);
    return NextResponse.json(
      { error: "Failed to record import" },
      { status: 500 }
    );
  }
}
