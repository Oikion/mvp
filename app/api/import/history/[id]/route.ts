/**
 * Import History Detail API Route
 *
 * GET:    Fetch a single import history record by ID
 * DELETE: Hard-delete an import batch (entities + history record update)
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getImportDetail, deleteImportBatch } from "@/lib/import/history";
import {
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
  apiInternalError,
  validateBody,
} from "@/lib/api-response";
import { requireAction, handleGuardError } from "@/lib/permissions/action-guards";
import { prismadb } from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = "force-dynamic";

const deleteBodySchema = z
  .object({
    entities: z.union([z.literal("all"), z.array(z.string())]).default("all"),
  })
  .strict();

/**
 * GET /api/import/history/[id]
 *
 * Returns the full import history record including row-level details.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) return apiUnauthorized();
    if (!orgId) return apiForbidden("Organization context required");

    const { id } = await params;

    const record = await getImportDetail(id, orgId);

    if (!record) {
      return apiNotFound("Import record");
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("[IMPORT_HISTORY_DETAIL_GET]", error);
    return apiInternalError("Failed to fetch import record", error as Error);
  }
}

/**
 * DELETE /api/import/history/[id]
 *
 * Hard-deletes an import batch: removes the entities that were created by
 * this import and updates the ImportHistory record status accordingly.
 *
 * Request body (optional JSON):
 *   { entities: "all" | string[] }   — defaults to "all"
 *
 * Requires import:hard_delete permission. The caller must also hold
 * import:delete_own (for own imports) or import:delete_any (for any import).
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) return apiUnauthorized();
    if (!orgId) return apiForbidden("Organization context required");

    // Require hard-delete permission
    const hardDeleteGuard = await requireAction("import:hard_delete");
    if (hardDeleteGuard) return handleGuardError(hardDeleteGuard);

    const { id } = await params;

    // Verify the record exists and belongs to this org
    const importRecord = await prismadb.importHistory.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, userId: true },
    });

    if (!importRecord) {
      return apiNotFound("Import record");
    }

    // Ownership check: if the user doesn't have delete_any, they must own the record
    const deleteAnyGuard = await requireAction("import:delete_any");
    if (deleteAnyGuard) {
      // User does not have delete_any — check they own the record
      if (importRecord.userId !== userId) {
        return apiForbidden("You can only delete your own import records");
      }
      // Also verify they have at least delete_own
      const deleteOwnGuard = await requireAction("import:delete_own");
      if (deleteOwnGuard) return handleGuardError(deleteOwnGuard);
    }

    // Parse optional request body
    let entities: "all" | string[] = "all";
    try {
      const rawBody = await req.json().catch(() => ({}));
      if (rawBody && typeof rawBody === "object" && Object.keys(rawBody).length > 0) {
        const validation = validateBody(rawBody, deleteBodySchema);
        if (!validation.success) return validation.error;
        entities = validation.data.entities;
      }
    } catch {
      return apiBadRequest("Request body must be valid JSON");
    }

    const { deletedCounts } = await deleteImportBatch(id, orgId, userId, entities);

    return NextResponse.json({ deletedCounts });
  } catch (error) {
    console.error("[IMPORT_HISTORY_DETAIL_DELETE]", error);
    return apiInternalError("Failed to delete import batch", error as Error);
  }
}
