"use client";

import {
  generateECDHKeyPair,
  deriveSharedSecret,
  hkdfDerive,
  aesGcmEncrypt,
  aesGcmDecrypt,
  exportPublicKey,
  importPublicKey,
  bufferToBase64,
  base64ToBuffer,
} from "./primitives";

import {
  storeRatchetSession,
  storeMegolmOutbound,
  storeMegolmInbound,
  getBackupVersion,
  setBackupVersion,
} from "./session-store";

// ─── Types ──────────────────────────────────────

export type SessionType = "ratchet" | "megolm-out" | "megolm-in";

export interface BackupManagerCallbacks {
  onSyncComplete?: () => void;
  onConflictDetected?: () => void;
  onFlushFailure?: (consecutiveFailures: number) => void;
  onRestoreProgress?: (restored: number, total: number) => void;
}

export interface RestoreResult {
  restored: number;
  skipped: number;
  errors: number;
}

interface DirtyEntry {
  sessionType: SessionType;
  sessionKey: string;
  serializedState: string;
}

interface EciesPayload {
  eciesBlob: string;       // Base64 ciphertext
  ephemeralPubKey: string;  // Base64 SPKI
  iv: string;               // Base64 IV
}

interface BackupItem {
  sessionKey: string;
  sessionType: SessionType;
  eciesBlob: string;
  ephemeralPubKey: string;
  iv: string;
}

interface ServerBackupResponse {
  results: Array<{
    sessionKey: string;
    version: number;
  }>;
}

interface ServerRestoreResponse {
  backups: Array<{
    sessionKey: string;
    sessionType: SessionType;
    eciesBlob: string;
    ephemeralPubKey: string;
    iv: string;
    version: number;
  }>;
}

// ─── HKDF constants ────────────────────────────

const HKDF_SALT = new Uint8Array(32); // zeroed 32-byte salt
const HKDF_INFO = new TextEncoder().encode("e2ee-session-backup");
const HKDF_LENGTH = 32;

// ─── ECIES helpers ─────────────────────────────

export async function eciesEncrypt(
  plaintext: string,
  recipientPublicKey: CryptoKey
): Promise<EciesPayload> {
  // 1. Generate ephemeral ECDH key pair
  const ephKeyPair = await generateECDHKeyPair();

  // 2. Derive shared secret: ECDH(ephemeral private, recipient public)
  const sharedSecret = await deriveSharedSecret(ephKeyPair.privateKey, recipientPublicKey);

  // 3. HKDF to get AES-256 key
  const aesKey = await hkdfDerive(sharedSecret, HKDF_SALT, HKDF_INFO, HKDF_LENGTH);

  // 4. AES-GCM encrypt the plaintext
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const { ciphertext, iv } = await aesGcmEncrypt(plaintextBytes, aesKey);

  // 5. Export ephemeral public key
  const ephPubBase64 = await exportPublicKey(ephKeyPair.publicKey);

  return {
    eciesBlob: bufferToBase64(ciphertext),
    ephemeralPubKey: ephPubBase64,
    iv: bufferToBase64(iv),
  };
}

export async function eciesDecrypt(
  payload: EciesPayload,
  recipientPrivateKey: CryptoKey
): Promise<string> {
  // 1. Import ephemeral public key
  const ephPubKey = await importPublicKey(payload.ephemeralPubKey);

  // 2. Derive shared secret: ECDH(recipient private, ephemeral public)
  const sharedSecret = await deriveSharedSecret(recipientPrivateKey, ephPubKey);

  // 3. HKDF to get AES-256 key
  const aesKey = await hkdfDerive(sharedSecret, HKDF_SALT, HKDF_INFO, HKDF_LENGTH);

  // 4. AES-GCM decrypt
  const plaintext = await aesGcmDecrypt(
    base64ToBuffer(payload.eciesBlob),
    aesKey,
    base64ToBuffer(payload.iv)
  );

  return new TextDecoder().decode(plaintext);
}

