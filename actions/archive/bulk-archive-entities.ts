"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions/service";
import type { ArchivableEntityType } from "./archive-entity";

export async function bulkArchiveEntities(
  entityType: ArchivableEntityType,
  ids: string[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  if (!ids.length) return { success: true, count: 0 };

  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return { success: false, error: "Unauthorized" };

  const allowed = await hasPermission("canDelete");
  if (!allowed) return { success: false, error: "Permission denied" };

  const now = new Date();

  try {
    let count = 0;

    await prismadb.$transaction(async (tx) => {
      switch (entityType) {
        case "property": {
          const result = await tx.properties.updateMany({
            where: { id: { in: ids }, organizationId, archivedAt: null },
            data: { archivedAt: now, archivedBy: userId },
          });
          count = result.count;
          break;
        }
        case "contact": {
          const result = await tx.contact.updateMany({
            where: { id: { in: ids }, organizationId, archivedAt: null },
            data: { archivedAt: now, archivedBy: userId },
          });
          count = result.count;
          break;
        }
        case "request": {
          const result = await tx.request.updateMany({
            where: { id: { in: ids }, organizationId, archivedAt: null },
            data: { archivedAt: now, archivedBy: userId },
          });
          count = result.count;
          break;
        }
        case "deal": {
          const result = await tx.deal.updateMany({
            where: { id: { in: ids }, organizationId, archivedAt: null },
            data: { archivedAt: now, archivedBy: userId },
          });
          count = result.count;
          break;
        }
        case "event": {
          const result = await tx.calendarEvent.updateMany({
            where: { id: { in: ids }, organizationId, archivedAt: null },
            data: { archivedAt: now, archivedBy: userId },
          });
          count = result.count;
          break;
        }
        case "document": {
          const result = await tx.documents.updateMany({
            where: { id: { in: ids }, organizationId, archivedAt: null },
            data: { archivedAt: now, archivedBy: userId },
          });
          count = result.count;
          break;
        }
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }
    });

    return { success: true, count };
  } catch (error) {
    console.error("[BULK_ARCHIVE_ENTITIES]", error);
    return { success: false, error: "Failed to archive entities" };
  }
}
