gi# Messaging E2EE Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add end-to-end encryption to all messaging (DMs, groups, channels) using Signal Protocol (1:1) and Megolm (groups), with PIN + server pepper key derivation.

**Architecture:** Pure TypeScript E2EE using Web Crypto API. Server is a dumb relay storing ciphertext. Client-side `lib/e2ee/` handles all crypto. PIN (4-8 digits) + server-side pepper derive a KEK that wraps the user's ECDH P-256 identity key. Double Ratchet for 1:1 forward secrecy, Megolm group ratchet for channels/groups.

**Tech Stack:** TypeScript, Web Crypto API (SubtleCrypto), IndexedDB (via `idb`), Prisma, Next.js API routes, Vitest

**Design doc:** `docs/plans/2026-03-08-messaging-e2ee-design.md`

---

## Phase 1: Crypto Primitives & Types

### Task 1: E2EE Type Definitions

**Files:**
- Create: `lib/e2ee/types.ts`
- Test: `tests/e2ee/types.test.ts`

**Step 1: Create type definitions file**

```typescript
// lib/e2ee/types.ts
"use client";

// ─── Key Types ─────────────────────────────

export interface IdentityKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface ExportedIdentityKey {
  publicKey: string;       // Base64 ECDH P-256 SPKI
  wrappedPrivateKey: string; // Base64 AES-256-GCM(PKCS8, KEK)
  salt: string;            // Hex PBKDF2 salt
  pbkdfIterations: number;
}

export interface PreKeyBundle {
  identityKey: string;     // Base64 public key
  signedPreKey: string;    // Base64 public key
  signature: string;       // Base64 Ed25519 signature
  oneTimePreKey?: string;  // Base64 public key (may be exhausted)
  oneTimePreKeyId?: string;
}

// ─── Double Ratchet (1:1 DMs) ──────────────

export interface DoubleRatchetState {
  conversationId: string;
  rootKey: ArrayBuffer;
  sendChainKey: ArrayBuffer;
  recvChainKey: ArrayBuffer | null;
  sendDHKeyPair: CryptoKeyPair;
  recvDHPublicKey: CryptoKey | null;
  sendMessageNumber: number;
  recvMessageNumber: number;
  previousSendChainLength: number;
  skippedKeys: Record<string, ArrayBuffer>; // "dhPub:msgNum" → msgKey
}

export interface RatchetHeader {
  dhPublicKey: string;     // Base64 sender's current DH public key
  previousChainLength: number;
  messageNumber: number;
}

export interface EncryptedDMPayload {
  header: RatchetHeader;
  ciphertext: string;      // Base64 AES-256-GCM ciphertext
  iv: string;              // Base64 IV
}

// ─── Megolm (Groups & Channels) ────────────

export interface MegolmOutboundSession {
  sessionId: string;
  targetId: string;        // conversationId or channelId
  ratchetKey: ArrayBuffer;
  messageIndex: number;
}

export interface MegolmInboundSession {
  sessionId: string;
  targetId: string;
  ratchetKey: ArrayBuffer;  // Key at startingIndex
  startingIndex: number;
  currentIndex: number;
}

export interface EncryptedGroupPayload {
  sessionId: string;
  messageIndex: number;
  ciphertext: string;      // Base64
  iv: string;              // Base64
}

// ─── Attachment ────────────────────────────

export interface EncryptedAttachment {
  encryptedBlob: Blob;
  fileKey: string;         // Base64 AES-256 key
  iv: string;              // Base64 IV
}

export interface AttachmentMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileKey: string;
  iv: string;
  url: string;
}

// ─── Session Store ─────────────────────────

export interface E2EESessionState {
  isSetUp: boolean;
  isUnlocked: boolean;
  userId: string | null;
}

// ─── API Request/Response ──────────────────

export interface SetupE2EERequest {
  publicKey: string;
  wrappedPrivateKey: string;
  salt: string;
  pbkdfIterations: number;
  signedPreKey: {
    publicKey: string;
    signature: string;
  };
  oneTimePreKeys: string[];
}

export interface GroupSessionCreateRequest {
  conversationId?: string;
  channelId?: string;
  shares: Array<{
    userId: string;
    encryptedSession: string;
    startingIndex: number;
  }>;
}
```

**Step 2: Write basic type validation test**

```typescript
// tests/e2ee/types.test.ts
import { describe, it, expect } from "vitest";

describe("E2EE Types", () => {
  it("EncryptedDMPayload structure is valid", () => {
    const payload = {
      header: { dhPublicKey: "base64", previousChainLength: 0, messageNumber: 0 },
      ciphertext: "base64ct",
      iv: "base64iv",
    };
    expect(payload.header.messageNumber).toBe(0);
    expect(payload.ciphertext).toBeTruthy();
  });

  it("EncryptedGroupPayload structure is valid", () => {
    const payload = {
      sessionId: "uuid",
      messageIndex: 42,
      ciphertext: "base64ct",
      iv: "base64iv",
    };
    expect(payload.messageIndex).toBe(42);
  });
});
```

**Step 3: Run test**

Run: `pnpm vitest run tests/e2ee/types.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add lib/e2ee/types.ts tests/e2ee/types.test.ts
git commit -m "feat(e2ee): add type definitions for E2EE messaging"
```

---

### Task 2: SubtleCrypto Primitives

**Files:**
- Create: `lib/e2ee/primitives.ts`
- Test: `tests/e2ee/primitives.test.ts`

**Step 1: Write failing tests for all crypto primitives**

