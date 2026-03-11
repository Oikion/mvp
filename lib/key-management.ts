/**
 * lib/key-management.ts
 *
 * Per-organization Data Encryption Key (DEK) management.
 *
 * Pattern: DEK + KEK envelope encryption
 *   - Master app key (KEK) = SECRETS_ENCRYPTION_KEY env var
 *   - Per-org DEK = 32-byte random key, stored AES-GCM encrypted in OrgEncryptionKey table
 *   - Field data = encrypted with the per-org DEK
 *
 * Usage:
 *   const dek = await getOrgDek(orgId);   // Buffer(32)
 *   const ct = encryptWithKey(plaintext, dek);
 *   const pt = decryptWithKey(ciphertext, dek);
 */

import { randomBytes } from "crypto";
import { prismadb } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { cacheGet, cacheSet } from "@/lib/redis";

// ─── In-process cache ────────────────────────────────────────────────────────
// Caches decoded DEK Buffers per orgId for the lifetime of the serverless instance.
// Safe because each serverless invocation is isolated; keys don't leak across tenants.

interface CacheEntry {
  dek: Buffer;
  expiresAt: number;
}

const DEK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const dekCache = new Map<string, CacheEntry>();

function getCached(orgId: string): Buffer | null {
  const entry = dekCache.get(orgId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    dekCache.delete(orgId);
    return null;
  }
  return entry.dek;
}

function setCache(orgId: string, dek: Buffer): void {
  dekCache.set(orgId, { dek, expiresAt: Date.now() + DEK_CACHE_TTL_MS });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get (or lazily create) the Data Encryption Key for a given organization.
 *
 * - On first call for a new org: generates a fresh 32-byte random key, encrypts it
 *   with the master SECRETS_ENCRYPTION_KEY, and stores it in OrgEncryptionKey.
 * - On subsequent calls: fetches from DB (or in-process cache), decrypts with
 *   master key, returns the raw key Buffer.
 *
 * Personal workspaces are covered automatically — they have their own orgId in Clerk.
 */
export async function getOrgDek(orgId: string): Promise<Buffer> {
  if (!orgId) throw new Error("[key-management] getOrgDek: orgId is required");

  // L1: Check in-process cache (survives within isolate lifetime)
  const l1Cached = getCached(orgId);
  if (l1Cached) return l1Cached;

  // L2: Check Redis cache (survives cold starts, stores ENCRYPTED DEK only)
  const redisKey = `oik:dek:${orgId}`;
  const redisCached = await cacheGet<string>(redisKey);
  if (redisCached) {
    const dekHex = decrypt(redisCached);
    const dek = Buffer.from(dekHex, "hex");
    setCache(orgId, dek); // Populate L1
    return dek;
  }

  // L3: Look up in DB
  const row = await prismadb.orgEncryptionKey.findUnique({
    where: { organizationId: orgId },
  });

  if (row) {
    // Decrypt the stored DEK using the master key
    const dekHex = decrypt(row.encryptedDek);
    const dek = Buffer.from(dekHex, "hex");
    setCache(orgId, dek); // Populate L1
    await cacheSet(redisKey, row.encryptedDek, 600); // Populate L2 (10 min TTL, encrypted form only)
    return dek;
  }

  // First time for this org — generate and store a new DEK
  const dek = randomBytes(32);
  const encryptedDek = encrypt(dek.toString("hex"));

  await prismadb.orgEncryptionKey.create({
    data: {
      id: crypto.randomUUID(),
      organizationId: orgId,
      encryptedDek,
      updatedAt: new Date(),
    },
  });

  setCache(orgId, dek); // Populate L1
  await cacheSet(redisKey, encryptedDek, 600); // Populate L2
  return dek;
}
