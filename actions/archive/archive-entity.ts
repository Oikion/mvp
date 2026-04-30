"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions/service";

export type ArchivableEntityType =
  | "property"
  | "contact"
  | "request"
  | "deal"
  | "event"
  | "document";

export async function archiveEntity(
  entityType: ArchivableEntityType,
  id: string,
  cascade: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return { success: false, error: "Unauthorized" };

  const allowed = await hasPermission("canDelete");
  if (!allowed) return { success: false, error: "Permission denied" };

  const now = new Date();

  try {
    await prismadb.$transaction(async (tx) => {
      switch (entityType) {
        case "property":
          await tx.properties.update({
            where: { id, organizationId },
            data: { archivedAt: now, archivedBy: userId },
          });
          if (cascade) {
            // Cascade to deals linked to this property
            await tx.deal.updateMany({
              where: { propertyId: id, organizationId, archivedAt: null },
              data: { archivedAt: now, archivedBy: userId },
            });
          }
          break;
        case "contact":
          await tx.contact.update({
            where: { id, organizationId },
            data: { archivedAt: now, archivedBy: userId },
          });
          if (cascade) {
            // updateMany doesn't support relation filters — find request IDs via join table first
            const linkedRequests = await tx.requestContact.findMany({
              where: { contactId: id },
              select: { requestId: true },
            });
            if (linkedRequests.length > 0) {
              await tx.request.updateMany({
                where: {
                  id: { in: linkedRequests.map((r) => r.requestId) },
                  organizationId,
                  archivedAt: null,
                },
                data: { archivedAt: now, archivedBy: userId },
              });
            }
          }
          break;
        case "request":
          await tx.request.update({
            where: { id, organizationId },
            data: { archivedAt: now, archivedBy: userId },
          });
          if (cascade) {
            await tx.deal.updateMany({
              where: { requestId: id, organizationId, archivedAt: null },
              data: { archivedAt: now, archivedBy: userId },
            });
          }
          break;
        case "deal":
          await tx.deal.update({
            where: { id, organizationId },
            data: { archivedAt: now, archivedBy: userId },
          });
          break;
        case "event":
          await tx.calendarEvent.update({
            where: { id, organizationId },
            data: { archivedAt: now, archivedBy: userId },
          });
          break;
        case "document":
          await tx.documents.update({
            where: { id, organizationId },
            data: { archivedAt: now, archivedBy: userId },
          });
          break;
      }
    });

    return { success: true };
  } catch (error) {
    console.error("[ARCHIVE_ENTITY]", entityType, id, error);
    return { success: false, error: "Failed to archive entity" };
  }
}