```typescript
// tests/e2ee/primitives.test.ts
import { describe, it, expect } from "vitest";
import {
  generateECDHKeyPair,
  deriveSharedSecret,
  aesGcmEncrypt,
  aesGcmDecrypt,
  hkdfDerive,
  hmacSign,
  sha256,
  exportPublicKey,
  importPublicKey,
  exportPrivateKey,
  importPrivateKey,
  wrapPrivateKey,
  unwrapPrivateKey,
  deriveKEKFromPIN,
  generateRandomBytes,
} from "@/lib/e2ee/primitives";

// Polyfill crypto for Node test environment
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

describe("generateECDHKeyPair", () => {
  it("generates a P-256 key pair", async () => {
    const kp = await generateECDHKeyPair();
    expect(kp.publicKey).toBeDefined();
    expect(kp.privateKey).toBeDefined();
  });
});

describe("deriveSharedSecret", () => {
  it("derives identical secrets from both sides", async () => {
    const alice = await generateECDHKeyPair();
    const bob = await generateECDHKeyPair();
    const s1 = await deriveSharedSecret(alice.privateKey, bob.publicKey);
    const s2 = await deriveSharedSecret(bob.privateKey, alice.publicKey);
    expect(new Uint8Array(s1)).toEqual(new Uint8Array(s2));
  });
});

describe("AES-GCM", () => {
  it("encrypts and decrypts round-trip", async () => {
    const key = await generateRandomBytes(32);
    const plaintext = new TextEncoder().encode("hello e2ee");
    const { ciphertext, iv } = await aesGcmEncrypt(plaintext, key);
    const decrypted = await aesGcmDecrypt(ciphertext, key, iv);
    expect(new TextDecoder().decode(decrypted)).toBe("hello e2ee");
  });

  it("fails with wrong key", async () => {
    const key1 = await generateRandomBytes(32);
    const key2 = await generateRandomBytes(32);
    const plaintext = new TextEncoder().encode("secret");
    const { ciphertext, iv } = await aesGcmEncrypt(plaintext, key1);
    await expect(aesGcmDecrypt(ciphertext, key2, iv)).rejects.toThrow();
  });
});

describe("HKDF", () => {
  it("derives deterministic output from same input", async () => {
    const ikm = await generateRandomBytes(32);
    const salt = await generateRandomBytes(32);
    const info = new TextEncoder().encode("test");
    const k1 = await hkdfDerive(ikm, salt, info, 32);
    const k2 = await hkdfDerive(ikm, salt, info, 32);
    expect(new Uint8Array(k1)).toEqual(new Uint8Array(k2));
  });
});

describe("HMAC", () => {
  it("produces consistent signatures", async () => {
    const key = await generateRandomBytes(32);
    const data = new TextEncoder().encode("message");
    const sig1 = await hmacSign(key, data);
    const sig2 = await hmacSign(key, data);
    expect(new Uint8Array(sig1)).toEqual(new Uint8Array(sig2));
  });
});

describe("SHA-256", () => {
  it("hashes deterministically", async () => {
    const data = new TextEncoder().encode("hello");
    const h1 = await sha256(data);
    const h2 = await sha256(data);
    expect(new Uint8Array(h1)).toEqual(new Uint8Array(h2));
  });
});

describe("Key export/import", () => {
  it("round-trips public key export/import", async () => {
    const kp = await generateECDHKeyPair();
    const exported = await exportPublicKey(kp.publicKey);
    const imported = await importPublicKey(exported);
    // Derive shared secret with original and imported to prove equivalence
    const other = await generateECDHKeyPair();
    const s1 = await deriveSharedSecret(other.privateKey, kp.publicKey);
    const s2 = await deriveSharedSecret(other.privateKey, imported);
    expect(new Uint8Array(s1)).toEqual(new Uint8Array(s2));
  });

  it("round-trips private key export/import", async () => {
    const kp = await generateECDHKeyPair();
    const exported = await exportPrivateKey(kp.privateKey);
    const imported = await importPrivateKey(exported);
    const other = await generateECDHKeyPair();
    const s1 = await deriveSharedSecret(kp.privateKey, other.publicKey);
    const s2 = await deriveSharedSecret(imported, other.publicKey);
    expect(new Uint8Array(s1)).toEqual(new Uint8Array(s2));
  });
});

describe("Key wrapping with PIN + pepper", () => {
  it("wraps and unwraps a private key", async () => {
    const kp = await generateECDHKeyPair();
    const pin = "12345678";
    const pepper = await generateRandomBytes(32);
    const { wrappedKey, salt } = await wrapPrivateKey(kp.privateKey, pin, pepper);
    const unwrapped = await unwrapPrivateKey(wrappedKey, pin, pepper, salt);
    // Verify by deriving same shared secret
    const other = await generateECDHKeyPair();
    const s1 = await deriveSharedSecret(kp.privateKey, other.publicKey);
    const s2 = await deriveSharedSecret(unwrapped, other.publicKey);
    expect(new Uint8Array(s1)).toEqual(new Uint8Array(s2));
  });

  it("fails with wrong PIN", async () => {
    const kp = await generateECDHKeyPair();
    const pepper = await generateRandomBytes(32);
    const { wrappedKey, salt } = await wrapPrivateKey(kp.privateKey, "12345678", pepper);
    await expect(unwrapPrivateKey(wrappedKey, "00000000", pepper, salt)).rejects.toThrow();
  });
});

describe("deriveKEKFromPIN", () => {
  it("derives deterministic KEK from same inputs", async () => {
    const pin = "123456";
    const salt = await generateRandomBytes(16);
    const pepper = await generateRandomBytes(32);
    const k1 = await deriveKEKFromPIN(pin, salt, pepper);
    const k2 = await deriveKEKFromPIN(pin, salt, pepper);
    // Export both to compare raw bytes
    const raw1 = await crypto.subtle.exportKey("raw", k1);
    const raw2 = await crypto.subtle.exportKey("raw", k2);
    expect(new Uint8Array(raw1)).toEqual(new Uint8Array(raw2));
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/e2ee/primitives.test.ts`
Expected: FAIL — module `@/lib/e2ee/primitives` not found

**Step 3: Implement primitives**

```typescript
// lib/e2ee/primitives.ts
"use client";

const ECDH_PARAMS = { name: "ECDH", namedCurve: "P-256" } as const;
const AES_GCM = "AES-GCM" as const;
const IV_BYTES = 12;
const PBKDF2_ITERATIONS = 100_000;

// ─── Random ────────────────────────────────

export function generateRandomBytes(length: number): ArrayBuffer {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf.buffer;
}

// ─── ECDH Key Pairs ────────────────────────

export async function generateECDHKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveBits"]);
}

export async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  return crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256
  );
}

// ─── AES-256-GCM ──────────────────────────

export async function aesGcmEncrypt(
  plaintext: ArrayBuffer,
  rawKey: ArrayBuffer
): Promise<{ ciphertext: ArrayBuffer; iv: ArrayBuffer }> {
  const iv = generateRandomBytes(IV_BYTES);
  const key = await crypto.subtle.importKey("raw", rawKey, AES_GCM, false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt({ name: AES_GCM, iv }, key, plaintext);
  return { ciphertext, iv };
}

export async function aesGcmDecrypt(
  ciphertext: ArrayBuffer,
  rawKey: ArrayBuffer,
  iv: ArrayBuffer
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", rawKey, AES_GCM, false, ["decrypt"]);
  return crypto.subtle.decrypt({ name: AES_GCM, iv }, key, ciphertext);
}

// ─── HKDF ──────────────────────────────────

export async function hkdfDerive(
  ikm: ArrayBuffer,
  salt: ArrayBuffer,
  info: ArrayBuffer,
  length: number
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8
  );
}

// ─── HMAC-SHA256 ───────────────────────────

export async function hmacSign(
  rawKey: ArrayBuffer,
  data: ArrayBuffer
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw", rawKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, data);
}

// ─── SHA-256 ───────────────────────────────

export async function sha256(data: ArrayBuffer): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", data);
}

// ─── Key Export / Import ───────────────────

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("spki", key);
  return bufferToBase64(raw);
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(base64);
  return crypto.subtle.importKey("spki", raw, ECDH_PARAMS, true, []);
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("pkcs8", key);
  return bufferToBase64(raw);
}

export async function importPrivateKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(base64);
  return crypto.subtle.importKey("pkcs8", raw, ECDH_PARAMS, true, ["deriveBits"]);
}

// ─── PIN + Pepper Key Derivation ───────────

export async function deriveKEKFromPIN(
  pin: string,
  salt: ArrayBuffer,
  pepper: ArrayBuffer
): Promise<CryptoKey> {
  const pinBytes = new TextEncoder().encode(pin);
  const combinedSalt = concatBuffers(salt, pepper);
  const baseKey = await crypto.subtle.importKey("raw", pinBytes, "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: combinedSalt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: AES_GCM, length: 256 },
    true,
    ["wrapKey", "unwrapKey"]
  );
}

export async function wrapPrivateKey(
  privateKey: CryptoKey,
  pin: string,
  pepper: ArrayBuffer
): Promise<{ wrappedKey: string; salt: string }> {
  const salt = generateRandomBytes(16);
  const kek = await deriveKEKFromPIN(pin, salt, pepper);
  const iv = generateRandomBytes(IV_BYTES);
  const wrapped = await crypto.subtle.wrapKey("pkcs8", privateKey, kek, { name: AES_GCM, iv });
  // Prepend IV to wrapped key for storage
  const combined = concatBuffers(iv, wrapped);
  return { wrappedKey: bufferToBase64(combined), salt: bufferToBase64(salt) };
}

export async function unwrapPrivateKey(
  wrappedKeyBase64: string,
  pin: string,
  pepper: ArrayBuffer,
  saltBase64: string
): Promise<CryptoKey> {
  const combined = base64ToBuffer(wrappedKeyBase64);
  const iv = combined.slice(0, IV_BYTES);
  const wrappedKey = combined.slice(IV_BYTES);
  const salt = base64ToBuffer(saltBase64);
  const kek = await deriveKEKFromPIN(pin, salt, pepper);
  return crypto.subtle.unwrapKey(
    "pkcs8", wrappedKey, kek,
    { name: AES_GCM, iv },
    ECDH_PARAMS,
    true,
    ["deriveBits"]
  );
}

// ─── Buffer Utilities ──────────────────────

export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function concatBuffers(...buffers: ArrayBuffer[]): ArrayBuffer {
  const total = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return result.buffer;
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/e2ee/primitives.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add lib/e2ee/primitives.ts tests/e2ee/primitives.test.ts
git commit -m "feat(e2ee): implement SubtleCrypto primitives with full test coverage"
```

