import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { executeUnifiedImport } from "@/lib/import/unified-engine";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const body = await req.json();
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No data provided for import" },
        { status: 400 }
      );
    }

    const result = await executeUnifiedImport(rows, organizationId, user.id);

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
