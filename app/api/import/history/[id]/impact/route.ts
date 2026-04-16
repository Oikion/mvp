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
    // Support both new keys (contacts/requests) and legacy keys (clients/mandates)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const details = importRecord.resultDetails as (StoredResultDetails & Record<string, any>) | null;

    const wantAll = entities === "all";
    const wantContacts = wantAll || (entities as string[]).includes("contacts") || (entities as string[]).includes("clients");
    const wantProperties = wantAll || (entities as string[]).includes("properties");
    const wantRequests = wantAll || (entities as string[]).includes("requests") || (entities as string[]).includes("mandates");

    const contactIds = wantContacts ? ((details?.contacts ?? details?.clients)?.map((c: { uuid: string }) => c.uuid) ?? []) : [];
    const propertyIds = wantProperties ? (details?.properties?.map((p) => p.uuid) ?? []) : [];
    const requestIds = wantRequests ? ((details?.requests ?? details?.mandates)?.map((m: { uuid: string }) => m.uuid) ?? []) : [];

    // Count entities that will be affected
    const [contactCount, propertyCount, requestCount] = await Promise.all([
      contactIds.length > 0
        ? prismadb.contact.count({ where: { id: { in: contactIds }, organizationId: orgId } })
        : Promise.resolve(0),
      propertyIds.length > 0
        ? prismadb.properties.count({ where: { id: { in: propertyIds }, organizationId: orgId } })
        : Promise.resolve(0),
      requestIds.length > 0
        ? prismadb.request.count({ where: { id: { in: requestIds }, organizationId: orgId } })
        : Promise.resolve(0),
    ]);

    // Count cascade dependencies across junction tables and Deal
    const [
      contactPropertyLinkCount,
      requestPropertyLinkCount,
      dealCount,
    ] = await Promise.all([
      // ContactProperty: any link touching the targeted contacts OR properties
      contactIds.length > 0 || propertyIds.length > 0
        ? prismadb.contactProperty.count({
            where: {
              organizationId: orgId,
              OR: [
                ...(contactIds.length > 0 ? [{ contactId: { in: contactIds } }] : []),
                ...(propertyIds.length > 0 ? [{ propertyId: { in: propertyIds } }] : []),
              ],
            },
          })
        : Promise.resolve(0),

      // Mandate_Properties (request→property junction)
      requestIds.length > 0 || propertyIds.length > 0
        ? prismadb.mandate_Properties.count({
            where: {
              OR: [
                ...(requestIds.length > 0 ? [{ mandateId: { in: requestIds } }] : []),
                ...(propertyIds.length > 0 ? [{ propertyId: { in: propertyIds } }] : []),
              ],
            },
          })
        : Promise.resolve(0),

      // Deals: any deal referencing the targeted contacts (via DealParty) OR properties
      contactIds.length > 0 || propertyIds.length > 0
        ? prismadb.deal.count({
            where: {
              OR: [
                ...(contactIds.length > 0
                  ? [{ dealParties: { some: { contactId: { in: contactIds } } } }]
                  : []),
                ...(propertyIds.length > 0 ? [{ propertyId: { in: propertyIds } }] : []),
              ],
            },
          })
        : Promise.resolve(0),
    ]);

    return NextResponse.json({
      entities: {
        contacts: contactCount,
        properties: propertyCount,
        requests: requestCount,
      },
      cascade: {
        contactPropertyLinks: contactPropertyLinkCount,
        requestPropertyLinks: requestPropertyLinkCount,
        deals: dealCount,
      },
    });
  } catch (error) {
    console.error("[IMPORT_HISTORY_IMPACT_POST]", error);
    return apiInternalError("Failed to scan impact", error as Error);
  }
}