---

### Task 3: X3DH Key Agreement

**Files:**
- Create: `lib/e2ee/x3dh.ts`
- Test: `tests/e2ee/x3dh.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/e2ee/x3dh.test.ts
import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

import { generateECDHKeyPair, exportPublicKey, importPublicKey } from "@/lib/e2ee/primitives";
import {
  generateSignedPreKey,
  generateOneTimePreKeys,
  initiateX3DH,
  respondX3DH,
} from "@/lib/e2ee/x3dh";

describe("Signed Pre-Key", () => {
  it("generates and verifies signature", async () => {
    const identity = await generateECDHKeyPair();
    const spk = await generateSignedPreKey(identity.privateKey);
    expect(spk.publicKey).toBeTruthy();
    expect(spk.signature).toBeTruthy();
  });
});

describe("One-Time Pre-Keys", () => {
  it("generates batch of 20 keys", async () => {
    const keys = await generateOneTimePreKeys(20);
    expect(keys).toHaveLength(20);
    keys.forEach(k => expect(k.publicKey).toBeTruthy());
  });
});

describe("X3DH handshake", () => {
  it("derives matching shared secrets for both parties", async () => {
    // Bob's keys (recipient)
    const bobIdentity = await generateECDHKeyPair();
    const bobSPK = await generateSignedPreKey(bobIdentity.privateKey);
    const bobOTPs = await generateOneTimePreKeys(5);

    const bobBundle = {
      identityKey: await exportPublicKey(bobIdentity.publicKey),
      signedPreKey: bobSPK.publicKey,
      signature: bobSPK.signature,
      oneTimePreKey: bobOTPs[0].publicKey,
      oneTimePreKeyId: bobOTPs[0].id,
    };

    // Alice initiates
    const aliceIdentity = await generateECDHKeyPair();
    const aliceResult = await initiateX3DH(aliceIdentity, bobBundle);

    expect(aliceResult.sharedSecret).toBeDefined();
    expect(aliceResult.initialMessage).toBeDefined();
    expect(aliceResult.initialMessage.identityKey).toBeTruthy();
    expect(aliceResult.initialMessage.ephemeralKey).toBeTruthy();

    // Bob responds
    const bobResult = await respondX3DH(
      bobIdentity,
      { keyPair: bobSPK.keyPair, signature: bobSPK.signature },
      bobOTPs[0].keyPair,
      aliceResult.initialMessage
    );

    // Shared secrets must match
    expect(new Uint8Array(aliceResult.sharedSecret))
      .toEqual(new Uint8Array(bobResult.sharedSecret));
  });

  it("works without one-time pre-key", async () => {
    const bobIdentity = await generateECDHKeyPair();
    const bobSPK = await generateSignedPreKey(bobIdentity.privateKey);

    const bobBundle = {
      identityKey: await exportPublicKey(bobIdentity.publicKey),
      signedPreKey: bobSPK.publicKey,
      signature: bobSPK.signature,
    };

    const aliceIdentity = await generateECDHKeyPair();
    const aliceResult = await initiateX3DH(aliceIdentity, bobBundle);
    const bobResult = await respondX3DH(
      bobIdentity,
      { keyPair: bobSPK.keyPair, signature: bobSPK.signature },
      undefined,
      aliceResult.initialMessage
    );

    expect(new Uint8Array(aliceResult.sharedSecret))
      .toEqual(new Uint8Array(bobResult.sharedSecret));
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/e2ee/x3dh.test.ts`
Expected: FAIL — module not found

**Step 3: Implement X3DH**

```typescript
// lib/e2ee/x3dh.ts
"use client";

import {
  generateECDHKeyPair,
  deriveSharedSecret,
  hkdfDerive,
  exportPublicKey,
  importPublicKey,
  concatBuffers,
  bufferToBase64,
  base64ToBuffer,
  hmacSign,
} from "./primitives";
import type { PreKeyBundle } from "./types";

const X3DH_INFO = new TextEncoder().encode("OikionX3DH");

export interface SignedPreKeyResult {
  publicKey: string;     // Base64
  signature: string;     // Base64
  keyPair: CryptoKeyPair;
}

export interface OneTimePreKeyResult {
  id: string;
  publicKey: string;     // Base64
  keyPair: CryptoKeyPair;
}

export interface X3DHInitialMessage {
  identityKey: string;   // Base64 — Alice's identity public key
  ephemeralKey: string;   // Base64 — Alice's ephemeral public key
  oneTimePreKeyId?: string;
}

export interface X3DHResult {
  sharedSecret: ArrayBuffer;
  initialMessage: X3DHInitialMessage;
}

// ─── Pre-Key Generation ────────────────────

export async function generateSignedPreKey(
  identityPrivateKey: CryptoKey
): Promise<SignedPreKeyResult> {
  const keyPair = await generateECDHKeyPair();
  const pubKeyBase64 = await exportPublicKey(keyPair.publicKey);
  // Sign the public key bytes with identity key using HMAC
  // (ECDH keys can't sign directly; we use HMAC with derived key as a MAC)
  const pubKeyBytes = base64ToBuffer(pubKeyBase64);
  const idRaw = await crypto.subtle.exportKey("pkcs8", identityPrivateKey);
  const signature = await hmacSign(idRaw, pubKeyBytes);
  return {
    publicKey: pubKeyBase64,
    signature: bufferToBase64(signature),
    keyPair,
  };
}

export async function generateOneTimePreKeys(
  count: number
): Promise<OneTimePreKeyResult[]> {
  const results: OneTimePreKeyResult[] = [];
  for (let i = 0; i < count; i++) {
    const keyPair = await generateECDHKeyPair();
    results.push({
      id: crypto.randomUUID(),
      publicKey: await exportPublicKey(keyPair.publicKey),
      keyPair,
    });
  }
  return results;
}

// ─── X3DH Initiator (Alice) ────────────────

export async function initiateX3DH(
  aliceIdentity: CryptoKeyPair,
  bobBundle: PreKeyBundle
): Promise<X3DHResult> {
  const bobIK = await importPublicKey(bobBundle.identityKey);
  const bobSPK = await importPublicKey(bobBundle.signedPreKey);
  const ephemeral = await generateECDHKeyPair();

  // DH1 = ECDH(IKa_priv, SPKb)
  const dh1 = await deriveSharedSecret(aliceIdentity.privateKey, bobSPK);
  // DH2 = ECDH(EKa_priv, IKb)
  const dh2 = await deriveSharedSecret(ephemeral.privateKey, bobIK);
  // DH3 = ECDH(EKa_priv, SPKb)
  const dh3 = await deriveSharedSecret(ephemeral.privateKey, bobSPK);

  let dhConcat = concatBuffers(dh1, dh2, dh3);

  // DH4 = ECDH(EKa_priv, OPKb) — optional
  let oneTimePreKeyId: string | undefined;
  if (bobBundle.oneTimePreKey) {
    const bobOPK = await importPublicKey(bobBundle.oneTimePreKey);
    const dh4 = await deriveSharedSecret(ephemeral.privateKey, bobOPK);
    dhConcat = concatBuffers(dhConcat, dh4);
    oneTimePreKeyId = bobBundle.oneTimePreKeyId;
  }

  // SK = HKDF(DH1 || DH2 || DH3 [|| DH4])
  const salt = new ArrayBuffer(32); // Zero salt per Signal spec
  const sharedSecret = await hkdfDerive(dhConcat, salt, X3DH_INFO, 32);

  return {
    sharedSecret,
    initialMessage: {
      identityKey: await exportPublicKey(aliceIdentity.publicKey),
      ephemeralKey: await exportPublicKey(ephemeral.publicKey),
      oneTimePreKeyId,
    },
  };
}

// ─── X3DH Responder (Bob) ──────────────────

export async function respondX3DH(
  bobIdentity: CryptoKeyPair,
  bobSignedPreKey: { keyPair: CryptoKeyPair; signature: string },
  bobOneTimePreKey: CryptoKeyPair | undefined,
  initialMessage: X3DHInitialMessage
): Promise<{ sharedSecret: ArrayBuffer }> {
  const aliceIK = await importPublicKey(initialMessage.identityKey);
  const aliceEK = await importPublicKey(initialMessage.ephemeralKey);

  // DH1 = ECDH(SPKb_priv, IKa)
  const dh1 = await deriveSharedSecret(bobSignedPreKey.keyPair.privateKey, aliceIK);
  // DH2 = ECDH(IKb_priv, EKa)
  const dh2 = await deriveSharedSecret(bobIdentity.privateKey, aliceEK);
  // DH3 = ECDH(SPKb_priv, EKa)
  const dh3 = await deriveSharedSecret(bobSignedPreKey.keyPair.privateKey, aliceEK);

  let dhConcat = concatBuffers(dh1, dh2, dh3);

  // DH4 — optional
  if (bobOneTimePreKey && initialMessage.oneTimePreKeyId) {
    const dh4 = await deriveSharedSecret(bobOneTimePreKey.privateKey, aliceEK);
    dhConcat = concatBuffers(dhConcat, dh4);
  }

  const salt = new ArrayBuffer(32);
  const sharedSecret = await hkdfDerive(dhConcat, salt, X3DH_INFO, 32);

  return { sharedSecret };
}
```

