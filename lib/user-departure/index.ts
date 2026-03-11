import { prismadb } from "@/lib/prisma";
import { isOrgPersonal } from "@/lib/personal-workspace-guard";
import { nullifyOrgReferences } from "./nullify-org-references";
import type { DepartureReason } from "@prisma/client";
import type { DepartureResult } from "./types";

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

  // Step 4: Null out org-scoped references
  const { nulledCount } = await nullifyOrgReferences(userId, orgId);
  result.nulledReferences = nulledCount;

  // Step 5: Delete user-personal data for this org
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

  // Step 6: Audit log
  console.log(
    `[UserDeparture] userId=${userId} orgId=${orgId} reason=${reason} ` +
      `nulled=${result.nulledReferences} deleted=${result.deletedPersonalData}`
  );

  return result;
}
