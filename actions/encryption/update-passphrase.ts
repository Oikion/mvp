"use server";

import { requireAuth } from "@/lib/permissions/action-guards";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { prismadb } from "@/lib/prisma";

interface UpdatePassphraseInput {
  newWrappedKey: string; // OMK wrapped with new KEK
  newSalt: string; // New salt for KEK derivation
}

/**
 * Update user's encryption passphrase
 * 
 * Flow:
 * 1. User enters old passphrase → derives old KEK → unwraps OMK
 * 2. User enters new passphrase → new salt is generated
 * 3. Client derives new KEK from new passphrase
 * 4. Client wraps OMK with new KEK
 * 5. Server stores new wrapped key (replacing old one)
 */
export async function updateEncryptionPassphrase(
  input: UpdatePassphraseInput
): Promise<ActionResponse<void>> {
  const guard = await requireAuth();
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const user = await getCurrentUser();
  const userId = user.id;

  try {
    // Get encryption status
    const status = await prismadb.organizationEncryptionStatus.findUnique({
      where: { organizationId },
    });

    if (!status?.isEnabled) {
      return actionError("Encryption is not enabled", "VALIDATION_ERROR");
    }

    // Find existing key
    const existingKey = await prismadb.organizationEncryptionKey.findFirst({
      where: {
        organizationId,
        userId,
        keyVersion: status.keyVersion,
        revokedAt: null,
      },
    });

    if (!existingKey) {
      return actionError("You don't have encryption access", "FORBIDDEN");
    }

    // Update with new wrapped key
    await prismadb.organizationEncryptionKey.update({
      where: { id: existingKey.id },
      data: {
        wrappedKey: input.newWrappedKey,
        salt: input.newSalt,
      },
    });

    console.log("[UPDATE_PASSPHRASE] Passphrase updated for user:", userId);

    return actionSuccess();
  } catch (error) {
    console.error("[UPDATE_PASSPHRASE]", error);
    return actionError("Failed to update passphrase", error as Error);
  }
}

/**
 * Verify if user's current passphrase is correct
 * Returns the wrapped key and salt for client-side verification
 */
export async function getWrappedKeyForVerification(): Promise<
  ActionResponse<{ wrappedKey: string; salt: string } | null>
> {
  const guard = await requireAuth();
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const user = await getCurrentUser();
  const userId = user.id;

  try {
    const status = await prismadb.organizationEncryptionStatus.findUnique({
      where: { organizationId },
    });

    if (!status?.isEnabled) {
      return actionSuccess(null);
    }

    const key = await prismadb.organizationEncryptionKey.findFirst({
      where: {
        organizationId,
        userId,
        keyVersion: status.keyVersion,
        revokedAt: null,
      },
    });

    if (!key) {
      return actionSuccess(null);
    }

    return actionSuccess({
      wrappedKey: key.wrappedKey,
      salt: key.salt,
    });
  } catch (error) {
    console.error("[GET_WRAPPED_KEY]", error);
    return actionError("Failed to get key", error as Error);
  }
}
