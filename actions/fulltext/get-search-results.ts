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

  // The legacy `clients` (companies) and `client_Contacts` (people) models were
  // unified into a single `Contact` model. Query it once and split by isCompany
  // so the search UI's "clients" and "contacts" sections still populate.
  const [crmContacts, resultsUser] = await Promise.all([
    prismadb.contact.findMany({
      where: {
        organizationId,
        OR: [
          { displayName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { notes: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        isCompany: true,
        displayName: true,
        firstName: true,
        lastName: true,
        email: true,
        primaryPhone: true,
        status: true,
        createdAt: true,
      },
      take: 40,
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

  // Map Contact rows back to the legacy shape the search result UI expects.
  const resultsCrmClients = crmContacts
    .filter((c) => c.isCompany)
    .slice(0, 20)
    .map((c) => ({
      id: c.id,
      client_name: c.displayName,
      primary_email: c.email,
      primary_phone: c.primaryPhone,
      client_status: c.status,
      createdAt: c.createdAt,
    }));
  const resultsCrmContacts = crmContacts
    .filter((c) => !c.isCompany)
    .slice(0, 20)
    .map((c) => ({
      id: c.id,
      contact_first_name: c.firstName,
      contact_last_name: c.lastName,
      email: c.email,
      mobile_phone: c.primaryPhone,
    }));

  return {
    message: "Fulltext search response",
    results: {
      clients: resultsCrmClients,
      contacts: resultsCrmContacts,
      users: resultsUser,
    },
  };
};
