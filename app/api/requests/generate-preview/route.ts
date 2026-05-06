import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
  apiInternalError,
  validateBody,
} from "@/lib/api-response";
import { decryptContactForOrg } from "@/lib/model-encryption";
import { mapPropertyToPreviewRequest } from "@/lib/requests/field-mapper";

const bodySchema = z
  .object({ contactIds: z.array(z.string().cuid()).min(1).max(200) })
  .strict();

export async function POST(req: Request) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const readCheck = await canPerformAction("request:read");
    if (!readCheck.allowed) return apiForbidden(readCheck.reason);

    const body = await req.json();
    const validation = validateBody(body, bodySchema);
    if (!validation.success) return validation.error;

    const { contactIds } = validation.data;

    // Fetch ContactProperty join rows with nested contact + property data.
    // We filter on scalar fields of the related tables here; note that Prisma
    // relation `where` in `findMany` supports scalar fields directly.
    const rows = await prismadb.contactProperty.findMany({
      where: {
        organizationId,
        contactId: { in: contactIds },
        contact: {
          organizationId,
          category: { hasSome: ["BUYER", "TENANT"] },
        },
        property: {
          organizationId,
        },
      },
      select: {
        contactId: true,
        contact: {
          select: {
            id: true,
            displayName: true,
            friendlyId: true,
            category: true,
          },
        },
        property: {
          select: {
            id: true,
            friendlyId: true,
            price: true,
            size_net_sqm: true,
            bedrooms: true,
            bathrooms: true,
            property_type: true,
            transaction_type: true,
            municipality: true,
            region: true,
            area: true,
            condition: true,
            furnished: true,
            heating_type: true,
            elevator: true,
            energy_cert_class: true,
          },
        },
      },
    });

    // Filter out soft-deleted properties in application code since Prisma
    // relation where doesn't support deletedAt on the related model's scalar
    // field when combined with select in this version.
    const activeRows = rows.filter(
      (r) => r.contact !== null && r.property !== null
    );

    // Group property count per contact to determine name suffix
    const propertiesPerContact = new Map<string, number>();
    for (const row of activeRows) {
      propertiesPerContact.set(
        row.contactId,
        (propertiesPerContact.get(row.contactId) ?? 0) + 1
      );
    }

    // Decrypt contact display names in one pass per unique contact
    const contactCache = new Map<string, string>();
    const uniqueContacts = new Map(
      activeRows.map((r) => [r.contactId, r.contact!])
    );
    await Promise.all(
      Array.from(uniqueContacts.entries()).map(async ([cId, contact]) => {
        const decrypted = await decryptContactForOrg(contact, organizationId);
        contactCache.set(cId, decrypted.displayName ?? "");
      })
    );

    const previews = activeRows.map((row) => {
      const displayName = contactCache.get(row.contactId) ?? "";
      const count = propertiesPerContact.get(row.contactId) ?? 1;
      return mapPropertyToPreviewRequest(
        row.contactId,
        displayName,
        row.contact!.category as string[],
        count > 1,
        row.property!
      );
    });

    return apiSuccess({ previews });
  } catch (error) {
    console.error("[API_REQUESTS_GENERATE_PREVIEW]", error);
    return apiInternalError("Failed to generate preview", error);
  }
}
