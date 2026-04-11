/**
 * Import History Impact Scan API Route
 *
 * POST /api/import/history/[id]/impact
 *
 * Scans for cascade dependencies that would be affected if the batch's
 * entities were deleted. Returns a breakdown of entity counts and cascade
 * counts before the caller commits to a hard-delete.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
  apiInternalError,
  validateBody,
} from "@/lib/api-response";
import { requireAction, handleGuardError } from "@/lib/permissions/action-guards";
import type { StoredResultDetails } from "@/lib/import/history";

// Force dynamic rendering
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    entities: z.union([z.literal("all"), z.array(z.string())]),
  })
  .strict();

/**
 * POST /api/import/history/[id]/impact
 *
 * Request body: { entities: "all" | string[] }
 *
 * Response:
 * {
 *   entities: { clients: number, properties: number, mandates: number },
 *   cascade: {
 *     clientPropertyLinks: number,
 *     mandatePropertyLinks: number,
 *     mandateClientLinks: number,
 *     deals: number,
 *   }
 * }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) return apiUnauthorized();
    if (!orgId) return apiForbidden("Organization context required");

    // Require at minimum the ability to delete own imports
    const guard = await requireAction("import:delete_own");
    if (guard) return handleGuardError(guard);

    const { id } = await params;

    // Verify org ownership of the import record
    const importRecord = await prismadb.importHistory.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, resultDetails: true },
    });

    if (!importRecord) {
      return apiNotFound("Import record");
    }

    // Parse + validate request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return apiBadRequest("Request body must be valid JSON");
    }

    const validation = validateBody(rawBody, bodySchema);
    if (!validation.success) return validation.error;

    const { entities } = validation.data;

    // Read entity IDs from resultDetails
    const details = importRecord.resultDetails as StoredResultDetails | null;

    const wantAll = entities === "all";
    const wantClients = wantAll || (entities as string[]).includes("clients");
    const wantProperties = wantAll || (entities as string[]).includes("properties");
    const wantMandates = wantAll || (entities as string[]).includes("mandates");

    const clientIds = wantClients ? (details?.clients?.map((c) => c.uuid) ?? []) : [];
    const propertyIds = wantProperties ? (details?.properties?.map((p) => p.uuid) ?? []) : [];
    const mandateIds = wantMandates ? (details?.mandates?.map((m) => m.uuid) ?? []) : [];

    // Count entities that will be affected
    const [clientCount, propertyCount, mandateCount] = await Promise.all([
      clientIds.length > 0
        ? prismadb.contact.count({ where: { id: { in: clientIds }, organizationId: orgId } })
        : Promise.resolve(0),
      propertyIds.length > 0
        ? prismadb.properties.count({ where: { id: { in: propertyIds }, organizationId: orgId } })
        : Promise.resolve(0),
      mandateIds.length > 0
        ? prismadb.mandate.count({ where: { id: { in: mandateIds }, organizationId: orgId } })
        : Promise.resolve(0),
    ]);

    // Count cascade dependencies across junction tables and Deal
    const [
      clientPropertyLinkCount,
      mandatePropertyLinkCount,
      mandateClientLinkCount,
      dealCount,
    ] = await Promise.all([
      // ContactProperty: any link touching the targeted clients OR properties
      clientIds.length > 0 || propertyIds.length > 0
        ? prismadb.contactProperty.count({
            where: {
              OR: [
                ...(clientIds.length > 0 ? [{ contactId: { in: clientIds } }] : []),
                ...(propertyIds.length > 0 ? [{ propertyId: { in: propertyIds } }] : []),
              ],
            },
          })
        : Promise.resolve(0),

      // Mandate_Properties
      mandateIds.length > 0 || propertyIds.length > 0
        ? prismadb.mandate_Properties.count({
            where: {
              OR: [
                ...(mandateIds.length > 0 ? [{ mandateId: { in: mandateIds } }] : []),
                ...(propertyIds.length > 0 ? [{ propertyId: { in: propertyIds } }] : []),
              ],
            },
          })
        : Promise.resolve(0),

      // Mandate_Clients no longer exists — return 0
      Promise.resolve(0),

      // Deals: any deal referencing the targeted clients (via DealParty) OR properties
      clientIds.length > 0 || propertyIds.length > 0
        ? prismadb.deal.count({
            where: {
              OR: [
                ...(clientIds.length > 0
                  ? [{ dealParties: { some: { contactId: { in: clientIds } } } }]
                  : []),
                ...(propertyIds.length > 0 ? [{ propertyId: { in: propertyIds } }] : []),
              ],
            },
          })
        : Promise.resolve(0),
    ]);

    return NextResponse.json({
      entities: {
        clients: clientCount,
        properties: propertyCount,
        mandates: mandateCount,
      },
      cascade: {
        clientPropertyLinks: clientPropertyLinkCount,
        mandatePropertyLinks: mandatePropertyLinkCount,
        mandateClientLinks: mandateClientLinkCount,
        deals: dealCount,
      },
    });
  } catch (error) {
    console.error("[IMPORT_HISTORY_IMPACT_POST]", error);
    return apiInternalError("Failed to scan impact", error as Error);
  }
}
