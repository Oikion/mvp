"use client";

/**
 * E2EE Public API — orchestrates identity setup, PIN unlock, encrypt/decrypt
 * for DMs (Double Ratchet) and groups (Megolm), attachment encrypt/decrypt.
 *
 * This module is the single entry point for all E2EE operations.
 * UI components should use the useE2EE hook instead of calling this directly.
 */

import {
  generateECDHKeyPair,
  exportPublicKey,
  importPublicKey as importECDHPublicKey,
  exportPrivateKey,
  wrapPrivateKey,
  unwrapPrivateKeyWithKEK,
  generateEd25519KeyPair,
  exportEd25519PublicKey,
  importEd25519PublicKey,
  wrapEd25519PrivateKey,
  unwrapEd25519PrivateKeyWithKEK,
  deriveSharedSecret,
  hkdfDerive,
  aesGcmEncrypt,
  aesGcmDecrypt,
  base64ToBuffer,
  bufferToBase64,
} from "./primitives";
import type { GroupSessionShare } from "./types";
import {
  initiateX3DH,
  respondX3DH,
  generateSignedPreKey,
  generateOneTimePreKeys,
  type X3DHInitialMessage,
} from "./x3dh";
import { DoubleRatchet } from "./double-ratchet";
import { MegolmOutbound, MegolmInbound } from "./megolm";
import { encryptAttachment, decryptAttachment } from "./attachment";
import {
  storeIdentityKey,
  storeRatchetSession,
  getRatchetSession,
  storeMegolmOutbound,
  getMegolmOutbound,
  storeMegolmInbound,
  getMegolmInbound,
  storeOtpPreKey,
  getOtpPreKey,
  deleteOtpPreKey,
  clearAllSessions,
} from "./session-store";
import {
  encryptEntityComment as _encryptEntityComment,
  decryptEntityComment as _decryptEntityComment,
  initEntitySession as _initEntitySession,
  importEntitySession as _importEntitySession,
  clearEntitySessionCaches,
} from "./entity-comments";
export type { EncryptEntityCommentResult } from "./entity-comments";
import type { PreKeyBundle, EncryptedDMPayload, EncryptedGroupPayload } from "./types";
import { SessionBackupManager, type RestoreResult, type BackupManagerCallbacks } from "./session-backup";

// ─── In-Memory State ──────────────────────────
// These are intentionally NOT persisted — cleared on page reload for security

// TODO(NM-1): Replace with CryptoKey (extractable: false) to prevent XSS extraction.
// Requires refactoring session-store.ts and entity-comments.ts to accept CryptoKey.
// See docs/security/application-security.md finding NM-1 for full scope.
let _kekRaw: ArrayBuffer | null = null;
let _identityKeyPair: CryptoKeyPair | null = null;
let _signingKeyPair: CryptoKeyPair | null = null;
let _userId: string | null = null;
let _backupManager: SessionBackupManager | null = null;

// Cache of active DoubleRatchet sessions (conversationId → instance)
const _ratchetCache = new Map<string, DoubleRatchet>();
// Cache of active Megolm outbound sessions (targetId → instance)
const _megolmOutCache = new Map<string, MegolmOutbound>();
// Cache of active Megolm inbound sessions (sessionId → instance)
const _megolmInCache = new Map<string, MegolmInbound>();

// ─── State Queries ────────────────────────────

export function isUnlocked(): boolean {
  return _kekRaw !== null && _identityKeyPair !== null;
}

export function getCurrentUserId(): string | null {
  return _userId;
}

// ─── Identity Setup (First-Time) ──────────────

export interface SetupResult {
  publicKey: string;
  wrappedPrivateKey: string;
  salt: string;
  signingPublicKey: string;
  wrappedSigningPrivateKey: string;
  signingSalt: string;
  signedPreKey: { publicKey: string; signature: string };
  oneTimePreKeys: Array<{ id: string; publicKey: string }>;
}

/**
 * Generate identity key pair, wrap with PIN, and produce pre-keys.
 * Called during first-time E2EE setup.
 * Returns data to POST to /api/e2ee/identity.
 */
export const MIN_PIN_LENGTH = 6;

