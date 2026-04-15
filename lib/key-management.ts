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
 *
 * Key rotation:
 *   await rotateOrgDek(orgId);  // Creates new version, deactivates old
 */

import { randomBytes } from "node:crypto";
import { prismadb } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";

// ─── In-process cache ────────────────────────────────────────────────────────
// Caches decoded DEK Buffers per orgId for the lifetime of the serverless instance.
// Safe because each serverless invocation is isolated; keys don't leak across tenants.

interface CacheEntry {
  dek: Buffer;
  expiresAt: number;
}

// NM-3: Reduced from 5 minutes to 30 seconds so that after an emergency DEK rotation,
// other serverless instances pick up the new key within 30s (instead of 5 min).
// Trade-off: ~10x more L2 Redis reads, but each is <1ms for a single small value.
const DEK_CACHE_TTL_MS = 30 * 1000; // 30 seconds
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

/**
 * Clear in-process and Redis caches for a given org.
 * Called after key rotation to force re-fetch of the new active key.
 */
async function clearCache(orgId: string): Promise<void> {
  dekCache.delete(orgId);
  await cacheDel(`oik:dek:${orgId}`);
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

  // L3: Look up in DB — find the active key (highest version)
  const row = await prismadb.orgEncryptionKey.findFirst({
    where: { organizationId: orgId, isActive: true },
    orderBy: { keyVersion: "desc" },
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
      keyVersion: 1,
      isActive: true,
      updatedAt: new Date(),
    },
  });

  setCache(orgId, dek); // Populate L1
  await cacheSet(redisKey, encryptedDek, 600); // Populate L2
  return dek;
}

/**
 * Rotate the DEK for an organization.
 *
 * Creates a new key version and deactivates the old one.
 * After rotation, encrypted data should be re-encrypted with the new key
 * in a background migration (not handled here).
 *
 * Returns the new key version number.
 */
export async function rotateOrgDek(orgId: string): Promise<number> {
  if (!orgId) throw new Error("[key-management] rotateOrgDek: orgId is required");

  // Get the current active key version
  const currentKey = await prismadb.orgEncryptionKey.findFirst({
    where: { organizationId: orgId, isActive: true },
    orderBy: { keyVersion: "desc" },
  });

  const newVersion = currentKey ? currentKey.keyVersion + 1 : 1;

  // Generate new DEK
  const dek = randomBytes(32);
  const encryptedDek = encrypt(dek.toString("hex"));

  // Transactional: deactivate old key + create new key
  await prismadb.$transaction([
    // Deactivate all current active keys for this org
    prismadb.orgEncryptionKey.updateMany({
      where: { organizationId: orgId, isActive: true },
      data: { isActive: false, rotatedAt: new Date() },
    }),
    // Create new active key
    prismadb.orgEncryptionKey.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: orgId,
        encryptedDek,
        keyVersion: newVersion,
        isActive: true,
        updatedAt: new Date(),
      },
    }),
  ]);

  // Clear caches so next getOrgDek() picks up the new key
  await clearCache(orgId);

  return newVersion;
}

/**
 * Get all DEK candidates for decryption in priority order: active key first,
 * then inactive versions sorted newest → oldest.
 *
 * The active key is served from the L1/L2/L3 cache path (getOrgDek).
 * Inactive previous versions are fetched directly from DB — they are rare reads
 * that only occur when a field was encrypted with an older DEK (post-rotation).
 *
 * Each inactive key is silently skipped if its encryptedDek cannot be decrypted
 * by the current master key (e.g. the master key was rotated), rather than
 * aborting the entire decryption attempt.
 */
export async function getOrgDeksForDecryption(orgId: string): Promise<Buffer[]> {
  if (!orgId) throw new Error("[key-management] getOrgDeksForDecryption: orgId is required");

  const deks: Buffer[] = [];

  // Active key first (uses cache layers)
  try {
    const activeDek = await getOrgDek(orgId);
    deks.push(activeDek);
  } catch {
    // If even the active key can't be loaded, proceed with whatever we can get from DB
    console.warn(`[key-management] getOrgDeksForDecryption: failed to load active DEK for org ${orgId}`);
  }

  // Previous (inactive) versions — fetch from DB, newest first
  const inactiveRows = await prismadb.orgEncryptionKey.findMany({
    where: { organizationId: orgId, isActive: false },
    orderBy: { keyVersion: "desc" },
    select: { encryptedDek: true, keyVersion: true },
  });

  for (const row of inactiveRows) {
    try {
      const dekHex = decrypt(row.encryptedDek);
      deks.push(Buffer.from(dekHex, "hex"));
    } catch {
      // Master key cannot decrypt this DEK version — skip it silently
      // (can happen if SECRETS_ENCRYPTION_KEY was rotated between DEK generation and now)
      console.warn(
        `[key-management] getOrgDeksForDecryption: could not decrypt inactive DEK version ${row.keyVersion} for org ${orgId}, skipping`
      );
    }
  }

  return deks;
}

/**
 * Get a specific key version for an org (used during re-encryption migrations).
 */
export async function getOrgDekByVersion(orgId: string, version: number): Promise<Buffer> {
  const row = await prismadb.orgEncryptionKey.findFirst({
    where: { organizationId: orgId, keyVersion: version },
  });

  if (!row) {
    throw new Error(`[key-management] No key found for org ${orgId} version ${version}`);
  }

  const dekHex = decrypt(row.encryptedDek);
  return Buffer.from(dekHex, "hex");
}

/**
 * Get the current active key version for an org.
 */
export async function getOrgKeyVersion(orgId: string): Promise<number> {
  const row = await prismadb.orgEncryptionKey.findFirst({
    where: { organizationId: orgId, isActive: true },
    orderBy: { keyVersion: "desc" },
    select: { keyVersion: true },
  });

  return row?.keyVersion ?? 0;
}
