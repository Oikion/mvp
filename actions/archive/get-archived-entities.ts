"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";
import { decryptContactForOrg, decryptRequestForOrg } from "@/lib/model-encryption";

import type { ArchivableEntityType } from "./archive-entity";

export interface ArchivedEntityRow {
  id: string;
  label: string;
  archivedAt: Date;
  archivedBy: string | null;
}

export interface ArchivedEntitiesResult {
  data: ArchivedEntityRow[];
  total: number;
  error?: string;
}

async function resolveUserNames(
  rows: { archivedBy: string | null }[],
  organizationId: string
): Promise<Map<string, string>> {
  const ids = Array.from(
    new Set(rows.map((r) => r.archivedBy).filter((id): id is string => !!id))
  );
  if (ids.length === 0) return new Map();

  const users = await prismadb.users.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true },
  });

  return new Map(users.map((u) => [u.id, u.name ?? u.email]));
}

export async function getArchivedEntities(
  entityType: ArchivableEntityType,
  page: number = 1,
  pageSize: number = 50
): Promise<ArchivedEntitiesResult> {
  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return { data: [], total: 0, error: "Unauthorized" };

  const check = await canPerformAction("archive:view" as any);
  if (!check.allowed) return { data: [], total: 0, error: "Permission denied" };

  const take = pageSize;
  const skip = (page - 1) * pageSize;

  try {
    const where = { organizationId, archivedAt: { not: null } };

    switch (entityType) {
      case "property": {
        const [rows, total] = await prismadb.$transaction([
          prismadb.properties.findMany({
            where,
            select: { id: true, property_name: true, archivedAt: true, archivedBy: true },
            orderBy: { archivedAt: "desc" },
            take,
            skip,
          }),
          prismadb.properties.count({ where }),
        ]);
        const userMap = await resolveUserNames(rows, organizationId);
        return {
          total,
          data: rows.map((r) => ({
            id: r.id,
            label: r.property_name ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy ? (userMap.get(r.archivedBy) ?? r.archivedBy) : null,
          })),
        };
      }
      case "contact": {
        const [rows, total] = await prismadb.$transaction([
          prismadb.contact.findMany({
            where,
            select: { id: true, displayName: true, archivedAt: true, archivedBy: true },
            orderBy: { archivedAt: "desc" },
            take,
            skip,
          }),
          prismadb.contact.count({ where }),
        ]);
        const userMap = await resolveUserNames(rows, organizationId);
        const decrypted = await Promise.all(
          rows.map((r) =>
            decryptContactForOrg({ id: r.id, displayName: r.displayName } as any, organizationId)
          )
        );
        return {
          total,
          data: rows.map((r, i) => ({
            id: r.id,
            label: (decrypted[i] as any).displayName ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy ? (userMap.get(r.archivedBy) ?? r.archivedBy) : null,
          })),
        };
      }
      case "request": {
        const [rows, total] = await prismadb.$transaction([
          prismadb.request.findMany({
            where,
            select: { id: true, friendlyId: true, name: true, archivedAt: true, archivedBy: true },
            orderBy: { archivedAt: "desc" },
            take,
            skip,
          }),
          prismadb.request.count({ where }),
        ]);
        const userMap = await resolveUserNames(rows, organizationId);
        const decrypted = await Promise.all(
          rows.map((r) =>
            r.name
              ? decryptRequestForOrg({ id: r.id, name: r.name } as any, organizationId)
              : Promise.resolve(null)
          )
        );
        return {
          total,
          data: rows.map((r, i) => ({
            id: r.id,
            label:
              r.friendlyId ??
              (decrypted[i] as any)?.name ??
              r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy ? (userMap.get(r.archivedBy) ?? r.archivedBy) : null,
          })),
        };
      }
      case "deal": {
        const [rows, total] = await prismadb.$transaction([
          prismadb.deal.findMany({
            where,
            select: { id: true, friendlyId: true, archivedAt: true, archivedBy: true },
            orderBy: { archivedAt: "desc" },
            take,
            skip,
          }),
          prismadb.deal.count({ where }),
        ]);
        const userMap = await resolveUserNames(rows, organizationId);
        return {
          total,
          data: rows.map((r) => ({
            id: r.id,
            label: r.friendlyId ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy ? (userMap.get(r.archivedBy) ?? r.archivedBy) : null,
          })),
        };
      }
      case "event": {
        const [rows, total] = await prismadb.$transaction([
          prismadb.calendarEvent.findMany({
            where,
            select: { id: true, title: true, archivedAt: true, archivedBy: true },
            orderBy: { archivedAt: "desc" },
            take,
            skip,
          }),
          prismadb.calendarEvent.count({ where }),
        ]);
        const userMap = await resolveUserNames(rows, organizationId);
        return {
          total,
          data: rows.map((r) => ({
            id: r.id,
            label: r.title ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy ? (userMap.get(r.archivedBy) ?? r.archivedBy) : null,
          })),
        };
      }
      case "document": {
        const [rows, total] = await prismadb.$transaction([
          prismadb.documents.findMany({
            where,
            select: { id: true, document_name: true, archivedAt: true, archivedBy: true },
            orderBy: { archivedAt: "desc" },
            take,
            skip,
          }),
          prismadb.documents.count({ where }),
        ]);
        const userMap = await resolveUserNames(rows, organizationId);
        return {
          total,
          data: rows.map((r) => ({
            id: r.id,
            label: r.document_name ?? r.id,
            archivedAt: r.archivedAt!,
            archivedBy: r.archivedBy ? (userMap.get(r.archivedBy) ?? r.archivedBy) : null,
          })),
        };
      }
      default:
        return { data: [], total: 0 };
    }
  } catch (error) {
    console.error("[GET_ARCHIVED_ENTITIES]", entityType, error);
    return { data: [], total: 0, error: "Failed to fetch archived entities" };
  }
}