export async function setupIdentity(
  pin: string,
  pepperBase64: string,
): Promise<SetupResult> {
  // NC-3: Enforce minimum PIN length to resist offline brute-force.
  // A 6-digit PIN at 600k PBKDF2 iterations ≈ 28 hours on GPU (vs 17 min for 4-digit).
  if (pin.length < MIN_PIN_LENGTH) {
    throw new Error(`PIN must be at least ${MIN_PIN_LENGTH} characters`);
  }

  const pepper = base64ToBuffer(pepperBase64);

  // ECDH identity key pair (for X3DH key agreement)
  const keyPair = await generateECDHKeyPair();
  const { wrappedKey, salt } = await wrapPrivateKey(keyPair.privateKey, pin, pepper);
  const publicKey = await exportPublicKey(keyPair.publicKey);

  // Ed25519 signing key pair (for signing pre-keys — separate from ECDH identity key)
  const signingPair = await generateEd25519KeyPair();
  const { wrappedKey: wrappedSigningPrivateKey, salt: signingSalt } =
    await wrapEd25519PrivateKey(signingPair.privateKey, pin, pepper);
  const signingPublicKey = await exportEd25519PublicKey(signingPair.publicKey);

  // Generate pre-keys signed with the Ed25519 signing key
  const signedPK = await generateSignedPreKey(signingPair.privateKey);
  const otpKeys = await generateOneTimePreKeys(10);

  return {
    publicKey,
    wrappedPrivateKey: wrappedKey,
    salt,
    signingPublicKey,
    wrappedSigningPrivateKey,
    signingSalt,
    signedPreKey: {
      publicKey: signedPK.publicKey,
      signature: signedPK.signature,
    },
    oneTimePreKeys: otpKeys.map((k) => ({ id: k.id, publicKey: k.publicKey })),
  };
}

// ─── PIN Unlock / Lock ────────────────────────

/**
 * Unlock E2EE: fetch pepper from server, derive KEK, unwrap identity key.
 * After this, encrypt/decrypt operations become available.
 */
export interface UnlockSigningKey {
  wrappedSigningPrivateKey: string;
  signingSalt: string;
  signingPublicKey: string;
}

export async function unlock(
  userId: string,
  pin: string,
  pepperBase64: string,
  wrappedPrivateKeyBase64: string,
  saltBase64: string,
  publicKeyBase64: string,
  signingKey?: UnlockSigningKey,
): Promise<void> {
  const pepper = base64ToBuffer(pepperBase64);
  const salt = base64ToBuffer(saltBase64);

  // NM-5: Derive KEK ONCE (PBKDF2 600k iterations) and reuse for all unwrap operations.
  // Previously, unwrapPrivateKey() derived KEK internally, then unlock() called
  // deriveKEKFromPIN() again — doubling the unlock time.
  const { importPublicKey, deriveKEKFromPIN } = await import("./primitives");
  const kek = await deriveKEKFromPIN(pin, salt, pepper);

  // Unwrap ECDH identity private key with pre-derived KEK
  const privateKey = await unwrapPrivateKeyWithKEK(wrappedPrivateKeyBase64, kek);

  // Import ECDH public key to form a CryptoKeyPair
  const publicKey = await importPublicKey(publicKeyBase64);

  _identityKeyPair = { publicKey, privateKey };
  _kekRaw = await crypto.subtle.exportKey("raw", kek);
  _userId = userId;

  // Unwrap Ed25519 signing key with the SAME KEK (no additional PBKDF2)
  if (signingKey) {
    try {
      const signingKek = await deriveKEKFromPIN(pin, base64ToBuffer(signingKey.signingSalt), pepper);
      const signingPrivKey = await unwrapEd25519PrivateKeyWithKEK(
        signingKey.wrappedSigningPrivateKey, signingKek
      );
      const signingPubKey = await importEd25519PublicKey(signingKey.signingPublicKey);
      _signingKeyPair = { privateKey: signingPrivKey, publicKey: signingPubKey };
    } catch (err) {
      console.warn("[E2EE] Failed to unwrap signing key — continuing without it", err);
    }
  } else {
    console.warn("[E2EE] No signing key in identity record — legacy user, pre-key verification disabled");
  }

  // Cache ECDH identity key in IndexedDB (encrypted with KEK)
  const serialized = await exportPrivateKey(privateKey);
  await storeIdentityKey(userId, serialized, _kekRaw);

  // Initialize backup manager for session sync
  _backupManager = new SessionBackupManager(
    async () => _identityKeyPair!.publicKey,
    async () => _identityKeyPair!.privateKey,
  );

  // Restore sessions from server backup
  const restoreResult = await _backupManager.restoreAll(_kekRaw!);
  if (restoreResult.restored > 0) {
    console.info(`[E2EE] Restored ${restoreResult.restored} sessions from backup`);
  }
}

