import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { executeImport, mandateImportConfig } from "@/lib/import";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { mandates } = body;

    if (!Array.isArray(mandates) || mandates.length === 0) {
      return NextResponse.json(
        { error: "No mandates provided for import" },
        { status: 400 }
      );
    }

    const result = await executeImport(mandateImportConfig, mandates, organizationId, user.id);

    await invalidateCache(["mandates:list"]);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[MANDATE_IMPORT_POST]", error);
    return NextResponse.json(
      { error: "Failed to import mandates" },
      { status: 500 }
    );
  }
}
