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

  // 6. Batch-fetch from Clerk: user details + org memberships
  const clerk = clerkClient() as any;

  const teammates: ConnectionTeammate[] = [];
  const agencies: ConnectionAgency[] = [];

  await Promise.all(
    Array.from(internalToClerkId.entries()).map(async ([internalId, otherClerkUserId]) => {
      try {
        // Fetch Clerk user details
        const clerkUser = await clerk.users.getUser(otherClerkUserId);
        if (!clerkUser) return;

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

        if (agencyMemberships.length === 0) {
          // All orgs are personal workspaces (or no orgs) → teammate
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
