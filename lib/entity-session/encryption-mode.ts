import { prismadb } from "@/lib/prisma";
import { EncryptionMode } from "@prisma/client";

/**
 * In-process cache for org encryption modes.
 * Since encryptionMode is immutable after org creation, we can cache aggressively.
 */
const cache = new Map<string, { mode: EncryptionMode; ts: number }>();
const TTL = 10 * 60 * 1000; // 10 min (immutable, so long TTL is safe)

/**
 * Get the encryption mode for an organization.
 * Returns STANDARD if no settings exist (default).
 */
export async function getOrgEncryptionMode(
  orgId: string
): Promise<EncryptionMode> {
  const cached = cache.get(orgId);
  if (cached && Date.now() - cached.ts < TTL) return cached.mode;

  const settings = await prismadb.organizationSettings.findUnique({
    where: { organizationId: orgId },
    select: { encryptionMode: true },
  });

  const mode = settings?.encryptionMode ?? EncryptionMode.STANDARD;
  cache.set(orgId, { mode, ts: Date.now() });
  return mode;
}

/**
 * Check if an organization uses E2EE mode.
 */
export async function isE2EEOrg(orgId: string): Promise<boolean> {
  return (await getOrgEncryptionMode(orgId)) === EncryptionMode.E2EE;
}

/** Reset cache — for testing only */
export function _resetCacheForTesting(): void {
  cache.clear();
}
