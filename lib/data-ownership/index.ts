import { DataOwnershipMode, DepartureReason } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import type { PolicyEra, PolicyForEntity } from "./types";

/**
 * Determine which data ownership policy applies to an entity
 * based on when it was created relative to policy change history.
 *
 * Walks through policyHistory eras to find which one the entity
 * was created in. Returns that era's mode.
 */
export function getPolicyForEntity(
  entityCreatedAt: Date,
  currentMode: DataOwnershipMode,
  policyHistory: PolicyEra[] | null
): PolicyForEntity {
  // No history — everything follows current mode
  if (!policyHistory || policyHistory.length === 0) {
    return {
      mode: currentMode,
      era: { mode: currentMode, from: new Date(0).toISOString(), to: null },
    };
  }

  const createdMs = entityCreatedAt.getTime();

  // Walk through eras to find which one the entity was created in
  for (const era of policyHistory) {
    const eraStart = new Date(era.from).getTime();
    const eraEnd = era.to ? new Date(era.to).getTime() : Infinity;

    if (createdMs >= eraStart && createdMs < eraEnd) {
      return { mode: era.mode, era };
    }
  }

  // Fallback: entity predates all history — use earliest era
  return { mode: policyHistory[0].mode, era: policyHistory[0] };
}

/**
 * Should AGENT mode migration be used for this departure?
 * Account deletion always uses AGENCY mode (personal workspace will be deleted too).
 */
export function shouldMigrateData(
  reason: DepartureReason,
  policyMode: DataOwnershipMode
): boolean {
  if (reason === "ACCOUNT_DELETED" || reason === "ADMIN_FORCE_DELETED") {
    return false;
  }
  return policyMode === DataOwnershipMode.AGENT;
}

/**
 * Find the mode the agent originally consented to (their first consent record).
 * Used by the re-consent "leave instead" flow to determine consequence text.
 */
export async function getOriginalConsentMode(
  orgId: string,
  userId: string
): Promise<DataOwnershipMode | null> {
  const firstConsent = await prismadb.orgMemberConsent.findFirst({
    where: { organizationId: orgId, userId },
    orderBy: { policyVersion: "asc" },
    select: { consentedMode: true },
  });

  return firstConsent?.consentedMode ?? null;
}
