#!/usr/bin/env tsx
/**
 * Master key re-wrap script for OrgEncryptionKey rotation.
 *
 * USAGE: Run BEFORE deploying a new SECRETS_ENCRYPTION_KEY.
 *   OLD_ENCRYPTION_KEY=<old hex> NEW_ENCRYPTION_KEY=<new hex> pnpm rewrap-deks
 *   OLD_ENCRYPTION_KEY=<old hex> NEW_ENCRYPTION_KEY=<new hex> pnpm rewrap-deks --dry-run
 *
 * This script re-encrypts all OrgEncryptionKey rows (active and inactive) so that
 * after deploying the new SECRETS_ENCRYPTION_KEY, the application can still decrypt
 * every stored DEK.
 *
 * SAFETY RULES:
 *  1. Run this script BEFORE updating SECRETS_ENCRYPTION_KEY in production.
 *  2. Use --dry-run first to verify all rows can be decrypted with OLD_ENCRYPTION_KEY.
 *  3. If any row fails decryption, stop and investigate before proceeding.
 *  4. After a successful run, verify with --dry-run using the NEW key as OLD to confirm.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

const prisma = new PrismaClient();
const isDryRun = process.argv.includes("--dry-run");

function getKey(envVar: string): Buffer {
  const hex = process.env[envVar];
  if (!hex) throw new Error(`[rewrap-org-deks] ${envVar} is not set`);
  if (hex.length !== 64) {
    throw new Error(
      `[rewrap-org-deks] ${envVar} must be exactly 64 hex characters (32 bytes). Got ${hex.length} chars.`
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Decrypt a ciphertext that was produced by lib/encryption.ts encrypt().
 * Format: "<ivHex>:<authTagHex>:<encryptedHex>"
 */
function decryptWithKey(ciphertext: string, key: Buffer): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error(
      `[rewrap-org-deks] Unexpected ciphertext format (expected 3 colon-separated parts, got ${parts.length})`
    );
  }
  const [ivHex, authTagHex, encHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/**
 * Encrypt a plaintext using the same format as lib/encryption.ts encrypt().
 * Format: "<ivHex>:<authTagHex>:<encryptedHex>"
 */
function encryptWithKey(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${enc.toString("hex")}`;
}

async function main(): Promise<void> {
  const oldKey = getKey("OLD_ENCRYPTION_KEY");
  const newKey = getKey("NEW_ENCRYPTION_KEY");

  if (isDryRun) {
    console.log("[rewrap-org-deks] *** DRY RUN — no changes will be written ***");
  }

  console.log(
    `[rewrap-org-deks] Starting re-wrap of all OrgEncryptionKey rows` +
      (isDryRun ? " (dry run)" : "")
  );

  const rows = await prisma.orgEncryptionKey.findMany({
    orderBy: [{ organizationId: "asc" }, { keyVersion: "asc" }],
  });

  if (rows.length === 0) {
    console.log("[rewrap-org-deks] No OrgEncryptionKey rows found. Nothing to do.");
    return;
  }

  console.log(`[rewrap-org-deks] Found ${rows.length} key row(s) to process`);

  let successCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    const label = `Org ${row.organizationId} v${row.keyVersion} (${row.isActive ? "active" : "inactive"})`;
    try {
      // Step 1: Decrypt with old key — validates the old key is correct
      const dekHex = decryptWithKey(row.encryptedDek, oldKey);

      // Step 2: Re-encrypt with new key
      const rewrapped = encryptWithKey(dekHex, newKey);

      if (!isDryRun) {
        await prisma.orgEncryptionKey.update({
          where: { id: row.id },
          data: { encryptedDek: rewrapped, updatedAt: new Date() },
        });
      }

      successCount++;
      console.log(`[rewrap-org-deks] ✓ ${label}`);
    } catch (err) {
      errorCount++;
      console.error(
        `[rewrap-org-deks] ✗ ${label}: ${(err as Error).message}`
      );
    }
  }

  console.log(
    `\n[rewrap-org-deks] Done. Success: ${successCount}/${rows.length}, Errors: ${errorCount}`
  );

  if (isDryRun) {
    console.log("[rewrap-org-deks] *** DRY RUN complete — no changes were written ***");
    if (errorCount > 0) {
      console.error(
        "[rewrap-org-deks] Fix the errors above BEFORE running without --dry-run."
      );
    }
  } else if (errorCount > 0) {
    console.error(
      "[rewrap-org-deks] Some rows failed to re-wrap. " +
        "DO NOT deploy the new SECRETS_ENCRYPTION_KEY until all rows succeed."
    );
  } else {
    console.log(
      "[rewrap-org-deks] All rows re-wrapped successfully. " +
        "You may now deploy the new SECRETS_ENCRYPTION_KEY."
    );
  }

  if (errorCount > 0) process.exit(1);
}

main().finally(() => prisma.$disconnect());
