/**
 * Import History API Route
 *
 * GET:  List import history for the current organization
 * POST: Record a new import batch
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ImportEntityType } from "@prisma/client";
import { requireAction, handleGuardError } from "@/lib/permissions/action-guards";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
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
 * - importType: Filter by entity type (e.g. "CONTACT", "PROPERTY", "REQUEST")
 */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireAction("import:view_history");
    if (guard) return handleGuardError(guard);

    const orgId = await getCurrentOrgId();

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const cursor = searchParams.get("cursor") || undefined;
    const importTypeParam = searchParams.get("importType");
    const importTypeParsed = z.nativeEnum(ImportEntityType).optional().safeParse(importTypeParam ?? undefined);
    const importType = importTypeParsed.success ? importTypeParsed.data : undefined;

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
 * - importType:     Entity type imported (e.g. "CONTACT", "PROPERTY", "REQUEST")
 * - sourceFilename: Original filename of the uploaded file
 * - rowCount:       Number of rows processed
 * - result:         Import result summary object
 * - entityIds:      Array of created/updated entity IDs
 */
const importHistoryBodySchema = z.object({
  importType: z.nativeEnum(ImportEntityType),
  sourceFilename: z.string().min(1),
  rowCount: z.number().int().min(0).optional(),
  result: z.record(z.string(), z.unknown()).optional(),
  entityIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAction("import:create");
    if (guard) return handleGuardError(guard);

    const user = await getCurrentUser();
    const orgId = await getCurrentOrgId();

    const body = await req.json();
    const parsed = importHistoryBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { importType, sourceFilename, rowCount, result, entityIds } = parsed.data;

    const record = await recordImport({
      orgId,
      userId: user.id,
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