**Step 4: Run tests**

Run: `pnpm vitest run tests/e2ee/x3dh.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add lib/e2ee/x3dh.ts tests/e2ee/x3dh.test.ts
git commit -m "feat(e2ee): implement X3DH key agreement protocol"
```

---

### Task 4: Double Ratchet

**Files:**
- Create: `lib/e2ee/double-ratchet.ts`
- Test: `tests/e2ee/double-ratchet.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/e2ee/double-ratchet.test.ts
import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

import { DoubleRatchet } from "@/lib/e2ee/double-ratchet";
import { generateECDHKeyPair } from "@/lib/e2ee/primitives";
import { generateRandomBytes } from "@/lib/e2ee/primitives";

describe("DoubleRatchet", () => {
  async function createPair() {
    const sharedSecret = generateRandomBytes(32);
    const bobKeyPair = await generateECDHKeyPair();
    // Alice initializes as sender (has Bob's public key)
    const alice = await DoubleRatchet.initSender(sharedSecret, bobKeyPair.publicKey);
    // Bob initializes as receiver (has his own key pair)
    const bob = await DoubleRatchet.initReceiver(sharedSecret, bobKeyPair);
    return { alice, bob };
  }

  it("encrypts and decrypts a single message", async () => {
    const { alice, bob } = await createPair();
    const encrypted = await alice.encrypt("Hello Bob!");
    const decrypted = await bob.decrypt(encrypted);
    expect(decrypted).toBe("Hello Bob!");
  });

  it("handles multiple sequential messages", async () => {
    const { alice, bob } = await createPair();
    const e1 = await alice.encrypt("Message 1");
    const e2 = await alice.encrypt("Message 2");
    const e3 = await alice.encrypt("Message 3");
    expect(await bob.decrypt(e1)).toBe("Message 1");
    expect(await bob.decrypt(e2)).toBe("Message 2");
    expect(await bob.decrypt(e3)).toBe("Message 3");
  });

  it("handles bidirectional communication", async () => {
    const { alice, bob } = await createPair();
    const e1 = await alice.encrypt("Hi Bob");
    expect(await bob.decrypt(e1)).toBe("Hi Bob");

    const e2 = await bob.encrypt("Hi Alice");
    expect(await alice.decrypt(e2)).toBe("Hi Alice");

    const e3 = await alice.encrypt("How are you?");
    expect(await bob.decrypt(e3)).toBe("How are you?");
  });

  it("handles out-of-order messages", async () => {
    const { alice, bob } = await createPair();
    const e1 = await alice.encrypt("First");
    const e2 = await alice.encrypt("Second");
    const e3 = await alice.encrypt("Third");
    // Deliver out of order
    expect(await bob.decrypt(e3)).toBe("Third");
    expect(await bob.decrypt(e1)).toBe("First");
    expect(await bob.decrypt(e2)).toBe("Second");
  });

  it("produces unique ciphertext for same plaintext", async () => {
    const { alice } = await createPair();
    const e1 = await alice.encrypt("same");
    const e2 = await alice.encrypt("same");
    expect(e1.ciphertext).not.toBe(e2.ciphertext);
  });

  it("serializes and deserializes state", async () => {
    const { alice, bob } = await createPair();
    const e1 = await alice.encrypt("Before serialize");

    const serialized = await alice.serialize();
    const restored = await DoubleRatchet.deserialize(serialized);
    const e2 = await restored.encrypt("After serialize");

    expect(await bob.decrypt(e1)).toBe("Before serialize");
    expect(await bob.decrypt(e2)).toBe("After serialize");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/e2ee/double-ratchet.test.ts`
Expected: FAIL

**Step 3: Implement Double Ratchet**

This is the most complex crypto component. The implementation follows the Signal specification at signal.org/docs/specifications/doubleratchet/.

Create `lib/e2ee/double-ratchet.ts` implementing the `DoubleRatchet` class with methods: `initSender`, `initReceiver`, `encrypt`, `decrypt`, `serialize`, `deserialize`. Key internals:
- `kdfRatchetStep(rootKey, dhOutput)` → new rootKey + chainKey via HKDF
- `kdfChainStep(chainKey)` → new chainKey + messageKey via HMAC
- `dhRatchet()` — generate new DH key pair, advance root ratchet
- Skipped message key cache for out-of-order delivery (max 1000 keys)

The full implementation is ~250 lines. Implement per Signal spec using the primitives from Task 2.

**Step 4: Run tests**

Run: `pnpm vitest run tests/e2ee/double-ratchet.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add lib/e2ee/double-ratchet.ts tests/e2ee/double-ratchet.test.ts
git commit -m "feat(e2ee): implement Double Ratchet protocol for 1:1 DMs"
```

---

### Task 5: Megolm Group Ratchet

