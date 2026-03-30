import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { executeBatchImport } from "@/lib/import/unified-engine";
import type { ValidatedRow } from "@/lib/import/validation-engine";
import { recordImport } from "@/lib/import/history";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const body = await req.json();
    const { rows, assignedTo, importHistoryId, sourceFilename } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No data provided for import" },
        { status: 400 },
      );
    }

    // Rows arrive as ValidatedRow[] — already validated by /api/import/validate.
    // Do NOT re-run validateImportData() here — the rows have already been
    // partitioned into clientRow/propertyRow/mandateRow sub-objects, and
    // partitionRow() would fail to find any field keys in that shape.
    const validatedRows = rows as ValidatedRow[];

    const batchResult = await executeBatchImport(
      validatedRows,
      organizationId,
      user.id,
      assignedTo ?? null,
    );

    // Record or update import history
    try {
      const allEntityIds = [
        ...batchResult.clients.map((c) => c.uuid),
        ...batchResult.properties.map((p) => p.uuid),
        ...batchResult.mandates.map((m) => m.uuid),
      ];

      await recordImport({
        orgId: organizationId,
        userId: user.id,
        importType: "UNIFIED",
        sourceFilename: sourceFilename || "import.csv",
        rowCount: rows.length,
        result: batchResult,
        entityIds: allEntityIds,
        // If a preflight record exists, update it instead of creating a new one
        ...(importHistoryId ? { importHistoryId } : {}),
      });
    } catch (historyError) {
      // Log but don't fail the import — history is non-critical
      console.error(
        "[UNIFIED_IMPORT_POST] Failed to record import history:",
        historyError,
      );
    }

    // Invalidate cache keys
    await invalidateCache([
      "clients:list",
      "properties:list",
      "mandates:list",
      "dashboard:accounts-count",
    ]);

    return NextResponse.json(batchResult, { status: 200 });
  } catch (error) {
    const name = error instanceof Error ? error.constructor.name : "Unknown";
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as any)?.code ?? "N/A";
    const meta = (error as any)?.meta ? JSON.stringify((error as any).meta) : "N/A";
    console.error("[UNIFIED_IMPORT_POST]", { name, code, message, meta });
    return NextResponse.json(
      { error: "Import failed" },
      { status: 500 },
    );
  }
}
