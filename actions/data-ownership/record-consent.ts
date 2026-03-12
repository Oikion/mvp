"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import {
  actionSuccess,
  actionError,
  type ActionResponse,
} from "@/lib/action-response";

/**
 * Record the current user's consent for the active data ownership policy.
 * Upserts an OrgMemberConsent record at the current policyVersion.
 *
 * @param targetOrgId - Optional org ID override (for invitation acceptance flow)
 */
export async function recordConsent(
  targetOrgId?: string
): Promise<ActionResponse> {
  const { orgId: currentOrgId, userId } = await auth();
  const orgId = targetOrgId ?? currentOrgId;

  if (!orgId || !userId) {
    return actionError("Not authenticated");
  }

  try {
    const settings = await prismadb.organizationSettings.findUnique({
      where: { organizationId: orgId },
      select: {
        dataOwnershipMode: true,
        policyVersion: true,
        dataOwnershipSetAt: true,
      },
    });

    if (!settings?.dataOwnershipSetAt) {
      return actionError(
        "Organization has not set a data ownership policy yet",
        "VALIDATION_ERROR"
      );
    }

    await prismadb.orgMemberConsent.upsert({
      where: {
        organizationId_userId_policyVersion: {
          organizationId: orgId,
          userId,
          policyVersion: settings.policyVersion,
        },
      },
      create: {
        organizationId: orgId,
        userId,
        consentedMode: settings.dataOwnershipMode,
        policyVersion: settings.policyVersion,
      },
      update: {
        consentedMode: settings.dataOwnershipMode,
        consentedAt: new Date(),
      },
    });

    return actionSuccess();
  } catch (error) {
    return actionError("Failed to record consent", error as Error);
  }
}

/**
 * Check if the current user has consented to the active policy version.
 *
 * @param orgId - Optional org ID override
 */
export async function hasCurrentConsent(
  orgId?: string
): Promise<ActionResponse<{ hasConsent: boolean; policyVersion: number }>> {
  const { orgId: currentOrgId, userId } = await auth();
  const effectiveOrgId = orgId ?? currentOrgId;

  if (!effectiveOrgId || !userId) {
    return actionError("Not authenticated");
  }

  try {
    const settings = await prismadb.organizationSettings.findUnique({
      where: { organizationId: effectiveOrgId },
      select: { policyVersion: true, dataOwnershipSetAt: true },
    });

    // No policy set yet → consent not required
    if (!settings?.dataOwnershipSetAt) {
      return actionSuccess({ hasConsent: true, policyVersion: 0 });
    }

    const consent = await prismadb.orgMemberConsent.findUnique({
      where: {
        organizationId_userId_policyVersion: {
          organizationId: effectiveOrgId,
          userId,
          policyVersion: settings.policyVersion,
        },
      },
    });

    return actionSuccess({
      hasConsent: !!consent,
      policyVersion: settings.policyVersion,
    });
  } catch (error) {
    return actionError("Failed to check consent", error as Error);
  }
}