/**
 * Lock E2EE: clear all in-memory crypto state.
 */
export function lock(): void {
  _backupManager?.destroy();
  _backupManager = null;
  _kekRaw = null;
  _identityKeyPair = null;
  _signingKeyPair = null;
  _userId = null;
  _ratchetCache.clear();
  _megolmOutCache.clear();
  _megolmInCache.clear();
  clearEntitySessionCaches();
}

// ─── DM Encryption (Double Ratchet) ───────────

/**
 * Initiate a new DM session with a recipient using X3DH.
 * Returns the initial message to store on the server.
 */
export async function initiateDMSession(
  recipientBundle: PreKeyBundle,
  conversationId: string,
): Promise<{ initialMessage: X3DHInitialMessage }> {
  assertUnlocked();
  const { sharedSecret, initialMessage } = await initiateX3DH(
    _identityKeyPair!,
    recipientBundle,
  );

  // Initialize Double Ratchet as sender
  const { importPublicKey } = await import("./primitives");
  const recipientPub = await importPublicKey(recipientBundle.signedPreKey);
  const ratchet = await DoubleRatchet.initSender(sharedSecret, recipientPub);

  // Cache and persist
  _ratchetCache.set(conversationId, ratchet);
  const serialized = await ratchet.serialize();
  await storeRatchetSession(conversationId, serialized, _kekRaw!);
  _backupManager?.markDirty("ratchet", `ratchet:${conversationId}`, serialized);

  return { initialMessage };
}

/**
 * Accept an incoming DM session (Bob's side of X3DH).
 */
export async function acceptDMSession(
  conversationId: string,
  initialMessage: X3DHInitialMessage,
  signedPreKeyPair: CryptoKeyPair,
  signedPreKeySignature: string,
  oneTimePreKey?: { keyPair: CryptoKeyPair; id: string },
): Promise<void> {
  assertUnlocked();
  const { sharedSecret } = await respondX3DH(
    _identityKeyPair!,
    { keyPair: signedPreKeyPair, signature: signedPreKeySignature },
    oneTimePreKey,
    initialMessage,
  );

  const ratchet = await DoubleRatchet.initReceiver(sharedSecret, signedPreKeyPair);
  _ratchetCache.set(conversationId, ratchet);
  const serialized = await ratchet.serialize();
  await storeRatchetSession(conversationId, serialized, _kekRaw!);
  _backupManager?.markDirty("ratchet", `ratchet:${conversationId}`, serialized);
}

/**
 * Encrypt a DM message.
 */
export async function encryptDM(
  conversationId: string,
  plaintext: string,
): Promise<EncryptedDMPayload> {
  assertUnlocked();
  const ratchet = await loadRatchetSession(conversationId);
  const payload = await ratchet.encrypt(plaintext);
  // Persist updated session state
  const serialized = await ratchet.serialize();
  await storeRatchetSession(conversationId, serialized, _kekRaw!);
  _backupManager?.markDirty("ratchet", `ratchet:${conversationId}`, serialized);
  return payload;
}

/**
 * Decrypt a DM message.
 */
export async function decryptDM(
  conversationId: string,
  payload: EncryptedDMPayload,
): Promise<string> {
  assertUnlocked();
  const ratchet = await loadRatchetSession(conversationId);
  const plaintext = await ratchet.decrypt(payload);
  // Persist updated session state (ratchet advances)
  const serialized = await ratchet.serialize();
  await storeRatchetSession(conversationId, serialized, _kekRaw!);
  _backupManager?.markDirty("ratchet", `ratchet:${conversationId}`, serialized);
  return plaintext;
}

// ─── ECIES Session Export Helpers ─────────────

const ECIES_INFO = new TextEncoder().encode("megolm-session-export-v1");

