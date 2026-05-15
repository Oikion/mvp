import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction, handleGuardError } from "@/lib/permissions/action-guards";
import { invalidateCache } from "@/lib/cache-invalidate";
import { executeBatchImport, type ImportEngineOptions } from "@/lib/import/unified-engine";
import { recordImport } from "@/lib/import/history";
import { isDemoOrg } from "@/lib/demo/demo-guard";

const MAX_ROWS = 5000;

const validatedRowSchema = z.object({
  rowIndex: z.number().int().min(0),
  contactRow: z.record(z.unknown()).nullable(),
  propertyRow: z.record(z.unknown()).nullable(),
  requestRow: z.record(z.unknown()).nullable(),
  hasContact: z.boolean(),
  hasProperty: z.boolean(),
  hasRequest: z.boolean(),
  contactDedupKey: z.string().optional(),
  propertyDedupKey: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requireAction("import:create");
    if (guard) return handleGuardError(guard);

    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (await isDemoOrg(organizationId)) {
      return NextResponse.json({ success: true, imported: 12, skipped: 0, errors: [] });
    }

    const body = await req.json();
    const { rows, assignedTo, importHistoryId, sourceFilename, options } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No data provided for import" },
        { status: 400 },
      );
    }

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ROWS} rows allowed. You provided ${rows.length}.` },
        { status: 413 },
      );
    }

    // Validate the shape of each row. Rows arrive pre-partitioned from
    // /api/import/validate — we verify structure without re-running field
    // validation, since partitionRow() would fail on already-split sub-objects.
    const parsed = z.array(validatedRowSchema).safeParse(rows);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid row shape", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const validatedRows = parsed.data as Parameters<typeof executeBatchImport>[0];

    const engineOptions: ImportEngineOptions = {
      autoCreateRequests: typeof options?.autoCreateRequests === "boolean"
        ? options.autoCreateRequests
        : true,
      importBatchId: importHistoryId ?? undefined,
      importFilename: sourceFilename ?? undefined,
    };

    const batchResult = await executeBatchImport(
      validatedRows,
      organizationId,
      user.id,
      assignedTo ?? null,
      engineOptions,
    );

    // Record or update import history
    try {
      const allEntityIds = [
        ...batchResult.contacts.map((c) => c.uuid),
        ...batchResult.properties.map((p) => p.uuid),
        ...batchResult.requests.map((m) => m.uuid),
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
      "contacts:list",
      "properties:list",
      "requests:list",
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
