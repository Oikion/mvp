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