/**
 * ECIES-encrypt a Megolm session export for a single recipient's identity public key.
 * Uses ephemeral ECDH → HKDF → AES-256-GCM so only the recipient can decrypt.
 */
async function eciesEncryptSessionExport(
  sessionExportJson: string,
  userId: string,
  recipientPublicKeyBase64: string,
): Promise<GroupSessionShare> {
  const recipientPubKey = await importECDHPublicKey(recipientPublicKeyBase64);
  const ephemeral = await generateECDHKeyPair();

  const sharedBits = await deriveSharedSecret(ephemeral.privateKey, recipientPubKey);
  const ephemeralPubBytes = base64ToBuffer(await exportPublicKey(ephemeral.publicKey));
  const encKey = await hkdfDerive(sharedBits, ephemeralPubBytes, ECIES_INFO, 32);

  const plaintext = new TextEncoder().encode(sessionExportJson);
  const { ciphertext, iv } = await aesGcmEncrypt(plaintext, encKey);

  return {
    userId,
    ephemeralPublicKey: await exportPublicKey(ephemeral.publicKey),
    encryptedSessionExport: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv),
    startingIndex: 0,
  };
}

/**
 * ECIES-decrypt a Megolm session export share using our identity private key.
 */
export async function decryptSessionExportFromShare(
  share: GroupSessionShare,
): Promise<{ sessionId: string; targetId: string; ratchetKey: string; messageIndex: number }> {
  assertUnlocked();
  const ephemeralPubKey = await importECDHPublicKey(share.ephemeralPublicKey);
  const sharedBits = await deriveSharedSecret(_identityKeyPair!.privateKey, ephemeralPubKey);
  const ephemeralPubBytes = base64ToBuffer(share.ephemeralPublicKey);
  const encKey = await hkdfDerive(sharedBits, ephemeralPubBytes, ECIES_INFO, 32);

  const plaintext = await aesGcmDecrypt(
    base64ToBuffer(share.encryptedSessionExport),
    encKey,
    base64ToBuffer(share.iv),
  );

  const parsed = JSON.parse(new TextDecoder().decode(plaintext));

  // Validate required fields — a corrupted or tampered payload must not silently
  // propagate into the Megolm inbound cache. Note: messageIndex 0 is valid (new session).
  if (
    typeof parsed.sessionId !== "string" || !parsed.sessionId ||
    typeof parsed.targetId !== "string" || !parsed.targetId ||
    typeof parsed.ratchetKey !== "string" || !parsed.ratchetKey ||
    typeof parsed.messageIndex !== "number"
  ) {
    throw new Error(
      "Decrypted session export is malformed — required fields missing or wrong type"
    );
  }

  return parsed;
}

// ─── Group/Channel Encryption (Megolm) ────────

/**
 * Create a new Megolm outbound session for a group/channel.
 * Encrypts the session export for each participant with ECIES.
 */
export async function createGroupSession(
  targetId: string,
  participants: Array<{ userId: string; publicKey: string }>,
  maxMessages?: number,
): Promise<{ sessionId: string; shares: GroupSessionShare[] }> {
  assertUnlocked();
  const session = await MegolmOutbound.create(targetId, maxMessages);
  _megolmOutCache.set(targetId, session);
  await storeMegolmOutbound(targetId, session.serialize(), _kekRaw!);
  _backupManager?.markDirty("megolm-out", `megolm-out:${targetId}`, session.serialize());

  const exportJson = JSON.stringify(session.exportSession());
  const shares = await Promise.all(
    participants.map((p) => eciesEncryptSessionExport(exportJson, p.userId, p.publicKey))
  );

  return { sessionId: session.sessionId, shares };
}

/**
 * Import a Megolm inbound session from an ECIES-encrypted share.
 */
export async function importGroupSession(
  share: GroupSessionShare,
): Promise<void> {
  assertUnlocked();
  const sessionExport = await decryptSessionExportFromShare(share);
  const session = MegolmInbound.fromExport(sessionExport);
  _megolmInCache.set(sessionExport.sessionId, session);
  await storeMegolmInbound(sessionExport.sessionId, session.serialize(), _kekRaw!);
  _backupManager?.markDirty("megolm-in", `megolm-in:${sessionExport.sessionId}`, session.serialize());
}

/**
 * Encrypt a group/channel message.
 */
