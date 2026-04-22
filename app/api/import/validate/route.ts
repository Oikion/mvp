import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction, handleGuardError } from "@/lib/permissions/action-guards";
import { validateImportData } from "@/lib/import/validation-engine";

const MAX_ROWS = 5000;

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAction("import:create");
    if (guard) return handleGuardError(guard);

    const user = await getCurrentUser();
    const orgId = await getCurrentOrgId();
    if (!user || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_ROWS} rows allowed. You provided ${rows.length}.`,
        },
        { status: 413 },
      );
    }

    const result = validateImportData(rows);
    // Strip rawValue from error objects before returning — fields like primary_phone,
    // primary_email, and afm (Greek tax ID) would otherwise be echoed back as PII.
    const safeResult = {
      ...result,
      errorRows: result.errorRows.map(({ rawValue: _raw, ...rest }) => rest),
    };
    return NextResponse.json(safeResult);
  } catch (error) {
    console.error("[IMPORT_VALIDATE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
