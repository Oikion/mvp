// @ts-nocheck
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { clerkClient } from "@clerk/nextjs/server";

export const getSearch = async (search: string) => {
  const user = await getCurrentUser();
  const organizationId = await getCurrentOrgIdSafe();

  if (!user || !organizationId) {
    return { message: "Unauthorized", results: { clients: [], contacts: [], users: [] } };
  }

  const query = search.slice(0, 200);

  // Users model has no organizationId — get org members from Clerk
  const clerk = await clerkClient();
  const memberships = await clerk.organizations.getOrganizationMembershipList({
    organizationId,
    limit: 200,
  });
  const memberClerkIds = memberships.data
    .map(m => m.publicUserData?.userId)
    .filter(Boolean) as string[];

  const [resultsCrmClients, resultsCrmContacts, resultsUser] = await Promise.all([
    prismadb.clients.findMany({
      where: {
        organizationId,
        OR: [
          { description: { contains: query, mode: "insensitive" } },
          { client_name: { contains: query, mode: "insensitive" } },
          { primary_email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        client_name: true,
        primary_email: true,
        primary_phone: true,
        client_status: true,
        createdAt: true,
      },
      take: 20,
    }),
    prismadb.client_Contacts.findMany({
      where: {
        organizationId,
        OR: [
          { contact_last_name: { contains: query, mode: "insensitive" } },
          { contact_first_name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        contact_first_name: true,
        contact_last_name: true,
        email: true,
        mobile_phone: true,
      },
      take: 20,
    }),
    memberClerkIds.length > 0
      ? prismadb.users.findMany({
          where: {
            clerkUserId: { in: memberClerkIds },
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { account_name: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
              { username: { contains: query, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  return {
    message: "Fulltext search response",
    results: {
      clients: resultsCrmClients,
      contacts: resultsCrmContacts,
      users: resultsUser,
    },
  };
};
