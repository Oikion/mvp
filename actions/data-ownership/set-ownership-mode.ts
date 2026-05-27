"use server";

import { revalidatePath } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { DataOwnershipMode } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import {
  actionSuccess,
  actionError,
  type ActionResponse,
} from "@/lib/action-response";
import { assertEncryptionModeUnchanged } from "@/lib/encryption-mode-guard";
import { requireAction } from "@/lib/permissions/action-guards";
import { isOrgPersonal } from "@/lib/personal-workspace-guard";

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
  // Authentication is always required regardless of path.
  const { orgId: sessionOrgId, userId } = await auth();
  if (!userId) return actionError("Not authenticated");

  if (!targetOrgId) {
    // Normal path: use session-based permission guard
    const guard = await requireAction("admin:manage_org_settings");
    if (guard) return guard;
  } else {
    // Onboarding path: JWT may not carry the new orgId yet.
    // Verify the caller is actually a member of the target org via Clerk.
    try {
      const clerk = await clerkClient();
      const memberships = await clerk.users.getOrganizationMembershipList({ userId });
      const isMember = memberships.data.some(m => m.organization.id === targetOrgId);
      if (!isMember) return actionError("Forbidden", "FORBIDDEN");
    } catch {
      return actionError("Forbidden", "FORBIDDEN");
    }
  }

  const orgId = targetOrgId ?? sessionOrgId;
  if (!orgId) {
    return actionError("Not authenticated");
  }

  // Personal workspaces are always AGENT — cannot be changed
  if (await isOrgPersonal(orgId)) {
    return actionError(
      "Personal workspaces always use AGENT data ownership and cannot be changed",
      "FORBIDDEN"
    );
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

    const settingsData = {
      dataOwnershipMode: mode,
      dataOwnershipSetAt: now,
      dataOwnershipChangedBy: userId,
      policyVersion: 1,
      policyHistory: [
        { mode, from: now.toISOString(), to: null },
      ],
    };

    // Guard: reject if someone accidentally adds encryptionMode to settingsData
    await assertEncryptionModeUnchanged(orgId, settingsData);

    await prismadb.$transaction([
      // Upsert organization settings with ownership mode
      prismadb.organizationSettings.upsert({
        where: { organizationId: orgId },
        create: {
          organizationId: orgId,
          createdBy: userId,
          ...settingsData,
        },
        update: settingsData,
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
      prismadb.organizationSettingsAudit.create({
        data: {
          organizationId: orgId,
          settingKey: "dataOwnershipMode",
          oldValue: null,
          newValue: String(mode),
          changedBy: userId,
        },
      }),
    ]);

    revalidatePath("/app");
    return actionSuccess();
  } catch (error) {
    return actionError("Failed to set data ownership mode", error as Error);
  }
}