// ─── Session type prefix parsing ───────────────

const SESSION_TYPE_PREFIXES: Record<SessionType, string> = {
  "ratchet": "ratchet:",
  "megolm-out": "megolm-out:",
  "megolm-in": "megolm-in:",
};

function stripSessionPrefix(sessionKey: string, sessionType: SessionType): string {
  const prefix = SESSION_TYPE_PREFIXES[sessionType];
  if (sessionKey.startsWith(prefix)) {
    return sessionKey.slice(prefix.length);
  }
  return sessionKey;
}

// ─── SessionBackupManager ──────────────────────

const DEBOUNCE_MS = 5_000;

export class SessionBackupManager {
  private dirtyMap = new Map<string, DirtyEntry>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _consecutiveFailures = 0;
  private _lastFlushedAt: Date | null = null;
  private _isFlushing = false;

  private getIdentityPublicKey: () => Promise<CryptoKey>;
  private getIdentityPrivateKey: () => Promise<CryptoKey>;
  private callbacks: BackupManagerCallbacks;

  constructor(
    getIdentityPublicKey: () => Promise<CryptoKey>,
    getIdentityPrivateKey: () => Promise<CryptoKey>,
    callbacks: BackupManagerCallbacks = {}
  ) {
    this.getIdentityPublicKey = getIdentityPublicKey;
    this.getIdentityPrivateKey = getIdentityPrivateKey;
    this.callbacks = callbacks;
  }

  // ─── Public getters ──────────────────────────

  get consecutiveFailures(): number {
    return this._consecutiveFailures;
  }

  get lastFlushedAt(): Date | null {
    return this._lastFlushedAt;
  }

  get dirtyCount(): number {
    return this.dirtyMap.size;
  }

  get isFlushing(): boolean {
    return this._isFlushing;
  }

  // ─── markDirty ───────────────────────────────