**Files:**
- Create: `lib/e2ee/megolm.ts`
- Test: `tests/e2ee/megolm.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/e2ee/megolm.test.ts
import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

import { MegolmOutbound, MegolmInbound } from "@/lib/e2ee/megolm";
import { generateECDHKeyPair, deriveSharedSecret, exportPublicKey } from "@/lib/e2ee/primitives";

describe("Megolm", () => {
  it("encrypts and decrypts a message", async () => {
    const outbound = await MegolmOutbound.create("conv-1");
    const sessionExport = outbound.exportSession();
    const inbound = MegolmInbound.fromExport(sessionExport);

    const encrypted = await outbound.encrypt("Hello group!");
    const decrypted = await inbound.decrypt(encrypted.messageIndex, encrypted.ciphertext, encrypted.iv);
    expect(decrypted).toBe("Hello group!");
  });

  it("ratchets forward correctly", async () => {
    const outbound = await MegolmOutbound.create("conv-1");
    const sessionExport = outbound.exportSession();
    const inbound = MegolmInbound.fromExport(sessionExport);

    const e1 = await outbound.encrypt("Msg 1");
    const e2 = await outbound.encrypt("Msg 2");
    const e3 = await outbound.encrypt("Msg 3");

    expect(e1.messageIndex).toBe(0);
    expect(e2.messageIndex).toBe(1);
    expect(e3.messageIndex).toBe(2);

    expect(await inbound.decrypt(e1.messageIndex, e1.ciphertext, e1.iv)).toBe("Msg 1");
    expect(await inbound.decrypt(e2.messageIndex, e2.ciphertext, e2.iv)).toBe("Msg 2");
    expect(await inbound.decrypt(e3.messageIndex, e3.ciphertext, e3.iv)).toBe("Msg 3");
  });

  it("inbound can fast-forward to skip missed messages", async () => {
    const outbound = await MegolmOutbound.create("conv-1");
    const sessionExport = outbound.exportSession();
    const inbound = MegolmInbound.fromExport(sessionExport);

    await outbound.encrypt("Skip 1");
    await outbound.encrypt("Skip 2");
    const e3 = await outbound.encrypt("Read this");

    // Inbound fast-forwards from index 0 to index 2
    expect(await inbound.decrypt(e3.messageIndex, e3.ciphertext, e3.iv)).toBe("Read this");
  });

  it("cannot decrypt with wrong session", async () => {
    const outbound1 = await MegolmOutbound.create("conv-1");
    const outbound2 = await MegolmOutbound.create("conv-2");
    const inbound2 = MegolmInbound.fromExport(outbound2.exportSession());

    const encrypted = await outbound1.encrypt("Secret");
    await expect(
      inbound2.decrypt(encrypted.messageIndex, encrypted.ciphertext, encrypted.iv)
    ).rejects.toThrow();
  });

  it("supports late-joiner with startingIndex", async () => {
    const outbound = await MegolmOutbound.create("conv-1");
    await outbound.encrypt("Before join 1");
    await outbound.encrypt("Before join 2");

    // Late joiner gets session at current index (2)
    const lateExport = outbound.exportSession();
    const lateInbound = MegolmInbound.fromExport(lateExport);

    const e3 = await outbound.encrypt("After join");
    expect(await lateInbound.decrypt(e3.messageIndex, e3.ciphertext, e3.iv)).toBe("After join");
  });

  it("signals when rotation is needed", async () => {
    const outbound = await MegolmOutbound.create("conv-1", 3); // max 3 messages
    await outbound.encrypt("1");
    await outbound.encrypt("2");
    await outbound.encrypt("3");
    expect(outbound.needsRotation()).toBe(true);
  });

  it("serializes and deserializes outbound session", async () => {
    const outbound = await MegolmOutbound.create("conv-1");
    await outbound.encrypt("Before");
    const serialized = outbound.serialize();
    const restored = MegolmOutbound.deserialize(serialized);
    const e2 = await restored.encrypt("After");
    expect(e2.messageIndex).toBe(1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/e2ee/megolm.test.ts`
Expected: FAIL

**Step 3: Implement Megolm**

```typescript
// lib/e2ee/megolm.ts
"use client";

import {
  generateRandomBytes,
  hmacSign,
  sha256,
  aesGcmEncrypt,
  aesGcmDecrypt,
  bufferToBase64,
  base64ToBuffer,
} from "./primitives";

const DEFAULT_MAX_MESSAGES = 100;

interface MegolmSessionExport {
  sessionId: string;
  targetId: string;
  ratchetKey: string;      // Base64
  messageIndex: number;
}

interface MegolmEncryptedPayload {
  sessionId: string;
  messageIndex: number;
  ciphertext: string;      // Base64
  iv: string;              // Base64
}

export class MegolmOutbound {
  private constructor(
    public readonly sessionId: string,
    public readonly targetId: string,
    private ratchetKey: ArrayBuffer,
    private messageIndex: number,
    private maxMessages: number,
  ) {}

  static async create(targetId: string, maxMessages = DEFAULT_MAX_MESSAGES): Promise<MegolmOutbound> {
    const sessionId = crypto.randomUUID();
    const ratchetKey = generateRandomBytes(32);
    return new MegolmOutbound(sessionId, targetId, ratchetKey, 0, maxMessages);
  }

  async encrypt(plaintext: string): Promise<MegolmEncryptedPayload> {
    const msgKey = await hmacSign(
      this.ratchetKey,
      new Uint8Array(new Uint32Array([this.messageIndex]).buffer)
    );
    const plaintextBytes = new TextEncoder().encode(plaintext);
    const { ciphertext, iv } = await aesGcmEncrypt(plaintextBytes, msgKey.slice(0, 32));
    const index = this.messageIndex;
    // Ratchet forward
    this.ratchetKey = await sha256(new Uint8Array(this.ratchetKey));
    this.messageIndex++;
    return {
      sessionId: this.sessionId,
      messageIndex: index,
      ciphertext: bufferToBase64(ciphertext),
      iv: bufferToBase64(iv),
    };
  }

  needsRotation(): boolean {
    return this.messageIndex >= this.maxMessages;
  }

  exportSession(): MegolmSessionExport {
    return {
      sessionId: this.sessionId,
      targetId: this.targetId,
      ratchetKey: bufferToBase64(this.ratchetKey),
      messageIndex: this.messageIndex,
    };
  }

  serialize(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      targetId: this.targetId,
      ratchetKey: bufferToBase64(this.ratchetKey),
      messageIndex: this.messageIndex,
      maxMessages: this.maxMessages,
    });
  }

  static deserialize(data: string): MegolmOutbound {
    const parsed = JSON.parse(data);
    return new MegolmOutbound(
      parsed.sessionId,
      parsed.targetId,
      base64ToBuffer(parsed.ratchetKey),
      parsed.messageIndex,
      parsed.maxMessages ?? DEFAULT_MAX_MESSAGES,
    );
  }
}

export class MegolmInbound {
  private constructor(
    public readonly sessionId: string,
    public readonly targetId: string,
    private ratchetKey: ArrayBuffer,
    private currentIndex: number,
  ) {}

  static fromExport(exported: MegolmSessionExport): MegolmInbound {
    return new MegolmInbound(
      exported.sessionId,
      exported.targetId,
      base64ToBuffer(exported.ratchetKey),
      exported.messageIndex,
    );
  }

  async decrypt(messageIndex: number, ciphertextBase64: string, ivBase64: string): Promise<string> {
    if (messageIndex < this.currentIndex) {
      throw new Error(`Cannot decrypt past message (index ${messageIndex} < current ${this.currentIndex})`);
    }
    // Fast-forward ratchet to target index
    let key = new Uint8Array(this.ratchetKey);
    let idx = this.currentIndex;
    while (idx < messageIndex) {
      key = new Uint8Array(await sha256(key));
      idx++;
    }
    // Derive message key at target index
    const msgKey = await hmacSign(
      key.buffer,
      new Uint8Array(new Uint32Array([messageIndex]).buffer)
    );
    const ciphertext = base64ToBuffer(ciphertextBase64);
    const iv = base64ToBuffer(ivBase64);
    const plaintext = await aesGcmDecrypt(ciphertext, msgKey.slice(0, 32), iv);
    // Advance our state past the decrypted message
    if (messageIndex >= this.currentIndex) {
      this.ratchetKey = await sha256(key);
      this.currentIndex = messageIndex + 1;
    }
    return new TextDecoder().decode(plaintext);
  }

  serialize(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      targetId: this.targetId,
      ratchetKey: bufferToBase64(this.ratchetKey),
      currentIndex: this.currentIndex,
    });
  }

  static deserialize(data: string): MegolmInbound {
    const parsed = JSON.parse(data);
    return new MegolmInbound(
      parsed.sessionId,
      parsed.targetId,
      base64ToBuffer(parsed.ratchetKey),
      parsed.currentIndex,
    );
  }
}
```

