"use client";

import { openDB, type IDBPDatabase } from "idb";
import { aesGcmEncrypt, aesGcmDecrypt, generateRandomBytes, bufferToBase64, base64ToBuffer } from "./primitives";

const DB_NAME = "oikion-e2ee";
const DB_VERSION = 1;

// Store names
const IDENTITY_STORE = "identity";
const RATCHET_STORE = "ratchet-sessions";
const MEGOLM_OUTBOUND_STORE = "megolm-outbound";
const MEGOLM_INBOUND_STORE = "megolm-inbound";

interface EncryptedEntry {
  id: string;
  ciphertext: string; // Base64
  iv: string;         // Base64
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(IDENTITY_STORE)) {
          db.createObjectStore(IDENTITY_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(RATCHET_STORE)) {
          db.createObjectStore(RATCHET_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(MEGOLM_OUTBOUND_STORE)) {
          db.createObjectStore(MEGOLM_OUTBOUND_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(MEGOLM_INBOUND_STORE)) {
          db.createObjectStore(MEGOLM_INBOUND_STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Encrypt a value with the KEK before storing in IndexedDB.
 * KEK is the raw AES-256 key bytes derived from PIN + pepper.
 */
async function encryptForStorage(key: string, value: string, kek: ArrayBuffer): Promise<EncryptedEntry> {
  const plaintext = new TextEncoder().encode(value);
  const { ciphertext, iv } = await aesGcmEncrypt(plaintext, kek);
  return {
    id: key,
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypt a value retrieved from IndexedDB using the KEK.
 */
async function decryptFromStorage(entry: EncryptedEntry, kek: ArrayBuffer): Promise<string> {
  const ciphertext = base64ToBuffer(entry.ciphertext);
  const iv = base64ToBuffer(entry.iv);
  const plaintext = await aesGcmDecrypt(ciphertext, kek, iv);
  return new TextDecoder().decode(plaintext);
}

// ─── Public API ─────────────────────────────

/**
 * Store the user's identity key (serialized private key) after PIN unlock.
 * Encrypted with KEK so IndexedDB contents are useless without the PIN.
 */
export async function storeIdentityKey(userId: string, serializedKey: string, kek: ArrayBuffer): Promise<void> {
  const db = await getDB();
  const entry = await encryptForStorage(`identity:${userId}`, serializedKey, kek);
  await db.put(IDENTITY_STORE, entry);
}

/**
 * Retrieve the cached identity key.
 */
export async function getIdentityKey(userId: string, kek: ArrayBuffer): Promise<string | null> {
  const db = await getDB();
  const entry = await db.get(IDENTITY_STORE, `identity:${userId}`) as EncryptedEntry | undefined;
  if (!entry) return null;
  return decryptFromStorage(entry, kek);
}

/**
 * Store a serialized Double Ratchet session for a 1:1 conversation.
 */
export async function storeRatchetSession(conversationId: string, serialized: string, kek: ArrayBuffer): Promise<void> {
  const db = await getDB();
  const entry = await encryptForStorage(`ratchet:${conversationId}`, serialized, kek);
  await db.put(RATCHET_STORE, entry);
}

/**
 * Retrieve a Double Ratchet session for a 1:1 conversation.
 */
export async function getRatchetSession(conversationId: string, kek: ArrayBuffer): Promise<string | null> {
  const db = await getDB();
  const entry = await db.get(RATCHET_STORE, `ratchet:${conversationId}`) as EncryptedEntry | undefined;
  if (!entry) return null;
  return decryptFromStorage(entry, kek);
}

/**
 * Delete a Double Ratchet session (e.g., on conversation delete).
 */
export async function deleteRatchetSession(conversationId: string): Promise<void> {
  const db = await getDB();
  await db.delete(RATCHET_STORE, `ratchet:${conversationId}`);
}

/**
 * Store a serialized Megolm outbound session (keyed by targetId = conversationId or channelId).
 */
export async function storeMegolmOutbound(targetId: string, serialized: string, kek: ArrayBuffer): Promise<void> {
  const db = await getDB();
  const entry = await encryptForStorage(`megolm-out:${targetId}`, serialized, kek);
  await db.put(MEGOLM_OUTBOUND_STORE, entry);
}

/**
 * Retrieve a Megolm outbound session.
 */
export async function getMegolmOutbound(targetId: string, kek: ArrayBuffer): Promise<string | null> {
  const db = await getDB();
  const entry = await db.get(MEGOLM_OUTBOUND_STORE, `megolm-out:${targetId}`) as EncryptedEntry | undefined;
  if (!entry) return null;
  return decryptFromStorage(entry, kek);
}

/**
 * Delete a Megolm outbound session (on rotation).
 */
export async function deleteMegolmOutbound(targetId: string): Promise<void> {
  const db = await getDB();
  await db.delete(MEGOLM_OUTBOUND_STORE, `megolm-out:${targetId}`);
}

/**
 * Store a serialized Megolm inbound session (keyed by sessionId).
 */
export async function storeMegolmInbound(sessionId: string, serialized: string, kek: ArrayBuffer): Promise<void> {
  const db = await getDB();
  const entry = await encryptForStorage(`megolm-in:${sessionId}`, serialized, kek);
  await db.put(MEGOLM_INBOUND_STORE, entry);
}

/**
 * Retrieve a Megolm inbound session.
 */
export async function getMegolmInbound(sessionId: string, kek: ArrayBuffer): Promise<string | null> {
  const db = await getDB();
  const entry = await db.get(MEGOLM_INBOUND_STORE, `megolm-in:${sessionId}`) as EncryptedEntry | undefined;
  if (!entry) return null;
  return decryptFromStorage(entry, kek);
}

/**
 * Delete a Megolm inbound session.
 */
export async function deleteMegolmInbound(sessionId: string): Promise<void> {
  const db = await getDB();
  await db.delete(MEGOLM_INBOUND_STORE, `megolm-in:${sessionId}`);
}

/**
 * Clear ALL E2EE session data from IndexedDB.
 * Used on logout or when user resets E2EE.
 */
export async function clearAllSessions(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    [IDENTITY_STORE, RATCHET_STORE, MEGOLM_OUTBOUND_STORE, MEGOLM_INBOUND_STORE],
    "readwrite"
  );
  await Promise.all([
    tx.objectStore(IDENTITY_STORE).clear(),
    tx.objectStore(RATCHET_STORE).clear(),
    tx.objectStore(MEGOLM_OUTBOUND_STORE).clear(),
    tx.objectStore(MEGOLM_INBOUND_STORE).clear(),
    tx.done,
  ]);
}

/**
 * Close the database connection (for testing cleanup).
 */
export async function closeDB(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}
