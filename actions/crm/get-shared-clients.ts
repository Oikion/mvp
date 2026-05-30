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

  // Fetch all shared contacts in a single query instead of N individual lookups.
  // (the legacy `clients` model was unified into `Contact`.)
  const entityIds = shares.map((s) => s.entityId);
  const contacts = await prismadb.contact.findMany({
    where: { id: { in: entityIds } },
    select: {
      id: true,
      friendlyId: true,
      organizationId: true,
      displayName: true,
      email: true,
      primaryPhone: true,
      status: true,
      createdAt: true,
    },
  });

  // Decrypt each Contact using its real (Contact) field names BEFORE mapping to
  // the legacy SharedClientData shape — decryption keys off Contact field names,
  // so it must run before we rename displayName/email to client_name/primary_email.
  const decryptedById = new Map<string, any>();
  for (const c of contacts) {
    try {
      decryptedById.set(c.id, await decryptContactForOrg(c, c.organizationId));
    } catch (err) {
      console.error(`[GET_SHARED_CLIENTS] Failed to decrypt contact ${c.id}:`, err);
    }
  }

  const results: SharedClientData[] = [];
  for (const share of shares) {
    const client = decryptedById.get(share.entityId);
    if (!client) continue;
    results.push({
      id: client.id,
      friendlyId: client.friendlyId ?? "",
      shareId: share.id,
      client_name: client.displayName,
      primary_email: client.email,
      primary_phone: client.primaryPhone,
      client_status: (client.status as string) ?? null,
      createdAt: client.createdAt,
      sharedAt: share.createdAt,
      permissions: share.permissions,
      message: share.message,
      sharedBy: share.Users_SharedEntity_sharedByIdToUsers,
    });
  }
  return results;
};

