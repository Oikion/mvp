import { createClerkClient } from "@clerk/backend";

import { getCurrentOrgId } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

type ClerkMembership = Awaited<
  ReturnType<ReturnType<typeof createClerkClient>["organizations"]["getOrganizationMembershipList"]>
>["data"][number];

interface OrgMembersResult<TUsers = any> {
  organizationId: string;
  clerkUserIds: string[];
  memberships: ClerkMembership[];
  users: TUsers[];
}

async function fetchOrgMemberships(targetOrgId?: string) {
  const organizationId = targetOrgId ?? (await getCurrentOrgId());

  if (!organizationId) {
    throw new Error("Organization context is required for org membership lookup");
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing CLERK_SECRET_KEY");
  }

  const clerk = createClerkClient({ secretKey });

  // Clerk currently caps limit at 500; adequate for agency-sized orgs
  const membershipsResponse = await clerk.organizations.getOrganizationMembershipList({
    organizationId,
    limit: 500,
  });

  const memberships = membershipsResponse.data ?? [];
  const clerkUserIds = memberships
    .map((member) => member.publicUserData?.userId)
    .filter((id): id is string => Boolean(id));

  return {
    organizationId,
    memberships,
    clerkUserIds,
  };
}

type PrismaSelect = Record<string, boolean> | undefined;

export async function getOrgMembersFromDb(
  params?: {
    organizationId?: string;
    select?: PrismaSelect;
  }
): Promise<OrgMembersResult<any>> {
  const { organizationId, memberships, clerkUserIds } = await fetchOrgMemberships(params?.organizationId);

  if (!clerkUserIds.length) {
    return {
      organizationId,
      memberships,
      clerkUserIds,
      users: [],
    } as OrgMembersResult<any>;
  }

  const users = await prismadb.users.findMany({
    where: {
      clerkUserId: {
        in: clerkUserIds,
      },
    },
    orderBy: {
      created_on: "desc",
    },
    ...(params?.select ? { select: params.select } : {}),
  });

  return {
    organizationId,
    memberships,
    clerkUserIds,
    users,
  };
}