export async function encryptGroup(
  targetId: string,
  plaintext: string,
): Promise<EncryptedGroupPayload> {
  assertUnlocked();
  const session = await loadMegolmOutbound(targetId);
  const payload = await session.encrypt(plaintext);
  // Persist updated state
  await storeMegolmOutbound(targetId, session.serialize(), _kekRaw!);
  _backupManager?.markDirty("megolm-out", `megolm-out:${targetId}`, session.serialize());
  return payload;
}

/**
 * Decrypt a group/channel message.
 */
export async function decryptGroup(
  sessionId: string,
  messageIndex: number,
  ciphertext: string,
  iv: string,
): Promise<string> {
  assertUnlocked();
  const session = await loadMegolmInbound(sessionId);
  const plaintext = await session.decrypt(messageIndex, ciphertext, iv);
  // Persist updated state
  await storeMegolmInbound(sessionId, session.serialize(), _kekRaw!);
  _backupManager?.markDirty("megolm-in", `megolm-in:${sessionId}`, session.serialize());
  return plaintext;
}

/**
 * Check if the current outbound session needs rotation.
 */
export async function needsGroupRotation(targetId: string): Promise<boolean> {
  try {
    const session = await loadMegolmOutbound(targetId);
    return session.needsRotation();
  } catch {
    return true; // No session = needs creation
  }
}

// ─── Entity Comment Encryption (Megolm) ──────

/**
 * Initialize a Megolm session for an entity (first comment or entity creation in E2EE org).
 * Returns raw session data — use initEntitySessionWithShares() for production code.
 *
 * @deprecated Prefer initEntitySessionWithShares() which ECIES-encrypts the session export
 * for each participant before returning. This function returns the plaintext session export,
 * requiring the caller to handle ECIES encryption manually (error-prone, see NM-4).
 */
export async function initEntitySession(
  entityType: "CONTACT" | "PROPERTY" | "REQUEST" | "TASK",
  entityId: string,
) {
  assertUnlocked();
  return _initEntitySession(entityType, entityId, _kekRaw!,
    (type, key, state) => _backupManager?.markDirty(type as any, key, state));
}

/**
 * NM-4: Initialize a Megolm session for an entity AND produce ECIES-encrypted shares
 * for each participant. This enforces encryption at the API boundary — callers cannot
 * accidentally send the plaintext session export to the server.
 *
 * Mirrors the pattern used by createGroupSession().
 */
export async function initEntitySessionWithShares(
  entityType: "CONTACT" | "PROPERTY" | "REQUEST" | "TASK",
  entityId: string,
  participants: Array<{ userId: string; publicKey: string }>,
) {
  assertUnlocked();
  const { sessionId, sessionExport } = await _initEntitySession(entityType, entityId, _kekRaw!,
    (type, key, state) => _backupManager?.markDirty(type as any, key, state));

  const exportJson = JSON.stringify(sessionExport);
  const shares = await Promise.all(
    participants.map((p) => eciesEncryptSessionExport(exportJson, p.userId, p.publicKey))
  );

  return { sessionId, shares };
}

/**
 * Import an entity Megolm inbound session from a decrypted session share.
 */
export async function importEntitySession(
  sessionExport: { sessionId: string; targetId: string; ratchetKey: string; messageIndex: number },
) {
  assertUnlocked();
  return _importEntitySession(sessionExport, _kekRaw!,
    (type, key, state) => _backupManager?.markDirty(type as any, key, state));
}

/**
 * Encrypt a comment for an entity using its Megolm session.
 * Session must be initialized first via initEntitySession().
 */
export async function encryptEntityComment(
  entityType: "CONTACT" | "PROPERTY" | "REQUEST" | "TASK",
  entityId: string,
  plaintext: string,
) {
  assertUnlocked();
  return _encryptEntityComment(entityType, entityId, plaintext, _kekRaw!,
    (type, key, state) => _backupManager?.markDirty(type as any, key, state));
}

/**
 * Decrypt an entity comment using the Megolm session identified by sessionId.
 * encryptedContent is the combined "iv:ciphertext" string from the DB.
 */
export async function decryptEntityComment(
  sessionId: string,
  messageIndex: number,
  encryptedContent: string,
) {
  assertUnlocked();
  return _decryptEntityComment(sessionId, messageIndex, encryptedContent, _kekRaw!,
    (type, key, state) => _backupManager?.markDirty(type as any, key, state));
}

