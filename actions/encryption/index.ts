"use server";

/**
 * actions/encryption/index.ts
 *
 * Server actions for the client-side passphrase encryption system.
 *
 * This module supports the EncryptionProvider, which manages a per-user
 * Org Master Key (OMK) derived from a passphrase. The server stores only
 * the KEK-wrapped OMK — the passphrase never leaves the client.
 *
 * NOTE: The UserEncryptionKey Prisma model and the full enrollment flow are
 * pending a future schema migration. Until then, these actions return a
 * "not enabled" status so that the EncryptionProvider degrades gracefully.
 */

import { auth } from "@clerk/nextjs/server";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EncryptionStatusData {
  /** Whether the organization has passphrase encryption enabled */
  isEnabled: boolean;
  /** Whether the current user has enrolled (has a stored wrapped key) */
  userHasAccess: boolean;
}

export interface WrappedKeyData {
  /** AES-KW wrapped OMK, base64-encoded */
  wrappedKey: string;
  /** PBKDF2 salt, base64-encoded */
  salt: string;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Get the organization's encryption status and whether the current user
 * has enrolled (has a wrapped key stored server-side).
 */
export async function getOrganizationEncryptionStatus(): Promise<
  ActionResponse<EncryptionStatusData>
> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return actionError("Unauthorized", "UNAUTHORIZED");
  }

  // TODO: Once UserEncryptionKey model is added to the schema, query it here:
  //   const key = await prismadb.userEncryptionKey.findFirst({
  //     where: { userId, organizationId: orgId },
  //   });
  //   return actionSuccess({
  //     isEnabled: true,
  //     userHasAccess: !!key,
  //   });

  // Feature not yet fully deployed — encryption is disabled for all orgs.
  return actionSuccess<EncryptionStatusData>({
    isEnabled: false,
    userHasAccess: false,
  });
}

/**
 * Get the current user's wrapped OMK for the active organization.
 * Returns null data when the user has not enrolled.
 */
export async function getUserWrappedKey(): Promise<ActionResponse<WrappedKeyData | null>> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return actionError("Unauthorized", "UNAUTHORIZED");
  }

  // TODO: Once UserEncryptionKey model is added to the schema, query it here:
  //   const key = await prismadb.userEncryptionKey.findFirst({
  //     where: { userId, organizationId: orgId },
  //   });
  //   if (!key) return actionSuccess(null);
  //   return actionSuccess({ wrappedKey: key.wrappedKey, salt: key.salt });

  return actionSuccess<WrappedKeyData | null>(null);
}

/**
 * Enroll the current user by storing their KEK-wrapped OMK server-side.
 * The OMK is wrapped client-side before being sent here — the server never
 * sees the plaintext key or the user's passphrase.
 */
export async function enrollUserEncryptionKey(
  wrappedKey: string,
  salt: string
): Promise<ActionResponse<void>> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return actionError("Unauthorized", "UNAUTHORIZED");
  }

  if (!wrappedKey || !salt) {
    return actionError("Missing required fields", "VALIDATION_ERROR");
  }

  // TODO: Once UserEncryptionKey model is added to the schema, store it here:
  //   await prismadb.userEncryptionKey.upsert({
  //     where: { userId_organizationId: { userId, organizationId: orgId } },
  //     create: { id: crypto.randomUUID(), userId, organizationId: orgId, wrappedKey, salt },
  //     update: { wrappedKey, salt },
  //   });

  return actionError(
    "Passphrase encryption enrollment is not yet available",
    "NOT_IMPLEMENTED"
  );
}