**Step 4: Run tests**

Run: `pnpm vitest run tests/e2ee/megolm.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add lib/e2ee/megolm.ts tests/e2ee/megolm.test.ts
git commit -m "feat(e2ee): implement Megolm group ratchet for channels and groups"
```

---

### Task 6: Attachment Encryption

**Files:**
- Create: `lib/e2ee/attachment.ts`
- Test: `tests/e2ee/attachment.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/e2ee/attachment.test.ts
import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

import { encryptAttachment, decryptAttachment } from "@/lib/e2ee/attachment";

describe("Attachment E2EE", () => {
  it("encrypts and decrypts a file round-trip", async () => {
    const content = new TextEncoder().encode("file content here");
    const blob = new Blob([content], { type: "text/plain" });

    const { encryptedBlob, fileKey, iv } = await encryptAttachment(blob);
    expect(encryptedBlob.size).toBeGreaterThan(0);
    expect(fileKey).toBeTruthy();

    const decrypted = await decryptAttachment(encryptedBlob, fileKey, iv);
    const text = await decrypted.text();
    expect(text).toBe("file content here");
  });

  it("produces different ciphertext for same file", async () => {
    const blob = new Blob(["same content"], { type: "text/plain" });
    const e1 = await encryptAttachment(blob);
    const e2 = await encryptAttachment(blob);
    expect(e1.fileKey).not.toBe(e2.fileKey);
  });
});
```

**Step 2: Run tests, verify fail**

Run: `pnpm vitest run tests/e2ee/attachment.test.ts`
Expected: FAIL

**Step 3: Implement**

```typescript
// lib/e2ee/attachment.ts
"use client";

import {
  generateRandomBytes,
  aesGcmEncrypt,
  aesGcmDecrypt,
  bufferToBase64,
  base64ToBuffer,
} from "./primitives";

export async function encryptAttachment(
  file: Blob
): Promise<{ encryptedBlob: Blob; fileKey: string; iv: string }> {
  const fileKey = generateRandomBytes(32);
  const plaintext = await file.arrayBuffer();
  const { ciphertext, iv } = await aesGcmEncrypt(plaintext, fileKey);
  return {
    encryptedBlob: new Blob([ciphertext], { type: "application/octet-stream" }),
    fileKey: bufferToBase64(fileKey),
    iv: bufferToBase64(iv),
  };
}

export async function decryptAttachment(
  encryptedBlob: Blob,
  fileKeyBase64: string,
  ivBase64: string
): Promise<Blob> {
  const ciphertext = await encryptedBlob.arrayBuffer();
  const fileKey = base64ToBuffer(fileKeyBase64);
  const iv = base64ToBuffer(ivBase64);
  const plaintext = await aesGcmDecrypt(ciphertext, fileKey, iv);
  return new Blob([plaintext]);
}
```

**Step 4: Run tests**

Run: `pnpm vitest run tests/e2ee/attachment.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add lib/e2ee/attachment.ts tests/e2ee/attachment.test.ts
git commit -m "feat(e2ee): add attachment encryption/decryption"
```

---

## Phase 2: Database Schema & Server API

### Task 7: Prisma Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add E2EE models and enums to schema**

Add after the existing `ConversationKeyShare` model (~line 2320):

```prisma
// ─── E2EE Identity & Keys ─────────────────

enum PreKeyType {
  SIGNED
  ONE_TIME
}

model UserIdentityKey {
  id                String      @id @default(uuid())
  userId            String      @unique
  publicKey         String
  wrappedPrivateKey String
  salt              String
  pbkdfIterations   Int         @default(100000)
  keyVersion        Int         @default(1)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  user              Users       @relation(fields: [userId], references: [id], onDelete: Cascade)
  preKeys           UserPreKey[]
}

model UserE2eePepper {
  id        String   @id @default(uuid())
  userId    String   @unique
  pepper    String
  createdAt DateTime @default(now())
  user      Users    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserPreKey {
  id          String      @id @default(uuid())
  userId      String
  keyType     PreKeyType
  publicKey   String
  signature   String?
  isConsumed  Boolean     @default(false)
  expiresAt   DateTime?
  createdAt   DateTime    @default(now())
  user        Users       @relation(fields: [userId], references: [id], onDelete: Cascade)
  identityKey UserIdentityKey @relation(fields: [userId], references: [userId], onDelete: Cascade)
  @@index([userId, keyType, isConsumed])
}

// ─── E2EE Sessions ────────────────────────

model GroupSession {
  id              String        @id @default(uuid())
  conversationId  String?
  channelId       String?
  creatorUserId   String
  sessionIndex    Int
  messageCount    Int           @default(0)
  maxMessages     Int           @default(100)
  rotatedAt       DateTime?
  isActive        Boolean       @default(true)
  createdAt       DateTime      @default(now())
  conversation    Conversation? @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  channel         Channel?      @relation(fields: [channelId], references: [id], onDelete: Cascade)
  shares          GroupSessionShare[]
  @@index([conversationId, isActive])
  @@index([channelId, isActive])
}

model GroupSessionShare {
  id               String       @id @default(uuid())
  groupSessionId   String
  userId           String
  encryptedSession String
  startingIndex    Int          @default(0)
  createdAt        DateTime     @default(now())
  session          GroupSession @relation(fields: [groupSessionId], references: [id], onDelete: Cascade)
  @@unique([groupSessionId, userId])
}

model DirectSession {
  id              String       @id @default(uuid())
  conversationId  String       @unique
  initiatorUserId String
  responderUserId String
  initialMessage  String
  isEstablished   Boolean      @default(false)
  createdAt       DateTime     @default(now())
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}
```

Add E2EE fields to `Message` model (after `contentType` field, ~line 2342):

```prisma
  sessionId        String?
  messageIndex     Int?
  dhPublicKey      String?
  previousChainLen Int?
```

Add to `Conversation` model (~line 2250):

```prisma
  isE2ee          Boolean        @default(true)
```

Add to `Channel` model (~line 2207):

```prisma
  isE2ee          Boolean        @default(true)
```

Add relations to `Users` model for `UserIdentityKey`, `UserE2eePepper`, `UserPreKey`.
Add `groupSessions GroupSession[]` relation to `Channel` model.
Add `directSession DirectSession?` and `groupSessions GroupSession[]` relations to `Conversation` model.

**Step 2: Remove `ConversationKeyShare` model and its relation from `Conversation`**

Delete the `ConversationKeyShare` model and remove `keyShares ConversationKeyShare[]` from `Conversation`.

Also remove from `Conversation`: `entityType`, `entityId`, `scope`, `orgMemberships` fields and their related model if applicable.

**Step 3: Generate and run migration**

Run: `pnpm prisma migrate dev --name add-e2ee-tables`
Expected: Migration creates all new tables and fields, removes `ConversationKeyShare`

**Step 4: Regenerate Prisma client**

Run: `pnpm prisma generate`
Expected: Success

**Step 5: Commit**

```bash
git add prisma/
git commit -m "feat(e2ee): add E2EE schema — identity keys, sessions, pre-keys"
```

---

### Task 8: E2EE API Routes — Identity & Pepper