// ─── Session Backup Helpers ───────────────────

/**
 * Flush any pending session backups synchronously (best-effort via sendBeacon).
 * Call from the useE2EE hook's beforeunload/visibilitychange handler.
 */
export function flushBackupsOnUnload(): void {
  _backupManager?.flushOnUnload();
}

/**
 * Get the backup manager instance for status inspection.
 * Returns null if E2EE is locked.
 */
export function getBackupManager(): SessionBackupManager | null {
  return _backupManager;
}

// ─── Attachments ──────────────────────────────

export { encryptAttachment, decryptAttachment };

// ─── Session Management ───────────────────────

/**
 * Clear all persisted E2EE sessions from IndexedDB.
 */
export async function clearAll(): Promise<void> {
  lock();
  await clearAllSessions();
}

// ─── Pre-Key Replenishment ────────────────────

/**
 * Generate new one-time pre-keys for upload.
 * NL-2: Private keys are now stored in IndexedDB (KEK-encrypted) so they can be
 * retrieved later for X3DH DH4 computation. Previously, private keys were discarded,
 * making OTP keys generated through replenishment unusable for DH4.
 */
export async function generatePreKeys(
  count: number,
): Promise<Array<{ id: string; publicKey: string }>> {
  assertUnlocked();
  const keys = await generateOneTimePreKeys(count);

  // Store each private key in IndexedDB before discarding the CryptoKey objects
  for (const key of keys) {
    const serialized = await exportPrivateKey(key.keyPair.privateKey);
    await storeOtpPreKey(key.id, serialized, _kekRaw!);
  }

  return keys.map((k) => ({ id: k.id, publicKey: k.publicKey }));
}

/**
 * NL-2: Retrieve an OTP pre-key private key from IndexedDB and import it as a CryptoKey.
 * Used by acceptDMSession() for the DH4 step when the initiator specified a oneTimePreKeyId.
 * Returns null if the key isn't found (generated pre-NL-2, or already consumed).
 */
export async function getOtpPrivateKey(keyId: string): Promise<CryptoKey | null> {
  assertUnlocked();
  const serialized = await getOtpPreKey(keyId, _kekRaw!);
  if (!serialized) return null;
  const { importPrivateKey } = await import("./primitives");
  return importPrivateKey(serialized);
}

/**
 * NL-2: Delete an OTP pre-key after consumption (one-time use guarantee).
 */
export async function consumeOtpPrivateKey(keyId: string): Promise<void> {
  await deleteOtpPreKey(keyId);
}

// ─── Internal Helpers ─────────────────────────

function assertUnlocked(): void {
  if (!_kekRaw || !_identityKeyPair) {
    throw new Error("E2EE is locked — unlock with PIN first");
  }
}

async function loadRatchetSession(conversationId: string): Promise<DoubleRatchet> {
  let ratchet = _ratchetCache.get(conversationId);
  if (ratchet) return ratchet;

  // Try IndexedDB
  const serialized = await getRatchetSession(conversationId, _kekRaw!);
  if (!serialized) {
    throw new Error(`No Double Ratchet session for conversation ${conversationId}`);
  }
  ratchet = await DoubleRatchet.deserialize(serialized);
  _ratchetCache.set(conversationId, ratchet);
  return ratchet;
}

async function loadMegolmOutbound(targetId: string): Promise<MegolmOutbound> {
  let session = _megolmOutCache.get(targetId);
  if (session) return session;

  const serialized = await getMegolmOutbound(targetId, _kekRaw!);
  if (!serialized) {
    throw new Error(`No Megolm outbound session for ${targetId}`);
  }
  session = MegolmOutbound.deserialize(serialized);
  _megolmOutCache.set(targetId, session);
  return session;
}

async function loadMegolmInbound(sessionId: string): Promise<MegolmInbound> {
  let session = _megolmInCache.get(sessionId);
  if (session) return session;

  const serialized = await getMegolmInbound(sessionId, _kekRaw!);
  if (!serialized) {
    throw new Error(`No Megolm inbound session for ${sessionId}`);
  }
  session = MegolmInbound.deserialize(serialized);
  _megolmInCache.set(sessionId, session);
  return session;
}
