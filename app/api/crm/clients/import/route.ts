import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { executeBatchImport, validateImportData } from "@/lib/import";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { clients } = body;

    if (!Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json(
        { error: "No clients provided for import" },
        { status: 400 }
      );
    }

    const { validRows } = validateImportData(clients);
    const result = await executeBatchImport(validRows, organizationId, user.id);

    await invalidateCache(["clients:list", "dashboard:accounts-count"]);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[CLIENT_IMPORT_POST]", error);
    return NextResponse.json(
      { error: "Failed to import clients" },
      { status: 500 }
    );
  }
}