**Files:**
- Create: `app/api/e2ee/identity/route.ts`
- Create: `app/api/e2ee/pepper/route.ts`
- Create: `app/api/e2ee/prekeys/route.ts`
- Create: `app/api/e2ee/prekey-bundle/[userId]/route.ts`
- Create: `app/api/e2ee/prekeys/count/route.ts`

**Step 1: Implement identity route**

`app/api/e2ee/identity/route.ts` — POST (create), GET (fetch own), PUT (rotate).
Uses Clerk `auth()` to get userId. Stores/retrieves `UserIdentityKey`. On POST, also generates `UserE2eePepper` with `crypto.randomBytes(32).toString('hex')`.

**Step 2: Implement pepper route**

`app/api/e2ee/pepper/route.ts` — GET only. Returns the authenticated user's pepper. This is the critical security endpoint — must verify Clerk session.

**Step 3: Implement pre-key routes**

- `app/api/e2ee/prekeys/route.ts` — POST (upload batch of signed + one-time keys)
- `app/api/e2ee/prekey-bundle/[userId]/route.ts` — GET (fetch bundle, atomically consume one OTP)
- `app/api/e2ee/prekeys/count/route.ts` — GET (check remaining OTPs for replenishment)

**Step 4: Test each endpoint manually or via integration test**

Run: `pnpm build` (verify no TS errors)
Expected: Build succeeds

**Step 5: Commit**

```bash
git add app/api/e2ee/
git commit -m "feat(e2ee): add identity, pepper, and pre-key API routes"
```

---

### Task 9: E2EE API Routes — Sessions

**Files:**
- Create: `app/api/e2ee/direct-sessions/route.ts`
- Create: `app/api/e2ee/direct-sessions/[conversationId]/route.ts`
- Create: `app/api/e2ee/group-sessions/route.ts`
- Create: `app/api/e2ee/group-sessions/[id]/share/route.ts`
- Create: `app/api/e2ee/group-sessions/[id]/rotate/route.ts`
- Create: `app/api/e2ee/group-sessions/[id]/add-members/route.ts`
- Create: `app/api/e2ee/group-sessions/active/route.ts`

**Step 1: Implement direct session routes**

- POST `/api/e2ee/direct-sessions` — store X3DH initial message
- GET `/api/e2ee/direct-sessions/[conversationId]` — fetch initial message for responder

**Step 2: Implement group session routes**

- POST `/api/e2ee/group-sessions` — create session + shares
- GET `.../active?conversationId=` or `?channelId=` — get active session
- GET `.../:id/share` — get my encrypted share
- POST `.../:id/rotate` — create new session, mark old inactive
- POST `.../:id/add-members` — add shares for new participants

**Step 3: Verify build**

Run: `pnpm build`
Expected: Success

**Step 4: Commit**

```bash
git add app/api/e2ee/
git commit -m "feat(e2ee): add direct and group session API routes"
```

---

### Task 10: Modify Messaging API — Pass-Through Ciphertext

**Files:**
- Modify: `app/api/messaging/messages/route.ts`
- Modify: `actions/messaging/messages.ts`
- Modify: `actions/messaging/direct-messages.ts`

**Step 1: Update message POST to accept ciphertext**

In `actions/messaging/messages.ts`, the `sendMessage` function currently calls `encryptMessageForOrg`. Change it to:
- Accept `ciphertext`, `sessionId`, `messageIndex`, `dhPublicKey`, `previousChainLen` in params
- Store the ciphertext directly in `content` (the server no longer encrypts/decrypts)
- Remove `encryptMessageForOrg` call from send path
- Remove `decryptMessageForOrg` call from read path (return ciphertext as-is)

**Step 2: Update message GET to return raw ciphertext**

In `getMessages`, remove the `decryptMessageForOrg` loop. Return `content` as-is (client decrypts).

**Step 3: Update delete to tombstone only**

In `deleteMessage`, just set `isDeleted = true`, `content = null`. No need to encrypt "[Message deleted]".

**Step 4: Update `getUserConversations` in direct-messages.ts**

Remove `decryptMessageForOrg` call on `lastMessage`. Return raw ciphertext.

**Step 5: Verify build**

Run: `pnpm build`
Expected: Success

**Step 6: Commit**

```bash
git add actions/messaging/ app/api/messaging/
git commit -m "feat(e2ee): make messaging server a pass-through relay for E2EE ciphertext"
```

---

## Phase 3: Client-Side Integration

### Task 11: IndexedDB Session Store

**Files:**
- Create: `lib/e2ee/session-store.ts`
- Test: `tests/e2ee/session-store.test.ts`

**Step 1: Install `idb` package**

Run: `pnpm add idb`

**Step 2: Implement session store**

`lib/e2ee/session-store.ts` — IndexedDB wrapper for storing:
- Identity key (cached after PIN unlock)
- Double Ratchet sessions (keyed by conversationId)
- Megolm inbound sessions (keyed by sessionId)
- Megolm outbound sessions (keyed by targetId)

All values encrypted with KEK before storage. Uses `idb` for typed IndexedDB access.

**Step 3: Write tests and verify**

Run: `pnpm vitest run tests/e2ee/session-store.test.ts`
Expected: PASS (may need `fake-indexeddb` package for test environment)

**Step 4: Commit**

```bash
git add lib/e2ee/session-store.ts tests/e2ee/session-store.test.ts package.json pnpm-lock.yaml
git commit -m "feat(e2ee): add IndexedDB session store with KEK encryption"
```

---

### Task 12: E2EE Public API & React Hook

**Files:**
- Create: `lib/e2ee/index.ts`
- Create: `hooks/useE2EE.ts`

**Step 1: Create the E2EE public API module**

`lib/e2ee/index.ts` — orchestrates identity setup, PIN unlock, encrypt/decrypt for DM and group, attachment encrypt/decrypt, session creation/rotation. Calls primitives, x3dh, double-ratchet, megolm, session-store internally.

**Step 2: Create React hook**

`hooks/useE2EE.ts` — React context + hook wrapping the E2EE API. Manages:
- `isSetUp` (checks if `UserIdentityKey` exists via API)
- `isUnlocked` (KEK in memory)
- `unlock(pin)` — fetches pepper, derives KEK, unwraps identity key
- `lock()` — clears KEK from memory
- Exposes `encryptDM`, `decryptDM`, `encryptGroup`, `decryptGroup`, `encryptFile`, `decryptFile`
- Auto-replenishes one-time pre-keys when count < 5

**Step 3: Verify build**

Run: `pnpm build`
Expected: Success

**Step 4: Commit**

```bash
git add lib/e2ee/index.ts hooks/useE2EE.ts
git commit -m "feat(e2ee): add E2EE public API and useE2EE React hook"
```

---

### Task 13: Wire E2EE into Messaging UI

**Files:**
- Modify: `hooks/swr/useMessaging.ts`
- Modify: `app/[locale]/app/(routes)/network/messages/components/MessageComposer.tsx`
- Modify: `app/[locale]/app/(routes)/network/messages/components/MessageThread.tsx`

**Step 1: Modify `useSendMessage` hook**

In `hooks/swr/useMessaging.ts`, update `useSendMessage` to:
- Call `e2ee.encryptGroup()` or `e2ee.encryptDM()` before POSTing
- Send `{ ciphertext, sessionId, messageIndex, dhPublicKey? }` instead of `{ content }`

**Step 2: Modify `useGetMessages` hook**

Update the data transformation to decrypt each message using `e2ee.decryptGroup()` or `e2ee.decryptDM()` based on conversation type.

**Step 3: Update MessageComposer**

In `MessageComposer.tsx`, the send handler now goes through the E2EE hook. For attachments, call `e2ee.encryptFile()` before upload, include `fileKey` in the message payload.

**Step 4: Update MessageThread**

