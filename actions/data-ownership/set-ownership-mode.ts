"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { DataOwnershipMode } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import {
  actionSuccess,
  actionError,
  type ActionResponse,
} from "@/lib/action-response";
import { requireAction } from "@/lib/permissions/action-guards";

/**
 * Set the initial data ownership mode for the current organization.
 * Only callable when no mode has been set yet (dataOwnershipSetAt is null).
 * Also creates the admin's consent record automatically.
 *
 * Permission: admin:manage_org_settings (ORG_OWNER or ADMIN)
 */
export async function setOwnershipMode(
  mode: DataOwnershipMode,
  targetOrgId?: string
): Promise<ActionResponse> {
  // When called during onboarding, the JWT may not yet carry the new orgId,
  // so we accept an explicit targetOrgId parameter.
  if (!targetOrgId) {
    const guard = await requireAction("admin:manage_org_settings");
    if (guard) return guard;
  }

  const { orgId: sessionOrgId, userId } = await auth();
  const orgId = targetOrgId || sessionOrgId;
  if (!orgId || !userId) {
    return actionError("Not authenticated");
  }

  try {
    // Check if mode is already set
    const existing = await prismadb.organizationSettings.findUnique({
      where: { organizationId: orgId },
      select: { dataOwnershipSetAt: true },
    });

    if (existing?.dataOwnershipSetAt) {
      return actionError(
        "Data ownership mode already set. Use changeOwnershipMode instead.",
        "CONFLICT"
      );
    }

    const now = new Date();

    await prismadb.$transaction([
      // Upsert organization settings with ownership mode
      prismadb.organizationSettings.upsert({
        where: { organizationId: orgId },
        create: {
          organizationId: orgId,
          createdBy: userId,
          dataOwnershipMode: mode,
          dataOwnershipSetAt: now,
          dataOwnershipChangedBy: userId,
          policyVersion: 1,
          policyHistory: [
            { mode, from: now.toISOString(), to: null },
          ],
        },
        update: {
          dataOwnershipMode: mode,
          dataOwnershipSetAt: now,
          dataOwnershipChangedBy: userId,
          policyVersion: 1,
          policyHistory: [
            { mode, from: now.toISOString(), to: null },
          ],
        },
      }),
      // Auto-create consent record for the admin who sets the policy
      prismadb.orgMemberConsent.create({
        data: {
          organizationId: orgId,
          userId,
          consentedMode: mode,
          policyVersion: 1,
        },
      }),
    ]);

    revalidatePath("/app");
    return actionSuccess();
  } catch (error) {
    return actionError("Failed to set data ownership mode", error as Error);
  }
}
