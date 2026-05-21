// @ts-nocheck
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUserSafe } from "@/lib/get-current-user";
import { decryptContactForOrg } from "@/lib/model-encryption";

export interface SharedClientData {
  id: string;
  friendlyId: string;
  shareId: string;
  client_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  client_status: string | null;
  createdAt: Date;
  sharedAt: Date;
  permissions: string;
  message: string | null;
  sharedBy: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

type EnrichedShare = SharedClientData | null;

export const getSharedClients = async (): Promise<SharedClientData[]> => {
  const currentUser = await getCurrentUserSafe();
  
  // Return empty array if no user context (e.g., session not synced yet)
  if (!currentUser) {
    return [];
  }

  const shares = await prismadb.sharedEntity.findMany({
    where: {
      sharedWithId: currentUser.id,
      entityType: "CLIENT",
    },
    include: {
      Users_SharedEntity_sharedByIdToUsers: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch all client entities in a single query instead of N individual lookups
  const entityIds = shares.map((s) => s.entityId);
  const contacts = await prismadb.contact.findMany({
    where: { id: { in: entityIds } },
    select: {
      id: true,
      organizationId: true,
      client_name: true,
      primary_email: true,
      primary_phone: true,
      client_status: true,
      createdAt: true,
    },
  });
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  const rawShares = shares.map((share) => {
    const client = contactMap.get(share.entityId);
    if (!client) return null;
    return {
      id: client.id,
      organizationId: client.organizationId,
      shareId: share.id,
      client_name: client.client_name,
      primary_email: client.primary_email,
      primary_phone: client.primary_phone,
      client_status: client.client_status as string | null,
      createdAt: client.createdAt,
      sharedAt: share.createdAt,
      permissions: share.permissions,
      message: share.message,
      sharedBy: share.Users_SharedEntity_sharedByIdToUsers,
    } as SharedClientData & { organizationId: string };
  });

  const results: SharedClientData[] = [];
  for (const c of rawShares) {
    if (!c) continue;
    try {
      results.push(await decryptContactForOrg(c, c.organizationId));
    } catch (err) {
      console.error(`[GET_SHARED_CLIENTS] Failed to decrypt client ${c.id}:`, err);
    }
  }
  return results;
};

