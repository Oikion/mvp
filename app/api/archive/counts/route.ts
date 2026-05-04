import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiInternalError,
} from "@/lib/api-response";
import { canPerformAction } from "@/lib/permissions";

export async function GET() {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const check = await canPerformAction("archive:view" as any);
    if (!check.allowed) return apiForbidden();

    const where = { organizationId, archivedAt: { not: null } };

    const [properties, contacts, requests, deals, documents, events] = await Promise.all([
      prismadb.properties.count({ where }),
      prismadb.contact.count({ where }),
      prismadb.request.count({ where }),
      prismadb.deal.count({ where }),
      prismadb.documents.count({ where }),
      prismadb.calendarEvent.count({ where }),
    ]);

    return apiSuccess({ properties, contacts, requests, deals, documents, events });
  } catch (error) {
    console.error("[ARCHIVE_COUNTS]", error);
    return apiInternalError("Failed to fetch archive counts", error);
  }
}
