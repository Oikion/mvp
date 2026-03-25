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
  signWithEd25519,
  verifyWithEd25519,
  importEd25519PublicKey,
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
  signingPrivateKey: CryptoKey
): Promise<SignedPreKeyResult> {
  const keyPair = await generateECDHKeyPair();
  const pubKeyBase64 = await exportPublicKey(keyPair.publicKey);
  // Sign the SPKI-encoded public key bytes with the Ed25519 identity signing key
  const pubKeyBytes = base64ToBuffer(pubKeyBase64);
  const signature = await signWithEd25519(signingPrivateKey, pubKeyBytes);
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
  // Verify the signed pre-key signature before using it (C-1)
  if (bobBundle.signingPublicKey) {
    const signingKey = await importEd25519PublicKey(bobBundle.signingPublicKey);
    const spkiBytes = base64ToBuffer(bobBundle.signedPreKey);
    const signatureBytes = base64ToBuffer(bobBundle.signature);
    const valid = await verifyWithEd25519(signingKey, signatureBytes, spkiBytes);
    if (!valid) {
      throw new Error("Invalid signed pre-key signature — possible MITM attack");
    }
  } else {
    console.warn("[X3DH] signingPublicKey absent — skipping SPK verification (legacy user)");
  }

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

/**
 * Derive the shared secret from an inbound X3DH initial message.
 *
 * Trust model: Alice's identity key in `initialMessage.identityKey` is NOT
 * independently verified here. Trust is established at the transport layer:
 * the server delivers the initial message only to the conversation participant,
 * and Alice's identity public key is stored server-side under her Clerk-authenticated
 * user ID (uploaded during E2EE setup). A server-level compromise could substitute
 * a different identity key — this is acceptable in the current threat model, which
 * does not require MITM resistance against a fully compromised server.
 * Out-of-band key fingerprint comparison (safety numbers) would address this if needed.
 */
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
