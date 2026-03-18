// lib/e2ee/entity-comments.ts
"use client";

import { MegolmOutbound, MegolmInbound } from "./megolm";
import {
  storeEntityMegolmOutbound,
  getEntityMegolmOutbound,
  deleteEntityMegolmOutbound,
  storeMegolmInbound,
  getMegolmInbound,
} from "./session-store";

// ─── Types ───────────────────────────────────

type EntityType = "CLIENT" | "PROPERTY" | "MANDATE" | "TASK";

export type EncryptEntityCommentResult =
  | { ok: true; content: string; entitySessionId: string; messageIndex: number }
  | { ok: false; needsRotation: true }
  | { ok: false; needsInit: true };

interface EncryptedCommentPayload {
  /** Combined "iv:ciphertext" string (both Base64). Server stores this as-is in the content field. */
  content: string;
  entitySessionId: string; // Megolm session ID (for server storage)
  messageIndex: number;    // Megolm ratchet index
}

interface EntitySessionResponse {
  session: {
    id: string;
    megolmSessionId: string;
    version: number;
    entityType: string;
    entityId: string;
  } | null;
  share: {
    id: string;
    encryptedSession: string;
    startingIndex: number;
  } | null;
}

// ─── In-Memory Caches ────────────────────────
// Keyed by "entity:<entityType>:<entityId>"

const _entityOutCache = new Map<string, MegolmOutbound>();
const _entityInCache = new Map<string, MegolmInbound>();

function entityKey(entityType: EntityType, entityId: string): string {
  return `entity:${entityType}:${entityId}`;
}

// ─── State ───────────────────────────────────
// KEK and identity key are managed by lib/e2ee/index.ts.
// This module receives them as parameters to avoid circular imports.

// ─── Public API ──────────────────────────────

/**
 * Encrypt a comment for an entity.
 * Loads or creates the entity's Megolm outbound session.
 *
 * @param entityType - "CLIENT" | "PROPERTY" | "MANDATE" | "TASK"
 * @param entityId - The entity's database ID
 * @param plaintext - Comment text to encrypt
 * @param kek - PIN-derived KEK (raw ArrayBuffer)
 * @returns Encrypted payload to POST to server
 */
export async function encryptEntityComment(
  entityType: EntityType,
  entityId: string,
  plaintext: string,
  kek: ArrayBuffer,
): Promise<EncryptEntityCommentResult> {
  const key = entityKey(entityType, entityId);
  let session = _entityOutCache.get(key);

  if (!session) {
    // Try IndexedDB
    const serialized = await getEntityMegolmOutbound(entityType, entityId, kek);
    if (serialized) {
      session = MegolmOutbound.deserialize(serialized);
      _entityOutCache.set(key, session);
    }
  }

  // Check rotation
  if (session?.needsRotation()) {
    await deleteEntityMegolmOutbound(entityType, entityId);
    _entityOutCache.delete(key);
    return { ok: false, needsRotation: true };
  }

  if (!session) {
    // No session — caller must create one via the entity-sessions API first.
    return { ok: false, needsInit: true };
  }

  const payload = await session.encrypt(plaintext);

  // Persist updated session state (ratchet advanced)
  await storeEntityMegolmOutbound(entityType, entityId, session.serialize(), kek);

  // Combine iv:ciphertext into a single string for storage in the DB content field.
  // The server stores this opaque string as-is; only the client can split and decrypt.
  return {
    ok: true,
    content: `${payload.iv}:${payload.ciphertext}`,
    entitySessionId: payload.sessionId,
    messageIndex: payload.messageIndex,
  };
}

/**
 * Decrypt a comment from an entity.
 * Loads the Megolm inbound session for the given sessionId.
 * The encryptedContent is the combined "iv:ciphertext" string stored in the DB.
 *
 * @param sessionId - The Megolm session ID (from comment.entitySessionId)
 * @param messageIndex - The ratchet index (from comment.messageIndex)
 * @param encryptedContent - Combined "iv:ciphertext" string (from comment.content)
 * @param kek - PIN-derived KEK (raw ArrayBuffer)
 * @returns Decrypted plaintext
 */
export async function decryptEntityComment(
  sessionId: string,
  messageIndex: number,
  encryptedContent: string,
  kek: ArrayBuffer,
): Promise<string> {
  // Split the combined iv:ciphertext format
  const colonIndex = encryptedContent.indexOf(":");
  if (colonIndex === -1) {
    throw new Error("Invalid encrypted content format — expected iv:ciphertext");
  }
  const iv = encryptedContent.slice(0, colonIndex);
  const ciphertext = encryptedContent.slice(colonIndex + 1);

  let session = _entityInCache.get(sessionId);

  if (!session) {
    // Try IndexedDB
    const serialized = await getMegolmInbound(sessionId, kek);
    if (!serialized) {
      throw new Error(
        `No Megolm inbound session for sessionId ${sessionId}. ` +
        `Fetch and import the session share first.`
      );
    }
    session = MegolmInbound.deserialize(serialized);
    _entityInCache.set(sessionId, session);
  }

  const indexBefore = session.currentIndex;
  const plaintext = await session.decrypt(messageIndex, ciphertext, iv);

  // Only persist if the ratchet actually advanced (avoids redundant IndexedDB writes on re-render)
  if (session.currentIndex > indexBefore) {
    await storeMegolmInbound(sessionId, session.serialize(), kek);
  }

  return plaintext;
}

/**
 * Initialize an entity's Megolm outbound session.
 * Creates a new MegolmOutbound, stores in IndexedDB, and returns
 * the session export to send to the server (for EntitySession + shares + backup).
 *
 * @returns sessionId, sessionExport (to send to entity-sessions API)
 */
export async function initEntitySession(
  entityType: EntityType,
  entityId: string,
  kek: ArrayBuffer,
): Promise<{
  sessionId: string;
  sessionExport: { sessionId: string; targetId: string; ratchetKey: string; messageIndex: number };
}> {
  const key = entityKey(entityType, entityId);
  const session = await MegolmOutbound.create(key);

  _entityOutCache.set(key, session);
  await storeEntityMegolmOutbound(entityType, entityId, session.serialize(), kek);

  return {
    sessionId: session.sessionId,
    sessionExport: session.exportSession(),
  };
}

/**
 * Import an entity's Megolm inbound session from a decrypted share.
 * Called after fetching the user's EntitySessionShare from the server
 * and decrypting it with the user's identity private key.
 */
export async function importEntitySession(
  sessionExport: { sessionId: string; targetId: string; ratchetKey: string; messageIndex: number },
  kek: ArrayBuffer,
): Promise<void> {
  const session = MegolmInbound.fromExport(sessionExport);
  _entityInCache.set(sessionExport.sessionId, session);
  await storeMegolmInbound(sessionExport.sessionId, session.serialize(), kek);
}

/**
 * Clear all entity session caches (called on lock/logout).
 */
export function clearEntitySessionCaches(): void {
  _entityOutCache.clear();
  _entityInCache.clear();
}
