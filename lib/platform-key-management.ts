/**
 * lib/platform-key-management.ts
 *
 * Platform-wide DEK lifecycle for encrypting non-org-scoped data:
 * - FeedbackComment content
 * - AgentContactSubmission fields
 *
 * Mirrors the pattern in lib/key-management.ts (per-org DEKs) but uses
 * PLATFORM_ENCRYPTION_KEY env var and PlatformEncryptionKey table.
 *
 * Caching: L1 (in-process Map, 5min TTL) → L2 (Redis, 10min) → L3 (DB).
 */

import crypto from "crypto";

import { encryptWithKey, decryptWithKey } from "@/lib/encryption";
import { prismadb } from "@/lib/prisma";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";

// ─── L1 in-process cache ─────────────────────
const L1_TTL_MS = 5 * 60 * 1000; // 5 minutes
let l1Cache: { dek: Buffer; expiresAt: number } | null = null;

const REDIS_KEY = "oik:platform-dek";
const REDIS_TTL_SEC = 600; // 10 minutes

function getPlatformMasterKey(): Buffer {
  const hex = process.env.PLATFORM_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "PLATFORM_ENCRYPTION_KEY env var must be a 64-char hex string (32 bytes)"
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Get the active platform DEK. Creates one on first call (lazy initialization).
 * Returns a 32-byte raw key Buffer.
 */
export async function getPlatformDek(): Promise<Buffer> {
  // L1: in-process cache
  if (l1Cache && Date.now() < l1Cache.expiresAt) {
    return l1Cache.dek;
  }

  // L2: Redis cache
  const cached = await cacheGet<string>(REDIS_KEY);
  if (cached) {
    const dek = Buffer.from(
      decryptWithKey(cached, getPlatformMasterKey()),
      "hex"
    );
    l1Cache = { dek, expiresAt: Date.now() + L1_TTL_MS };
    return dek;
  }

  // L3: Database
  const row = await prismadb.platformEncryptionKey.findFirst({
    where: { isActive: true },
    orderBy: { keyVersion: "desc" },
  });

  if (row) {
    const dek = Buffer.from(
      decryptWithKey(row.encryptedDek, getPlatformMasterKey()),
      "hex"
    );
    l1Cache = { dek, expiresAt: Date.now() + L1_TTL_MS };
    await cacheSet(REDIS_KEY, row.encryptedDek, REDIS_TTL_SEC);
    return dek;
  }

  // First ever call — generate and persist a new platform DEK
  const rawDek = crypto.randomBytes(32);
  const encryptedDek = encryptWithKey(
    rawDek.toString("hex"),
    getPlatformMasterKey()
  );

  await prismadb.platformEncryptionKey.create({
    data: { encryptedDek, keyVersion: 1, isActive: true },
  });

  l1Cache = { dek: rawDek, expiresAt: Date.now() + L1_TTL_MS };
  await cacheSet(REDIS_KEY, encryptedDek, REDIS_TTL_SEC);
  return rawDek;
}

/**
 * Rotate the platform DEK. Creates a new version and deactivates the old.
 * Returns the new key version number.
 */
export async function rotatePlatformDek(
  currentVersion: number
): Promise<number> {
  const newVersion = currentVersion + 1;
  const rawDek = crypto.randomBytes(32);
  const encryptedDek = encryptWithKey(
    rawDek.toString("hex"),
    getPlatformMasterKey()
  );

  await prismadb.$transaction(async (tx) => {
    await tx.platformEncryptionKey.updateMany({
      where: { isActive: true },
      data: { isActive: false, rotatedAt: new Date() },
    });

    await tx.platformEncryptionKey.create({
      data: { encryptedDek, keyVersion: newVersion, isActive: true },
    });
  });

  // Clear caches
  l1Cache = null;
  await cacheDel(REDIS_KEY);

  return newVersion;
}

/**
 * Get a specific platform DEK version (for decrypting historical data).
 */
export async function getPlatformDekByVersion(
  version: number
): Promise<Buffer> {
  const row = await prismadb.platformEncryptionKey.findFirst({
    where: { keyVersion: version },
  });

  if (!row) {
    throw new Error(`Platform encryption key version ${version} not found`);
  }

  return Buffer.from(
    decryptWithKey(row.encryptedDek, getPlatformMasterKey()),
    "hex"
  );
}

/**
 * Reset the L1 in-process cache. Exported for testing only.
 * @internal
 */
export function _resetL1CacheForTesting(): void {
  l1Cache = null;
}
