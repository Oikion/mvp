"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";

import type { ArchivableEntityType } from "./archive-entity";

export interface ArchivedEntityRow {
  id: string;
  label: string;
  archivedAt: Date;
  archivedBy: string | null;
}

export async function getArchivedEntities(
  entityType: ArchivableEntityType
): Promise<{ data: ArchivedEntityRow[]; error?: string }> {
  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return { data: [], error: "Unauthorized" };

  const check = await canPerformAction("archive:view" as any);
  if (!check.allowed) return { data: [], error: "Permission denied" };

  try {
    const where = { organizationId, archivedAt: { not: null } };

    switch (entityType) {
      case "property": {
        const rows = await prismadb.properties.findMany({
          where,
          select: { id: true, property_name: true, archivedAt: true, archivedBy: true },
          orderBy: { archivedAt: "desc" },
        });
        return {
          data: rows.map((r) => ({
            id: r.id,
            label: r.property_name ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy,
          })),
        };
      }
      case "contact": {
        const rows = await prismadb.contact.findMany({
          where,
          select: { id: true, displayName: true, archivedAt: true, archivedBy: true },
          orderBy: { archivedAt: "desc" },
        });
        return {
          data: rows.map((r) => ({
            id: r.id,
            label: r.displayName ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy,
          })),
        };
      }
      case "request": {
        const rows = await prismadb.request.findMany({
          where,
          select: { id: true, name: true, archivedAt: true, archivedBy: true },
          orderBy: { archivedAt: "desc" },
        });
        return {
          data: rows.map((r) => ({
            id: r.id,
            label: r.name ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy,
          })),
        };
      }
      case "deal": {
        const rows = await prismadb.deal.findMany({
          where,
          select: { id: true, friendlyId: true, archivedAt: true, archivedBy: true },
          orderBy: { archivedAt: "desc" },
        });
        return {
          data: rows.map((r) => ({
            id: r.id,
            label: r.friendlyId ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy,
          })),
        };
      }
      case "event": {
        const rows = await prismadb.calendarEvent.findMany({
          where,
          select: { id: true, title: true, archivedAt: true, archivedBy: true },
          orderBy: { archivedAt: "desc" },
        });
        return {
          data: rows.map((r) => ({
            id: r.id,
            label: r.title ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy,
          })),
        };
      }
      case "document": {
        const rows = await prismadb.documents.findMany({
          where,
          select: { id: true, document_name: true, archivedAt: true, archivedBy: true },
          orderBy: { archivedAt: "desc" },
        });
        return {
          data: rows.map((r) => ({
            id: r.id,
            label: r.document_name ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy,
          })),
        };
      }
      default:
        return { data: [] };
    }
  } catch (error) {
    console.error("[GET_ARCHIVED_ENTITIES]", entityType, error);
    return { data: [], error: "Failed to fetch archived entities" };
  }
}
