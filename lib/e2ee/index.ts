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
  exportPrivateKey,
  importPrivateKey,
  wrapPrivateKey,
  unwrapPrivateKey,
  base64ToBuffer,
  bufferToBase64,
} from "./primitives";
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
  getIdentityKey,
  storeRatchetSession,
  getRatchetSession,
  storeMegolmOutbound,
  getMegolmOutbound,
  storeMegolmInbound,
  getMegolmInbound,
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

// ─── In-Memory State ──────────────────────────
// These are intentionally NOT persisted — cleared on page reload for security

let _kekRaw: ArrayBuffer | null = null;
let _identityKeyPair: CryptoKeyPair | null = null;
let _userId: string | null = null;

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
  signedPreKey: { publicKey: string; signature: string };
  oneTimePreKeys: Array<{ id: string; publicKey: string }>;
}

/**
 * Generate identity key pair, wrap with PIN, and produce pre-keys.
 * Called during first-time E2EE setup.
 * Returns data to POST to /api/e2ee/identity.
 */
export async function setupIdentity(
  pin: string,
  pepperBase64: string,
): Promise<SetupResult> {
  const pepper = base64ToBuffer(pepperBase64);
  const keyPair = await generateECDHKeyPair();
  const { wrappedKey, salt } = await wrapPrivateKey(keyPair.privateKey, pin, pepper);
  const publicKey = await exportPublicKey(keyPair.publicKey);

  // Generate pre-keys signed with identity key
  const signedPK = await generateSignedPreKey(keyPair.privateKey);
  const otpKeys = await generateOneTimePreKeys(10);

  return {
    publicKey,
    wrappedPrivateKey: wrappedKey,
    salt,
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
export async function unlock(
  userId: string,
  pin: string,
  pepperBase64: string,
  wrappedPrivateKeyBase64: string,
  saltBase64: string,
  publicKeyBase64: string,
): Promise<void> {
  const pepper = base64ToBuffer(pepperBase64);

  // Derive KEK and unwrap private key
  const privateKey = await unwrapPrivateKey(wrappedPrivateKeyBase64, pin, pepper, saltBase64);

  // Import public key to form a CryptoKeyPair
  const { importPublicKey } = await import("./primitives");
  const publicKey = await importPublicKey(publicKeyBase64);

  _identityKeyPair = { publicKey, privateKey };
  _kekRaw = await crypto.subtle.exportKey("raw",
    await (await import("./primitives")).deriveKEKFromPIN(pin, base64ToBuffer(saltBase64), pepper)
  );
  _userId = userId;

  // Cache identity key in IndexedDB (encrypted with KEK)
  const serialized = await exportPrivateKey(privateKey);
  await storeIdentityKey(userId, serialized, _kekRaw);
}

/**
 * Lock E2EE: clear all in-memory crypto state.
 */
export function lock(): void {
  _kekRaw = null;
  _identityKeyPair = null;
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
  oneTimePreKeyPair?: CryptoKeyPair,
): Promise<void> {
  assertUnlocked();
  const { sharedSecret } = await respondX3DH(
    _identityKeyPair!,
    { keyPair: signedPreKeyPair, signature: signedPreKeySignature },
    oneTimePreKeyPair,
    initialMessage,
  );

  const ratchet = await DoubleRatchet.initReceiver(sharedSecret, signedPreKeyPair);
  _ratchetCache.set(conversationId, ratchet);
  const serialized = await ratchet.serialize();
  await storeRatchetSession(conversationId, serialized, _kekRaw!);
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
  return plaintext;
}

// ─── Group/Channel Encryption (Megolm) ────────

/**
 * Create a new Megolm outbound session for a group/channel.
 * Returns session export to distribute to participants.
 */
export async function createGroupSession(
  targetId: string,
  maxMessages?: number,
): Promise<{ sessionId: string; sessionExport: ReturnType<MegolmOutbound["exportSession"]> }> {
  assertUnlocked();
  const session = await MegolmOutbound.create(targetId, maxMessages);
  _megolmOutCache.set(targetId, session);
  await storeMegolmOutbound(targetId, session.serialize(), _kekRaw!);
  return {
    sessionId: session.sessionId,
    sessionExport: session.exportSession(),
  };
}

/**
 * Import a Megolm inbound session from an encrypted share.
 */
export async function importGroupSession(
  sessionExport: { sessionId: string; targetId: string; ratchetKey: string; messageIndex: number },
): Promise<void> {
  assertUnlocked();
  const session = MegolmInbound.fromExport(sessionExport);
  _megolmInCache.set(sessionExport.sessionId, session);
  await storeMegolmInbound(sessionExport.sessionId, session.serialize(), _kekRaw!);
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
 * Returns session data to POST to /api/e2ee/entity-sessions.
 */
export async function initEntitySession(
  entityType: "CLIENT" | "PROPERTY" | "MANDATE" | "TASK",
  entityId: string,
) {
  assertUnlocked();
  return _initEntitySession(entityType, entityId, _kekRaw!);
}

/**
 * Import an entity Megolm inbound session from a decrypted session share.
 */
export async function importEntitySession(
  sessionExport: { sessionId: string; targetId: string; ratchetKey: string; messageIndex: number },
) {
  assertUnlocked();
  return _importEntitySession(sessionExport, _kekRaw!);
}

/**
 * Encrypt a comment for an entity using its Megolm session.
 * Session must be initialized first via initEntitySession().
 */
export async function encryptEntityComment(
  entityType: "CLIENT" | "PROPERTY" | "MANDATE" | "TASK",
  entityId: string,
  plaintext: string,
) {
  assertUnlocked();
  return _encryptEntityComment(entityType, entityId, plaintext, _kekRaw!);
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
  return _decryptEntityComment(sessionId, messageIndex, encryptedContent, _kekRaw!);
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
 * Generate and return new one-time pre-keys for upload.
 */
export async function generatePreKeys(
  count: number,
): Promise<Array<{ id: string; publicKey: string }>> {
  assertUnlocked();
  const keys = await generateOneTimePreKeys(count);
  return keys.map((k) => ({ id: k.id, publicKey: k.publicKey }));
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