In `MessageThread.tsx`, messages are decrypted by the hook before rendering. Add lock icon for E2EE messages. Show "[Unable to decrypt]" on failure with re-enter PIN option.

**Step 5: Verify build**

Run: `pnpm build`
Expected: Success

**Step 6: Commit**

```bash
git add hooks/swr/useMessaging.ts app/[locale]/app/\(routes\)/network/messages/components/
git commit -m "feat(e2ee): wire E2EE encryption into messaging UI components"
```

---

## Phase 4: UX — PIN Setup & Session Management

### Task 14: Security Settings — PIN Toggle

**Files:**
- Create: `app/[locale]/app/(routes)/settings/security/components/E2EEPinSetup.tsx`
- Modify: `app/[locale]/app/(routes)/settings/security/page.tsx`

**Step 1: Create PIN setup component**

`E2EEPinSetup.tsx` — card component with:
- Toggle switch "Enable E2EE PIN"
- PIN input (4-8 digits, masked)
- Confirm PIN input
- Strength indicator
- Warning: "If you forget this PIN, your message history cannot be recovered"
- Submit button → calls E2EE setup flow (generate identity key, upload to server)

**Step 2: Add to security settings page**

In `settings/security/page.tsx` (~line 31), add `<E2EEPinSetup />` after the existing `<ScreenshotProtectionSettings />`.

**Step 3: Verify build**

Run: `pnpm build`
Expected: Success

**Step 4: Commit**

```bash
git add app/[locale]/app/\(routes\)/settings/security/
git commit -m "feat(e2ee): add PIN setup UI in security settings"
```

---

### Task 15: Header — Refresh Session Button

**Files:**
- Create: `components/layout/E2EESessionButton.tsx`
- Create: `components/e2ee/PinEntryDialog.tsx`
- Modify: `app/[locale]/app/(routes)/layout.tsx` (~line 214-217)

**Step 1: Create PIN entry dialog**

`PinEntryDialog.tsx` — modal dialog with:
- PIN input (4-8 digits, masked)
- "Remember for 8 hours" checkbox
- Submit → calls `e2ee.unlock(pin)`
- Error state for wrong PIN

**Step 2: Create session button**

`E2EESessionButton.tsx` — small icon button (Lock/Unlock icon from lucide-react):
- Shows locked icon when E2EE not unlocked
- Shows unlocked icon when active
- Click → opens `PinEntryDialog`
- Tooltip: "Refresh E2EE session"

**Step 3: Add to header**

In `app/[locale]/app/(routes)/layout.tsx` at ~line 215, add `<E2EESessionButton />` next to `<LayoutToggle />`.

**Step 4: Verify build**

Run: `pnpm build`
Expected: Success

**Step 5: Commit**

```bash
git add components/layout/E2EESessionButton.tsx components/e2ee/PinEntryDialog.tsx app/[locale]/app/\(routes\)/layout.tsx
git commit -m "feat(e2ee): add refresh session button and PIN entry dialog to header"
```

---

## Phase 5: Migration & Cleanup

### Task 16: Migration Script

**Files:**
- Create: `scripts/migrate-messages-to-e2ee.ts`

**Step 1: Write migration script**

Script that for each organization:
1. Fetches all conversations and channels
2. Decrypts all existing message content using org DEK (`decryptMessageForOrg`)
3. Creates a bootstrap Megolm outbound session per conversation/channel
4. Re-encrypts each message with the Megolm session
5. Stores session shares for all participants
6. Updates messages in DB with new ciphertext + sessionId + messageIndex

**Step 2: Add safety checks**

- Dry-run mode (`--dry-run` flag)
- Per-org backup of original encrypted content
- Verification step: decrypt with new session, compare to original plaintext

**Step 3: Commit**

```bash
git add scripts/migrate-messages-to-e2ee.ts
git commit -m "feat(e2ee): add migration script for existing messages"
```

---

### Task 17: Remove Server-Side Message Encryption

**Files:**
- Modify: `lib/model-encryption.ts` — remove `encryptMessage`, `decryptMessage`, `encryptMessageForOrg`, `decryptMessageForOrg` functions
- Modify: `actions/messaging/messages.ts` — remove all encrypt/decrypt imports and calls
- Modify: `actions/messaging/direct-messages.ts` — remove decrypt call on lastMessage
- Modify: `actions/messaging/search.ts` — remove server-side search (client-only now)

**Step 1: Remove encryption functions from model-encryption.ts**

Delete the `Messages` section (encryptMessage, decryptMessage, encryptMessageForOrg, decryptMessageForOrg) and their associated types.

**Step 2: Remove all imports of removed functions from messaging actions**

Update `messages.ts`, `direct-messages.ts` to remove imports and calls.

**Step 3: Simplify search**

In `search.ts`, either remove the action entirely or make it return an empty result (client-side search replaces it).

**Step 4: Verify build**

Run: `pnpm build`
Expected: Success

**Step 5: Run all E2EE tests**

Run: `pnpm vitest run tests/e2ee/`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add lib/model-encryption.ts actions/messaging/
git commit -m "feat(e2ee): remove server-side message encryption — server is now a relay"
```

---

### Task 18: Conversation Simplification Cleanup

**Files:**
- Modify: `actions/messaging/direct-messages.ts` — remove `startClientConversation`, `startPropertyConversation`, `getEntityConversations`
- Modify: `hooks/swr/useMessaging.ts` — remove entity-related hooks
- Modify: UI components referencing entity conversations

**Step 1: Remove entity-linked conversation actions**

Delete `startClientConversation`, `startPropertyConversation`, `getEntityConversations` from `direct-messages.ts`.

**Step 2: Remove entity conversation hooks and UI**

Clean up any references to `entityType`, `entityId` in hooks and components.

**Step 3: Verify build**

Run: `pnpm build`
Expected: Success

**Step 4: Commit**

```bash
git add actions/messaging/ hooks/swr/ app/
git commit -m "refactor(messaging): remove entity-linked conversations, simplify to DMs/groups/channels"
```

---

### Task 19: E2EE Onboarding Gate

**Files:**
- Create: `app/[locale]/app/(routes)/network/messages/components/E2EEOnboarding.tsx`
- Modify: `app/[locale]/app/(routes)/network/messages/components/MessagesPage.tsx`

**Step 1: Create onboarding component**

`E2EEOnboarding.tsx` — full-page gate shown when user hasn't set up E2EE. Blocks access to messaging until PIN is configured. Reuses the PIN setup flow from Task 14.

**Step 2: Add gate to MessagesPage**

In `MessagesPage.tsx`, check `e2ee.isSetUp`. If false, render `<E2EEOnboarding />` instead of the messaging UI. If set up but not unlocked, show the PIN entry dialog.

**Step 3: Verify build**

Run: `pnpm build`
Expected: Success

**Step 4: Commit**

```bash
git add app/[locale]/app/\(routes\)/network/messages/components/
git commit -m "feat(e2ee): add mandatory E2EE onboarding gate for messaging"
```

---

### Task 20: Final Integration Test & Cleanup

**Step 1: Run full test suite**

Run: `pnpm vitest run tests/e2ee/`
Expected: ALL PASS

**Step 2: Run build**

Run: `pnpm build`
Expected: Success with no TS errors

**Step 3: Run lint**

Run: `pnpm lint`
Expected: No errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(e2ee): complete E2EE messaging implementation"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-6 | Crypto primitives, X3DH, Double Ratchet, Megolm, attachments |
| 2 | 7-10 | Prisma schema, E2EE API routes, messaging pass-through |
| 3 | 11-13 | Session store, React hook, UI wiring |
| 4 | 14-15 | PIN setup in settings, refresh session button in header |
| 5 | 16-20 | Migration script, remove server encryption, cleanup, onboarding gate |
