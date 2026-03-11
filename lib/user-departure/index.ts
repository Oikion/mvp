import { createClerkClient } from "@clerk/backend";
import { prismadb } from "@/lib/prisma";
import { isOrgPersonal } from "@/lib/personal-workspace-guard";
import { nullifyOrgReferences } from "./nullify-org-references";
import { shouldMigrateData } from "@/lib/data-ownership";
import { migrateAgentEntities } from "@/lib/data-ownership/entity-migrator";
import type { DataOwnershipMode, DepartureReason } from "@prisma/client";
import type { DepartureResult } from "./types";
import type { PolicyEra, MigrationResult } from "@/lib/data-ownership/types";

export { DepartureReason } from "@prisma/client";
export type { DepartureResult } from "./types";

/**
 * Unified user departure handler.
 *
 * Handles all scenarios where a user leaves an organization:
 * - User leaves org voluntarily (LEFT_ORG)
 * - User is removed from org (REMOVED_FROM_ORG)
 * - User deletes their account (ACCOUNT_DELETED) — called per org
 * - Admin force-deletes a user (ADMIN_FORCE_DELETED) — called per org
 *
 * For full account deletion, call this once per org, then delete the Users row.
 */
export async function handleUserDeparture(
  userId: string,
  orgId: string,
  reason: DepartureReason
): Promise<DepartureResult> {
  const result: DepartureResult = {
    orgId,
    reason,
    nulledReferences: 0,
    deletedPersonalData: 0,
    errors: [],
    timestamp: new Date(),
  };

  // Step 1: Pre-flight — verify user exists
  const user = await prismadb.users.findUnique({ where: { id: userId } });
  if (!user) {
    result.errors.push("User not found");
    return result;
  }

  // Step 2: Pre-flight — block personal workspace departures
  if (await isOrgPersonal(orgId)) {
    result.errors.push("Cannot depart from a personal workspace");
    return result;
  }

  // Step 3: Pre-flight — check encryption key safety
  const orgEncKeys = await prismadb.organizationEncryptionKey.findMany({
    where: { organizationId: orgId },
    select: { userId: true },
  });
  const otherKeyHolders = orgEncKeys.filter((k) => k.userId !== userId);
  if (orgEncKeys.length > 0 && otherKeyHolders.length === 0) {
    result.errors.push(
      "Cannot depart: this user holds the only encryption key for the org. " +
        "Another user must be granted access first."
    );
    return result;
  }

  // Step 4: Data ownership — AGENT migration (must run BEFORE nullify + key deletion)
  let migrationResult: MigrationResult | undefined;
  let policyApplied: DataOwnershipMode = "AGENCY";

  const settings = await prismadb.organizationSettings.findUnique({
    where: { organizationId: orgId },
    select: {
      dataOwnershipMode: true,
      policyHistory: true,
      policyVersion: true,
      dataOwnershipSetAt: true,
    },
  });

  if (settings?.dataOwnershipSetAt) {
    policyApplied = settings.dataOwnershipMode;

    if (shouldMigrateData(reason, settings.dataOwnershipMode)) {
      try {
        // Find or create personal workspace
        const personalOrgId = await findOrCreatePersonalWorkspace(userId);

        migrationResult = await prismadb.$transaction(
          async (tx) =>
            migrateAgentEntities(tx, {
              userId,
              sourceOrgId: orgId,
              personalOrgId,
              currentMode: settings.dataOwnershipMode,
              policyHistory: settings.policyHistory as PolicyEra[] | null,
            }),
          { isolationLevel: "Serializable", timeout: 60_000 }
        );

        result.migrationResult = migrationResult;
      } catch (error) {
        console.error("[UserDeparture] AGENT migration failed:", error);
        result.errors.push(
          `AGENT migration failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  // Step 5: Null out org-scoped references (handles remaining entities not migrated)
  const { nulledCount } = await nullifyOrgReferences(userId, orgId);
  result.nulledReferences = nulledCount;

  // Step 6: Delete user-personal data for this org
  const [notifs, invitees, encKeys] = await prismadb.$transaction([
    prismadb.notification.deleteMany({
      where: { userId, organizationId: orgId },
    }),
    prismadb.eventInvitee.deleteMany({
      where: { userId, CalendarEvent: { organizationId: orgId } },
    }),
    prismadb.organizationEncryptionKey.deleteMany({
      where: { userId, organizationId: orgId },
    }),
  ]);
  result.deletedPersonalData = notifs.count + invitees.count + encKeys.count;

  // Step 7: Create DepartureLog
  const userName = await getUserNameSnapshot(userId);
  const departureLogNotes =
    reason === "ACCOUNT_DELETED" && policyApplied === "AGENT"
      ? "Account deletion overrode AGENT policy — data stays with org"
      : null;

  await prismadb.departureLog.create({
    data: {
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId,
      userName,
      reason,
      policyApplied,
      migratedEntities: migrationResult?.migratedEntities ?? {
        properties: [],
        clients: [],
        mandates: [],
      },
      cancelledDeals: migrationResult?.cancelledDeals ?? [],
      entityCounts: migrationResult?.entityCounts ?? {
        properties: 0,
        clients: 0,
        mandates: 0,
        deals: 0,
      },
      notes: departureLogNotes,
    },
  });

  // Step 8: Audit log
  console.log(
    `[UserDeparture] userId=${userId} orgId=${orgId} reason=${reason} ` +
      `policy=${policyApplied} migrated=${!!migrationResult} ` +
      `nulled=${result.nulledReferences} deleted=${result.deletedPersonalData}`
  );

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Find the user's personal workspace or create one if missing.
 */
async function findOrCreatePersonalWorkspace(userId: string): Promise<string> {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  // Search through user's org memberships
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
  });

  for (const membership of memberships.data) {
    const org = await clerk.organizations.getOrganization({
      organizationId: membership.organization.id,
    });
    const metadata = org.publicMetadata as Record<string, unknown>;
    if (metadata?.type === "personal") {
      return org.id;
    }
  }

  // No personal workspace found — create one
  const user = await clerk.users.getUser(userId);
  const username = user.username || user.firstName || "User";

  const newOrg = await clerk.organizations.createOrganization({
    name: `${username}'s Workspace`,
    slug: `${username.toLowerCase()}-personal-${Date.now()}`,
    createdBy: userId,
  });

  await clerk.organizations.updateOrganizationMetadata(newOrg.id, {
    publicMetadata: { type: "personal" },
  });

  return newOrg.id;
}

/**
 * Snapshot the user's display name for the departure log.
 */
async function getUserNameSnapshot(userId: string): Promise<string> {
  const user = await prismadb.users.findUnique({
    where: { id: userId },
    select: { first_name: true, last_name: true, username: true },
  });

  if (!user) return "Unknown User";

  if (user.first_name || user.last_name) {
    return [user.first_name, user.last_name].filter(Boolean).join(" ");
  }
  return user.username ?? "Unknown User";
}
