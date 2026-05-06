import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiInternalError,
} from "@/lib/api-response";
import { decryptContactForOrg } from "@/lib/model-encryption";
import type { EligibleContact } from "@/lib/types/auto-generate-requests";

export async function GET() {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const readCheck = await canPerformAction("request:read");
    if (!readCheck.allowed) return apiForbidden(readCheck.reason);

    // Fetch contacts that are BUYER or TENANT and have at least one linked
    // non-deleted property in this org.  We get the count in a second query
    // because Prisma's _count.select.where does not support relation fields.
    const contacts = await prismadb.contact.findMany({
      where: {
        organizationId,
        category: { hasSome: ["BUYER", "TENANT"] },
        deletedAt: null,
        linkedProperties: {
          some: {
            property: { organizationId },
          },
        },
      },
      select: {
        id: true,
        friendlyId: true,
        displayName: true,
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (contacts.length === 0) {
      return apiSuccess({ contacts: [] });
    }

    // Fetch all linked property IDs for these contacts
    const linkedPropertyRows = await prismadb.contactProperty.findMany({
      where: {
        contactId: { in: contacts.map((c) => c.id) },
        organizationId,
      },
      select: { contactId: true, propertyId: true },
    });

    // Deduplicate property IDs, then load only non-deleted ones
    const allPropertyIds = Array.from(
      new Set(linkedPropertyRows.map((r) => r.propertyId))
    );
    const activeProps = await prismadb.property.findMany({
      where: { id: { in: allPropertyIds }, organizationId, deletedAt: null },
      select: { id: true },
    });
    const activePropertyIds = new Set(activeProps.map((p) => p.id));

    const countMap = new Map<string, number>();
    for (const row of linkedPropertyRows) {
      if (activePropertyIds.has(row.propertyId)) {
        countMap.set(row.contactId, (countMap.get(row.contactId) ?? 0) + 1);
      }
    }

    const decrypted = await Promise.all(
      contacts.map((c) => decryptContactForOrg(c, organizationId))
    );

    const result: EligibleContact[] = decrypted
      .map((c) => ({
        id: c.id,
        displayName: c.displayName ?? "",
        friendlyId: c.friendlyId ?? c.id.slice(-6),
        category: c.category as string[],
        linkedPropertyCount: countMap.get(c.id) ?? 0,
      }))
      .filter((c) => c.linkedPropertyCount > 0);

    return apiSuccess({ contacts: result });
  } catch (error) {
    console.error("[API_REQUESTS_ELIGIBLE_CONTACTS]", error);
    return apiInternalError("Failed to load eligible contacts", error);
  }
}
