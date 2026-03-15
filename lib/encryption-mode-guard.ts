/**
 * lib/encryption-mode-guard.ts
 *
 * Prevents changes to OrganizationSettings.encryptionMode after initial creation.
 * The encryption mode is an immutable org-level security decision (spec Section 3).
 *
 * Usage: call assertEncryptionModeUnchanged(orgId, updateData) before any
 * OrganizationSettings update/upsert that could include encryptionMode.
 */

import { prismadb } from "@/lib/prisma";

/**
 * Throws if the update payload attempts to change an existing encryptionMode.
 * Safe to call unconditionally — it's a no-op when encryptionMode is not in the payload
 * or when the org has no settings yet (first creation).
 */
export async function assertEncryptionModeUnchanged(
  organizationId: string,
  updateData: Record<string, unknown>
): Promise<void> {
  // Fast path: if the update doesn't touch encryptionMode, nothing to check.
  if (!("encryptionMode" in updateData)) return;

  const existing = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
    select: { encryptionMode: true },
  });

  // No existing record — this is the initial creation, allow any mode.
  if (!existing) return;

  // Same mode — idempotent, allow.
  if (existing.encryptionMode === updateData.encryptionMode) return;

  throw new Error(
    "Encryption mode cannot be changed after organization creation. " +
      `Current mode: ${existing.encryptionMode}, attempted: ${updateData.encryptionMode}`
  );
}
