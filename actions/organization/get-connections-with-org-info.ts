"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

import { prismadb } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";

export interface ConnectionTeammate {
  userId: string;       // internal Users.id
  clerkUserId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface ConnectionAgency {
  connectionUserId: string;  // internal Users.id
  connectionName: string;
  connectionEmail: string;
  orgId: string;             // Clerk org ID
  orgName: string;
  orgSlug: string;
  memberCount: number;
}

export interface ConnectionsWithOrgInfo {
  teammates: ConnectionTeammate[];
  agencies: ConnectionAgency[];
}

export async function getConnectionsWithOrgInfo(): Promise<
  ActionResponse<ConnectionsWithOrgInfo>
> {
  // 1. Auth guard
  const guard = await requireAuth();
  if (guard) return guard;

  // 2. Resolve Clerk userId → internal DB user ID
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return actionError("Authentication required", "UNAUTHENTICATED");
  }

  const dbUser = await prismadb.users.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });
  if (!dbUser) {
    return actionError("User not found", "NOT_FOUND");
  }
  const internalUserId = dbUser.id;

  // 3. Fetch ACCEPTED AgentConnections (bidirectional)
  const connections = await prismadb.agentConnection.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { followerId: internalUserId },
        { followingId: internalUserId },
      ],
    },
    select: {
      followerId: true,
      followingId: true,
    },
  });

  if (connections.length === 0) {
    return actionSuccess({ teammates: [], agencies: [] });
  }

  // 4. Extract the "other" user's internal IDs
  const otherInternalIds = connections.map((c) =>
    c.followerId === internalUserId ? c.followingId : c.followerId
  );

  // 5. Fetch other users from DB to get their clerkUserIds
  const otherUsers = await prismadb.users.findMany({
    where: { id: { in: otherInternalIds } },
    select: { id: true, clerkUserId: true },
  });

  // Build a map: internalId → clerkUserId
  const internalToClerkId = new Map<string, string>(
    otherUsers
      .filter((u): u is typeof u & { clerkUserId: string } => u.clerkUserId !== null)
      .map((u) => [u.id, u.clerkUserId])
  );

  if (internalToClerkId.size === 0) {
    return actionSuccess({ teammates: [], agencies: [] });
  }

  // 6. Batch-fetch Clerk user details in a single API call
  const clerk = clerkClient() as any;

  const clerkUserIds = Array.from(internalToClerkId.values());
  let batchResult: any;
  try {
    batchResult = await clerk.users.getUserList({ userId: clerkUserIds, limit: 100 });
  } catch (err) {
    console.error("[GET_CONNECTIONS_WITH_ORG_INFO] Clerk batch user fetch failed", {
      err: String(err),
    });
    return actionError("Failed to fetch connection details", "EXTERNAL_SERVICE_ERROR");
  }
  const clerkUserMap = new Map<string, any>(
    (batchResult?.data ?? []).map((u: any) => [u.id, u])
  );

  // Build reverse map: clerkUserId → internalId
  const clerkToInternalId = new Map<string, string>(
    Array.from(internalToClerkId.entries()).map(([internalId, clerkId]) => [clerkId, internalId])
  );

  const teammates: ConnectionTeammate[] = [];
  const agencies: ConnectionAgency[] = [];

  await Promise.all(
    Array.from(clerkUserMap.entries()).map(async ([otherClerkUserId, clerkUser]) => {
      const internalId = clerkToInternalId.get(otherClerkUserId);
      if (!internalId) return;

      try {
        const name =
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
          clerkUser.username ||
          clerkUser.emailAddresses?.[0]?.emailAddress ||
          "Unknown";
        const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? "";
        const avatarUrl = clerkUser.imageUrl ?? null;

        // Fetch their org memberships
        const membershipsResult = await clerk.users.getOrganizationMembershipList({
          userId: otherClerkUserId,
        });
        const memberships: any[] = membershipsResult?.data ?? [];

        // 7. Classify: agency orgs vs personal workspaces
        const agencyMemberships = memberships.filter(
          (m) => (m.organization?.publicMetadata as any)?.type === "agency"
        );
        const personalMemberships = memberships.filter(
          (m) => (m.organization?.publicMetadata as any)?.type === "personal"
        );

        if (agencyMemberships.length === 0) {
          // Only add as teammate if they have a personal workspace (i.e. active user).
          // Skip users with NO org memberships at all — they have left all orgs.
          if (personalMemberships.length === 0) return;

          teammates.push({
            userId: internalId,
            clerkUserId: otherClerkUserId,
            name,
            email,
            avatarUrl,
          });
        } else {
          // One entry per agency org
          await Promise.all(
            agencyMemberships.map(async (m) => {
              try {
                const org = m.organization;
                let memberCount = 0;
                try {
                  const membersList = await clerk.organizations.getOrganizationMembershipList({
                    organizationId: org.id,
                  });
                  memberCount = membersList?.totalCount ?? membersList?.data?.length ?? 0;
                } catch {
                  // Best-effort: leave memberCount as 0
                }

                agencies.push({
                  connectionUserId: internalId,
                  connectionName: name,
                  connectionEmail: email,
                  orgId: org.id,
                  orgName: org.name,
                  orgSlug: org.slug ?? "",
                  memberCount,
                });
              } catch {
                // Skip individual agency entries that fail
              }
            })
          );
        }
      } catch (err) {
        // User no longer exists in Clerk or API error — skip gracefully
        console.error("[GET_CONNECTIONS_WITH_ORG_INFO] Clerk user fetch failed", {
          otherClerkUserId,
          err: String(err),
        });
      }
    })
  );

  return actionSuccess({ teammates, agencies });
}
