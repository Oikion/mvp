import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { executeBatchImport, validateImportData } from "@/lib/import";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { properties } = body;

    if (!Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json(
        { error: "No properties provided for import" },
        { status: 400 }
      );
    }

    const { validRows } = validateImportData(properties);
    const result = await executeBatchImport(validRows, organizationId, user.id);

    await invalidateCache(["properties:list"]);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[PROPERTY_IMPORT_POST]", error);
    return NextResponse.json(
      { error: "Failed to import properties" },
      { status: 500 }
    );
  }
}
