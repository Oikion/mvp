"use server";

import { requireAction } from "@/lib/permissions/action-guards";
import { getCurrentOrgId, getCurrentUserId } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { prismadb } from "@/lib/prisma";

/**
 * Revoke encryption access for a user
 * The user will no longer be able to decrypt organization data
 */
export async function revokeEncryptionAccess(
  targetUserId: string
): Promise<ActionResponse<void>> {
  // Require admin permission
  const guard = await requireAction("admin:manage_roles");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const currentUserId = await getCurrentUserId();

  try {
    // Prevent revoking own access
    if (targetUserId === currentUserId) {
      return actionError("Cannot revoke your own encryption access", "VALIDATION_ERROR");
    }

    // Get encryption status
    const status = await prismadb.organizationEncryptionStatus.findUnique({
      where: { organizationId },
    });

    if (!status?.isEnabled) {
      return actionError("Encryption is not enabled", "VALIDATION_ERROR");
    }

    // Find and revoke the key
    const key = await prismadb.organizationEncryptionKey.findFirst({
      where: {
        organizationId,
        userId: targetUserId,
        keyVersion: status.keyVersion,
        revokedAt: null,
      },
    });

    if (!key) {
      return actionError("User does not have encryption access", "NOT_FOUND");
    }

    // Mark as revoked (soft delete to maintain audit trail)
    await prismadb.organizationEncryptionKey.update({
      where: { id: key.id },
      data: { revokedAt: new Date() },
    });

    console.log("[REVOKE_ACCESS] Encryption access revoked for user:", targetUserId);

    return actionSuccess();
  } catch (error) {
    console.error("[REVOKE_ACCESS]", error);
    return actionError("Failed to revoke encryption access", error as Error);
  }
}

/**
 * Check if current user has encryption access
 */
export async function checkEncryptionAccess(): Promise<ActionResponse<boolean>> {
  const guard = await requireAction("property:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  try {
    // Get encryption status
    const status = await prismadb.organizationEncryptionStatus.findUnique({
      where: { organizationId },
    });

    if (!status?.isEnabled) {
      // Encryption not enabled means everyone has "access"
      return actionSuccess(true);
    }

    // Check if user has a valid key
    const userKey = await prismadb.organizationEncryptionKey.findFirst({
      where: {
        organizationId,
        userId,
        keyVersion: status.keyVersion,
        revokedAt: null,
      },
    });

    return actionSuccess(!!userKey);
  } catch (error) {
    console.error("[CHECK_ACCESS]", error);
    return actionError("Failed to check encryption access", error as Error);
  }
}
