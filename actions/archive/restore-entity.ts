"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";

import type { ArchivableEntityType } from "./archive-entity";

export async function restoreEntity(
  entityType: ArchivableEntityType,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return { success: false, error: "Unauthorized" };

  const check = await canPerformAction("archive:restore" as any);
  if (!check.allowed) return { success: false, error: "Permission denied" };

  try {
    switch (entityType) {
      case "property":
        await prismadb.properties.update({
          where: { id, organizationId },
          data: { archivedAt: null, archivedBy: null },
        });
        break;
      case "contact":
        await prismadb.contact.update({
          where: { id, organizationId },
          data: { archivedAt: null, archivedBy: null },
        });
        break;
      case "request":
        await prismadb.request.update({
          where: { id, organizationId },
          data: { archivedAt: null, archivedBy: null },
        });
        break;
      case "deal":
        await prismadb.deal.update({
          where: { id, organizationId },
          data: { archivedAt: null, archivedBy: null },
        });
        break;
      case "event":
        await prismadb.calendarEvent.update({
          where: { id, organizationId },
          data: { archivedAt: null, archivedBy: null },
        });
        break;
      case "document":
        await prismadb.documents.update({
          where: { id, organizationId },
          data: { archivedAt: null, archivedBy: null },
        });
        break;
    }

    return { success: true };
  } catch (error) {
    console.error("[RESTORE_ENTITY]", entityType, id, error);
    return { success: false, error: "Failed to restore entity" };
  }
}
