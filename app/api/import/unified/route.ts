import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { executeUnifiedImport } from "@/lib/import/unified-engine";
import { recordImport } from "@/lib/import/history";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const body = await req.json();
    const { rows, sourceFilename } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No data provided for import" },
        { status: 400 }
      );
    }

    const result = await executeUnifiedImport(rows, organizationId, user.id);

    // Record import history
    const allEntityIds = [
      ...result.entityIds.clients,
      ...result.entityIds.properties,
      ...result.entityIds.mandates,
    ];

    try {
      await recordImport({
        orgId: organizationId,
        userId: user.id,
        importType: "UNIFIED",
        sourceFilename: sourceFilename || "import.csv",
        rowCount: rows.length,
        result,
        entityIds: allEntityIds,
      });
    } catch (historyError) {
      // Log but don't fail the import — history is non-critical
      console.error("[UNIFIED_IMPORT_POST] Failed to record import history:", historyError);
    }

    await invalidateCache([
      "clients:list",
      "properties:list",
      "mandates:list",
      "dashboard:accounts-count",
    ]);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[UNIFIED_IMPORT_POST]", error);
    return NextResponse.json(
      { error: "Import failed" },
      { status: 500 }
    );
  }
}
