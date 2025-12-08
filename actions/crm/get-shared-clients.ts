"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export interface SharedClientData {
  id: string;
  shareId: string;
  client_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  client_status: string | null;
  intent: string | null;
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
  const currentUser = await getCurrentUser();

  const shares = await prismadb.sharedEntity.findMany({
    where: {
      sharedWithId: currentUser.id,
      entityType: "CLIENT",
    },
    include: {
      sharedBy: {
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

  // Fetch the actual client entities
  const enrichedShares = await Promise.all(
    shares.map(async (share) => {
      const client = await prismadb.clients.findUnique({
        where: { id: share.entityId },
        select: {
          id: true,
          client_name: true,
          primary_email: true,
          primary_phone: true,
          client_status: true,
          intent: true,
          createdAt: true,
        },
      });

      if (!client) return null;

      return {
        id: client.id,
        shareId: share.id,
        client_name: client.client_name,
        primary_email: client.primary_email,
        primary_phone: client.primary_phone,
        client_status: client.client_status as string | null,
        intent: client.intent as string | null,
        createdAt: client.createdAt,
        sharedAt: share.createdAt,
        permissions: share.permissions,
        message: share.message,
        sharedBy: share.sharedBy,
      } as SharedClientData;
    })
  );

  return enrichedShares.filter((s): s is SharedClientData => s !== null);
};

