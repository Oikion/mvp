"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";
import { deleteFromBlob } from "@/lib/vercel-blob";

import type { ArchivableEntityType } from "./archive-entity";

export async function purgeEntity(
  entityType: ArchivableEntityType,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return { success: false, error: "Unauthorized" };

  const check = await canPerformAction("archive:purge" as any);
  if (!check.allowed) return { success: false, error: "Permission denied" };

  try {
    switch (entityType) {
      case "property": {
        // Verify org ownership + archived state BEFORE any destructive blob deletion
        const property = await prismadb.properties.findFirst({
          where: { id, organizationId, archivedAt: { not: null } },
          select: { id: true },
        });
        if (!property) return { success: false, error: "Not found" };

        const images = await prismadb.propertyImage.findMany({
          where: { propertyId: id, organizationId },
          select: { url: true },
        });
        for (const img of images) {
          await deleteFromBlob(img.url).catch((e) =>
            console.error("[PURGE_PROPERTY_BLOB]", e)
          );
        }
        await prismadb.properties.delete({
          where: { id, organizationId, archivedAt: { not: null } },
        });
        break;
      }
      case "contact":
        await prismadb.contact.delete({
          where: { id, organizationId, archivedAt: { not: null } },
        });
        break;
      case "request":
        await prismadb.request.delete({
          where: { id, organizationId, archivedAt: { not: null } },
        });
        break;
      case "deal":
        await prismadb.deal.delete({
          where: { id, organizationId, archivedAt: { not: null } },
        });
        break;
      case "event":
        await prismadb.calendarEvent.delete({
          where: { id, organizationId, archivedAt: { not: null } },
        });
        break;
      case "document": {
        const doc = await prismadb.documents.findFirst({
          where: { id, organizationId, archivedAt: { not: null } },
          select: { document_file_url: true },
        });
        if (doc?.document_file_url) {
          await deleteFromBlob(doc.document_file_url).catch((e) =>
            console.error("[PURGE_DOCUMENT_BLOB]", e)
          );
        }
        await prismadb.documents.delete({
          where: { id, organizationId, archivedAt: { not: null } },
        });
        break;
      }
    }

    return { success: true };
  } catch (error) {
    console.error("[PURGE_ENTITY]", entityType, id, error);
    return { success: false, error: "Failed to purge entity" };
  }
}
