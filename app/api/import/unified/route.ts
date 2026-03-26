import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { executeBatchImport } from "@/lib/import/unified-engine";
import { validateImportData } from "@/lib/import/validation-engine";
import { recordImport } from "@/lib/import/history";
import { prismadb } from "@/lib/prisma";

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

    // Re-validate rows (server-side validation is mandatory)
    const validation = validateImportData(rows);
    const batchResult = await executeBatchImport(
      validation.validRows,
      organizationId,
      user.id,
      assignedTo ?? null,
    );

    // Record or update import history
    try {
      if (importHistoryId) {
        // Update existing ImportHistory record (set phase to COMPLETE, store results)
        await prismadb.importHistory.update({
          where: { id: importHistoryId },
          data: {
            status: "COMPLETED",
            createdCount:
              batchResult.clients.length +
              batchResult.properties.length +
              batchResult.mandates.length,
            failedCount: batchResult.errors.length,
            skippedCount: batchResult.skippedCount,
            entityIds: [
              ...batchResult.clients.map((c) => c.uuid),
              ...batchResult.properties.map((p) => p.uuid),
              ...batchResult.mandates.map((m) => m.uuid),
            ],
            resultDetails: JSON.parse(JSON.stringify(batchResult)),
          },
        });
      } else {
        // Create a new ImportHistory record via recordImport()
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
          result: {
            clients: {
              created: batchResult.clients.length,
              reused: Math.max(
                0,
                validation.entitySummary.clients.total -
                  validation.entitySummary.clients.unique,
              ),
              failed: batchResult.errors.filter((e) => e.entity === "client")
                .length,
            },
            properties: {
              created: batchResult.properties.length,
              failed: batchResult.errors.filter(
                (e) => e.entity === "property",
              ).length,
            },
            mandates: {
              created: batchResult.mandates.length,
              failed: batchResult.errors.filter((e) => e.entity === "mandate")
                .length,
            },
            skipped: batchResult.skippedCount,
            errors: batchResult.errors.map((e) => ({
              row: e.rowIndex + 2,
              field: e.entity,
              error: e.error,
            })),
          },
          entityIds: allEntityIds,
        });
      }
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
    console.error("[UNIFIED_IMPORT_POST]", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
