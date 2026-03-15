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
import { assertEncryptionModeUnchanged } from "@/lib/encryption-mode-guard";
import { getActionPermissionContext } from "@/lib/permissions/action-service";
import type { PolicyEra } from "@/lib/data-ownership/types";

/**
 * Change the data ownership mode for the current organization.
 * Closes the current policy era, opens a new one, increments policyVersion.
 *
 * Permission: ORG_OWNER only (stricter than initial set)
 */
export async function changeOwnershipMode(
  newMode: DataOwnershipMode
): Promise<ActionResponse> {
  const context = await getActionPermissionContext();
  if (!context) {
    return actionError("Authentication required", "UNAUTHORIZED");
  }

  // Strict ORG_OWNER check — not just admin:manage_org_settings
  if (context.role !== "OWNER") {
    return actionError(
      "Only the organization owner can change the data ownership policy",
      "FORBIDDEN"
    );
  }

  const { orgId, userId } = await auth();
  if (!orgId || !userId) {
    return actionError("Not authenticated");
  }

  try {
    const settings = await prismadb.organizationSettings.findUnique({
      where: { organizationId: orgId },
      select: {
        dataOwnershipMode: true,
        dataOwnershipSetAt: true,
        policyVersion: true,
        policyHistory: true,
      },
    });

    if (!settings?.dataOwnershipSetAt) {
      return actionError(
        "Data ownership mode not yet set. Use setOwnershipMode first.",
        "VALIDATION_ERROR"
      );
    }

    if (settings.dataOwnershipMode === newMode) {
      return actionError(
        "New mode is the same as current mode",
        "VALIDATION_ERROR"
      );
    }

    const now = new Date();
    const newVersion = settings.policyVersion + 1;
    const history = (settings.policyHistory as PolicyEra[] | null) ?? [];

    // Close the current (last) era
    const updatedHistory = history.map((era, i) =>
      i === history.length - 1 && era.to === null
        ? { ...era, to: now.toISOString() }
        : era
    );

    // Append new era
    updatedHistory.push({
      mode: newMode,
      from: now.toISOString(),
      to: null,
    });

    const updateData = {
      dataOwnershipMode: newMode,
      dataOwnershipChangedAt: now,
      dataOwnershipChangedBy: userId,
      policyVersion: newVersion,
      policyHistory: updatedHistory as any,
    };

    // Guard: reject if someone accidentally adds encryptionMode to updateData
    await assertEncryptionModeUnchanged(orgId, updateData);

    await prismadb.$transaction([
      prismadb.organizationSettings.update({
        where: { organizationId: orgId },
        data: updateData,
      }),
      // Auto-create owner's consent at the new version
      prismadb.orgMemberConsent.create({
        data: {
          organizationId: orgId,
          userId,
          consentedMode: newMode,
          policyVersion: newVersion,
        },
      }),
    ]);

    revalidatePath("/app");
    return actionSuccess();
  } catch (error) {
    return actionError("Failed to change data ownership mode", error as Error);
  }
}
