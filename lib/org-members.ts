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

interface FetchOrgMembershipsResult {
  organizationId: string;
  memberships: ClerkMembership[];
  clerkUserIds: string[];
}

async function fetchOrgMemberships(
  targetOrgId?: string, 
  options?: { throwOnMissingOrg?: boolean }
): Promise<FetchOrgMembershipsResult> {
  let organizationId: string | null = null;
  
  if (targetOrgId) {
    organizationId = targetOrgId;
  } else {
    try {
      organizationId = await getCurrentOrgId();
    } catch {
      organizationId = null;
    }
  }

  if (!organizationId) {
    if (options?.throwOnMissingOrg) {
      throw new Error("Organization context is required for org membership lookup");
    }
    // Return empty result when org is not available (e.g., session not synced yet)
    return {
      organizationId: "",
      memberships: [],
      clerkUserIds: [],
    };
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
    throwOnMissingOrg?: boolean;
  }
): Promise<OrgMembersResult<any>> {
  const { organizationId, memberships, clerkUserIds } = await fetchOrgMemberships(
    params?.organizationId,
    { throwOnMissingOrg: params?.throwOnMissingOrg }
  );

  // Return empty result if no organization context
  if (!organizationId || !clerkUserIds.length) {
    return {
      organizationId: organizationId || "",
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

