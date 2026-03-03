"use server";

import { requireAction } from "@/lib/permissions/action-guards";
import { getCurrentOrgId, getCurrentUserId } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { prismadb } from "@/lib/prisma";

interface SetupEncryptionInput {
  wrappedKey: string; // Base64 encoded wrapped OMK
  salt: string; // Base64 encoded salt for KEK derivation
}

/**
 * Setup E2EE for an organization
 * Only org admins can enable encryption
 * 
 * The actual key generation and wrapping happens client-side:
 * 1. Client generates OMK (Organization Master Key)
 * 2. Client derives KEK from admin's passphrase using PBKDF2
 * 3. Client wraps OMK with KEK
 * 4. Client sends wrapped key + salt to server
 */
export async function setupOrganizationEncryption(
  input: SetupEncryptionInput
): Promise<ActionResponse<{ keyVersion: number }>> {
  // Require admin permission
  const guard = await requireAction("admin:manage_roles");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  try {
    // Check if encryption is already enabled
    const existingStatus = await prismadb.organizationEncryptionStatus.findUnique({
      where: { organizationId },
    });

    if (existingStatus?.isEnabled) {
      return actionError("Encryption is already enabled for this organization", "VALIDATION_ERROR");
    }

    const keyVersion = 1;

    // Create encryption status and admin's wrapped key in a transaction
    await prismadb.$transaction([
      // Create or update encryption status
      prismadb.organizationEncryptionStatus.upsert({
        where: { organizationId },
        create: {
          organizationId,
          isEnabled: true,
          keyVersion,
          enabledAt: new Date(),
          enabledById: userId,
        },
        update: {
          isEnabled: true,
          keyVersion,
          enabledAt: new Date(),
          enabledById: userId,
        },
      }),
      // Store admin's wrapped key
      prismadb.organizationEncryptionKey.create({
        data: {
          organizationId,
          userId,
          wrappedKey: input.wrappedKey,
          salt: input.salt,
          keyVersion,
          grantedById: userId, // Self-granted for initial setup
        },
      }),
    ]);

    console.log("[SETUP_ENCRYPTION] E2EE enabled for org:", organizationId);

    return actionSuccess({ keyVersion });
  } catch (error) {
    console.error("[SETUP_ENCRYPTION]", error);
    return actionError("Failed to setup encryption", error as Error);
  }
}

/**
 * Disable E2EE for an organization
 * WARNING: This does not decrypt existing data!
 * Should only be used when migrating or with proper data handling.
 */
export async function disableOrganizationEncryption(): Promise<ActionResponse<void>> {
  // Require admin permission
  const guard = await requireAction("admin:manage_roles");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  try {
    // Disable encryption
    await prismadb.organizationEncryptionStatus.update({
      where: { organizationId },
      data: { isEnabled: false },
    });

    console.log("[DISABLE_ENCRYPTION] E2EE disabled for org:", organizationId);

    return actionSuccess();
  } catch (error) {
    console.error("[DISABLE_ENCRYPTION]", error);
    return actionError("Failed to disable encryption", error as Error);
  }
}
