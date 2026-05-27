"use server";

import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { getCurrentUserSafe, getCurrentOrgId } from "@/lib/get-current-user";
import { actionSuccess, actionError } from "@/lib/action-response";
import { notifyEntityAccessRequested } from "@/lib/notifications/helpers";

const inputSchema = z.object({
  entityType: z.enum(["PROPERTY", "CONTACT", "DOCUMENT", "REQUEST"]),
  entityId: z.string().min(1),
});

type EntityType = z.infer<typeof inputSchema>["entityType"];

async function resolveOwner(entityType: EntityType, entityId: string) {
  switch (entityType) {
    case "PROPERTY": {
      const row = await prismadb.properties.findUnique({
        where: { id: entityId },
        select: { assigned_to: true, organizationId: true, property_name: true, friendlyId: true },
      });
      return row ? {
        ownerId: row.assigned_to ?? null,
        ownerOrganizationId: row.organizationId,
        entityName: row.property_name ?? row.friendlyId ?? entityId,
      } : null;
    }
    case "CONTACT": {
      const row = await prismadb.contact.findUnique({
        where: { id: entityId },
        select: { assignedAgentId: true, organizationId: true, displayName: true },
      });
      return row ? {
        ownerId: row.assignedAgentId ?? null,
        ownerOrganizationId: row.organizationId,
        entityName: row.displayName ?? entityId,
      } : null;
    }
    case "REQUEST": {
      const row = await prismadb.request.findUnique({
        where: { id: entityId },
        select: { assignedAgentId: true, organizationId: true, friendlyId: true },
      });
      return row ? {
        ownerId: row.assignedAgentId ?? null,
        ownerOrganizationId: row.organizationId,
        entityName: row.friendlyId ?? entityId,
      } : null;
    }
    case "DOCUMENT": {
      const row = await prismadb.documents.findUnique({
        where: { id: entityId },
        select: { created_by_user: true, organizationId: true, document_name: true },
      });
      return row ? {
        ownerId: row.created_by_user ?? null,
        ownerOrganizationId: row.organizationId,
        entityName: row.document_name ?? entityId,
      } : null;
    }
  }
}

/**
 * Request VIEW_ONLY access to an entity the current user cannot otherwise see.
 * Notifies the entity owner; does not auto-grant access.
 */
export async function requestEntityAccess(input: z.infer<typeof inputSchema>) {
  const currentUser = await getCurrentUserSafe();
  if (!currentUser) return actionError("Unauthenticated", "UNAUTHORIZED");

  const validation = inputSchema.safeParse(input);
  if (!validation.success) return actionError("Invalid input", "VALIDATION_ERROR");

  const { entityType, entityId } = validation.data;

  // Prevent requesting access to something already shared with you
  const existing = await prismadb.sharedEntity.findFirst({
    where: { entityType, entityId, sharedWithId: currentUser.id },
    select: { id: true },
  });
  if (existing) return actionSuccess(null);

  const owner = await resolveOwner(entityType, entityId);
  const currentOrgId = await getCurrentOrgId();
  if (!owner || owner.ownerOrganizationId !== currentOrgId) {
    return actionError("Entity not found");
  }

  // No owner assigned — notify fallback to org admin (not implemented here,
  // so just succeed silently to avoid leaking entity existence)
  if (!owner.ownerId) return actionSuccess(null);

  // Don't notify yourself
  if (owner.ownerId === currentUser.id) return actionSuccess(null);

  try {
    await notifyEntityAccessRequested({
      entityType,
      entityId,
      entityName: owner.entityName,
      requesterId: currentUser.id,
      requesterName: currentUser.name ?? currentUser.email ?? "Someone",
      ownerId: owner.ownerId,
      ownerOrganizationId: owner.ownerOrganizationId,
    });

    return actionSuccess(null);
  } catch (error) {
    console.error("[REQUEST_ENTITY_ACCESS]", error);
    return actionError("Failed to send access request", error instanceof Error ? error : undefined);
  }
}