  markDirty(sessionType: SessionType, sessionKey: string, serializedState: string): void {
    this.dirtyMap.set(sessionKey, { sessionType, sessionKey, serializedState });

    // Reset debounce timer
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flush();
    }, DEBOUNCE_MS);
  }

  // ─── flush ───────────────────────────────────

  async flush(): Promise<void> {
    if (this.dirtyMap.size === 0) return;
    if (this._isFlushing) return;

    this._isFlushing = true;

    // Snapshot and clear dirty map so new changes during flush are tracked separately
    const entries = Array.from(this.dirtyMap.values());
    this.dirtyMap.clear();

    try {
      const publicKey = await this.getIdentityPublicKey();

      // ECIES-encrypt each entry
      const items: BackupItem[] = await Promise.all(
        entries.map(async (entry) => {
          const encrypted = await eciesEncrypt(entry.serializedState, publicKey);
          return {
            sessionKey: entry.sessionKey,
            sessionType: entry.sessionType,
            eciesBlob: encrypted.eciesBlob,
            ephemeralPubKey: encrypted.ephemeralPubKey,
            iv: encrypted.iv,
          };
        })
      );

      // POST batch to server
      const response = await fetch("/api/e2ee/session-backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backups: items }),
      });

      if (!response.ok) {
        throw new Error(`Backup flush failed: ${response.status}`);
      }

      const result: ServerBackupResponse = await response.json();

      // Update local backup versions
      await Promise.all(
        result.results.map((item) => setBackupVersion(item.sessionKey, item.version))
      );

      // Success — reset failure counter
      this._consecutiveFailures = 0;
      this._lastFlushedAt = new Date();
      this.callbacks.onSyncComplete?.();
    } catch (error) {
      // Re-add entries that failed back to dirty map (only if not already overwritten)
      for (const entry of entries) {
        if (!this.dirtyMap.has(entry.sessionKey)) {
          this.dirtyMap.set(entry.sessionKey, entry);
        }
      }

      this._consecutiveFailures++;
      this.callbacks.onFlushFailure?.(this._consecutiveFailures);
      console.error("[E2EE-BACKUP] Flush failed:", error);
    } finally {
      this._isFlushing = false;
    }
  }

  // ─── flushOnUnload ───────────────────────────

  flushOnUnload(): void {
    if (this.dirtyMap.size === 0) return;

    // Cancel pending debounce since we're flushing now
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // sendBeacon is synchronous — cannot do async ECIES encryption.
    // Best-effort: send dirty session keys only (no encrypted state).
    // The primary backup mechanism is the 5-second debounce timer + visibilitychange flush.
    // This beacon serves as a signal that backups may be stale — the next unlock
    // will reconcile via restoreAll.
    const entries = Array.from(this.dirtyMap.values()).map((e) => ({
      sessionKey: e.sessionKey,
      sessionType: e.sessionType,
    }));

    const blob = new Blob([JSON.stringify({ pendingSessions: entries })], {
      type: "text/plain",  // sendBeacon with text/plain per spec
    });

    navigator.sendBeacon("/api/e2ee/session-backups/beacon", blob);
    this.dirtyMap.clear();
  }

  // ─── restoreAll ──────────────────────────────

  async restoreAll(kek: ArrayBuffer): Promise<RestoreResult> {
    const result: RestoreResult = { restored: 0, skipped: 0, errors: 0 };

    try {
      const response = await fetch("/api/e2ee/session-backups", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Restore fetch failed: ${response.status}`);
      }

      const data: ServerRestoreResponse = await response.json();
      const backups = data.backups;

      if (!backups || backups.length === 0) {
        return result;
      }

      const privateKey = await this.getIdentityPrivateKey();

      for (let i = 0; i < backups.length; i++) {
        const backup = backups[i];

        try {
          // Check local version
          const localVersion = await getBackupVersion(backup.sessionKey);
          if (localVersion >= backup.version) {
            result.skipped++;
            this.callbacks.onRestoreProgress?.(result.restored + result.skipped, backups.length);
            continue;
          }

          // Server has newer version — conflict detected
          if (localVersion > 0) {
            this.callbacks.onConflictDetected?.();
          }

          // ECIES decrypt
          const plaintext = await eciesDecrypt(
            {
              eciesBlob: backup.eciesBlob,
              ephemeralPubKey: backup.ephemeralPubKey,
              iv: backup.iv,
            },
            privateKey
          );

          // Import session to IndexedDB
          const strippedKey = stripSessionPrefix(backup.sessionKey, backup.sessionType);

          switch (backup.sessionType) {
            case "ratchet":
              await storeRatchetSession(strippedKey, plaintext, kek);
              break;
            case "megolm-out":
              await storeMegolmOutbound(strippedKey, plaintext, kek);
              break;
            case "megolm-in":
              await storeMegolmInbound(strippedKey, plaintext, kek);
              break;
            default:
              console.error("[E2EE-BACKUP] Unknown session type:", backup.sessionType);
              result.errors++;
              continue;
          }

          // Update local version to match server
          await setBackupVersion(backup.sessionKey, backup.version);
          result.restored++;
        } catch (err) {
          console.error("[E2EE-BACKUP] Failed to restore session:", backup.sessionKey, err);
          result.errors++;
        }

        this.callbacks.onRestoreProgress?.(result.restored + result.skipped + result.errors, backups.length);
      }

      if (result.restored > 0) {
        this.callbacks.onSyncComplete?.();
      }
    } catch (error) {
      console.error("[E2EE-BACKUP] restoreAll failed:", error);
      result.errors++;
    }

    return result;
  }

  // ─── clearAll ────────────────────────────────

  async clearAll(): Promise<void> {
    await fetch("/api/e2ee/session-backups", {
      method: "DELETE",
    });
  }

  // ─── Cleanup ─────────────────────────────────

  destroy(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.dirtyMap.clear();
  }
}
