import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import {
  apiSuccess,
  apiUnauthorized,
  apiBadRequest,
  apiInternalError,
} from "@/lib/api-response";

type EntityType = "property" | "contact" | "request" | "deal" | "event" | "document";

const VALID_ENTITY_TYPES: EntityType[] = [
  "property",
  "contact",
  "request",
  "deal",
  "event",
  "document",
];

export async function GET(
  req: Request,
  props: { params: Promise<{ entityType: string; id: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const { entityType, id } = await props.params;

    if (!VALID_ENTITY_TYPES.includes(entityType as EntityType)) {
      return apiBadRequest("Invalid entity type");
    }

    const counts = await getLinkedCounts(entityType as EntityType, id, organizationId);
    return apiSuccess(counts);
  } catch (error) {
    console.error("[ARCHIVE_LINKED_COUNTS]", error);
    return apiInternalError("Failed to get linked counts", error);
  }
}

async function getLinkedCounts(
  entityType: EntityType,
  id: string,
  organizationId: string
): Promise<Record<string, number>> {
  switch (entityType) {
    case "property": {
      const [deals, showings] = await Promise.all([
        prismadb.deal.count({
          where: { propertyId: id, organizationId, archivedAt: null, deletedAt: null },
        }),
        prismadb.propertyShowing.count({
          where: { propertyId: id, organizationId },
        }),
      ]);
      return { deals, showings };
    }
    case "contact": {
      const requests = await prismadb.request.count({
        where: {
          organizationId,
          archivedAt: null,
          deletedAt: null,
          requestContacts: { some: { contactId: id } },
        },
      });
      return { requests };
    }
    case "request": {
      const deals = await prismadb.deal.count({
        where: { requestId: id, organizationId, archivedAt: null, deletedAt: null },
      });
      return { deals };
    }
    case "deal":
    case "event":
    case "document":
      return {};
    default:
      return {};
  }
}
