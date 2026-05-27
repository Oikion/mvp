import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction, handleGuardError } from "@/lib/permissions/action-guards";
import { validateImportData } from "@/lib/import/validation-engine";
import { batchDedupCheck } from "@/lib/import/dedup-checker";
import { getOrgDek } from "@/lib/key-management";

const MAX_ROWS = 5000;

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAction("import:create");
    if (guard) return handleGuardError(guard);

    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Request body too large (max 15 MB)" }, { status: 413 });
    }

    const orgId = await getCurrentOrgId();
    if (!orgId) {
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

    // ── Estimated cross-batch duplicate count ────────────────────────────────
    // Collect unique dedup keys from the validated rows, then query the DB
    // to estimate how many rows would be skipped as duplicates. This is
    // advisory — the import engine re-checks at execution time.
    let estimatedDuplicates: { contacts: number; properties: number; total: number } | null = null;

    const contactKeys = new Set<string>();
    const propertyKeys = new Set<string>();

    for (const row of result.validRows) {
      if (row.contactDedupKey) contactKeys.add(row.contactDedupKey);
      if (row.propertyDedupKey) propertyKeys.add(row.propertyDedupKey);
    }

    if (contactKeys.size > 0 || propertyKeys.size > 0) {
      try {
        const dek = await getOrgDek(orgId);
        const dedupResult = await batchDedupCheck(contactKeys, propertyKeys, orgId, dek);
        estimatedDuplicates = {
          contacts: dedupResult.contacts.size,
          properties: dedupResult.properties.size,
          total: dedupResult.contacts.size + dedupResult.properties.size,
        };
      } catch (dedupError) {
        // Dedup check failure must not block preflight validation
        console.error("[IMPORT_VALIDATE] Dedup check failed (non-fatal):", dedupError);
      }
    }

    return NextResponse.json({ ...safeResult, estimatedDuplicates });
  } catch (error) {
    console.error("[IMPORT_VALIDATE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
