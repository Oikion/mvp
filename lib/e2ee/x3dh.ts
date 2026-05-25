"use client";

/**
 * X3DH (Extended Triple Diffie-Hellman) key agreement protocol.
 *
 * Security properties:
 * - With 4-DH (IK + EK + SPK + OPK): strong forward secrecy, key uniqueness per session
 * - With 3-DH (IK + EK + SPK, no OPK): reduced forward secrecy; SPK compromise breaks past sessions
 * - With unverified SPK (no signingPublicKey): no authentication of Bob's signed prekey; MITM possible
 *   at the server level (accepted risk per current threat model — server is trusted)
 *
 * Known degradations logged at runtime:
 * - refillNeeded: true in prekey-bundle response → target user's OTPs exhausted → 3-DH fallback
 * - "[x3dh] No one-time prekey" log → 3-DH session established
 * - "[x3dh] WARNING: Establishing session without SPK verification" → legacy user path
 */

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

/**
 * X3DH key agreement — initiator side.
 *
 * Security properties:
 * - 4-DH when OTP prekey is available: provides full forward secrecy
 * - 3-DH fallback when OTP exhausted: reduced forward secrecy (compromise of IK + SPK reveals session key)
 * - SPK signature is verified against recipient's identity key unless recipient is a legacy user without signingPublicKey
 * - Legacy path (no signingPublicKey): SPK verification skipped with a warning — continue, do not throw
 *
 * @param aliceIdentity - The initiating user's ECDH identity key pair
 * @param bobBundle - The pre-key bundle fetched from the server for the recipient
 * @returns sharedSecret (32-byte HKDF output) and initialMessage to send to recipient
 */
export async function initiateX3DH(
  aliceIdentity: CryptoKeyPair,
  bobBundle: PreKeyBundle
): Promise<X3DHResult> {
  // Verify the signed pre-key signature before using it (C-1)
  if (!bobBundle.signingPublicKey) {
    // Legacy user: no signing public key present. SPK verification is skipped.
    // TODO: Remove this path once all users have rotated to keys with signingPublicKey.
    // Security implication: attacker who can substitute the SPK cannot be detected for legacy users.
    console.warn(
      "[X3DH] WARNING: Establishing session without SPK signature verification. " +
      "This user's identity key may be unauthenticated. " +
      "User should re-initialize E2EE to gain SPK protection."
    );
    // Continue — do NOT throw, as this would break sessions with legacy users
  } else {
    // Verify SPK signature with signing public key (standard path)
    const signingKey = await importEd25519PublicKey(bobBundle.signingPublicKey);
    const spkiBytes = base64ToBuffer(bobBundle.signedPreKey);
    const signatureBytes = base64ToBuffer(bobBundle.signature);
    const valid = await verifyWithEd25519(signingKey, signatureBytes, spkiBytes);
    if (!valid) {
      throw new Error("Invalid signed pre-key signature — possible MITM attack");
    }
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
    // DH4: One-time prekey contribution — provides forward secrecy and key uniqueness per session.
    // Each OTP key is consumed exactly once; no two sessions share the same DH4 input.
    const bobOPK = await importPublicKey(bobBundle.oneTimePreKey);
    const dh4 = await deriveSharedSecret(ephemeral.privateKey, bobOPK);
    dhConcat = concatBuffers(dhConcat, dh4);
    oneTimePreKeyId = bobBundle.oneTimePreKeyId;
  } else {
    // SECURITY DEGRADATION: No one-time prekey available (target user's OTPs exhausted).
    // Falling back to 3-DH (without DH4). Forward secrecy window is reduced:
    // an attacker who later compromises Bob's signed prekey (SPK) can decrypt this session.
    // The caller should check refillNeeded in the bundle response and prompt a key refill.
    console.warn("[x3dh] No one-time prekey available for session establishment — using 3-DH fallback. Forward secrecy degraded.");
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
  bobOneTimePreKey: { keyPair: CryptoKeyPair; id: string } | undefined,
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
    // DH4: One-time prekey contribution — symmetric with the initiator's DH4.
    // M-6: Verify the OTP key Bob selected matches the one Alice specified.
    // Without this check, Bob could use the wrong OTP key, producing a different
    // shared secret from Alice's — the session would silently fail on first message.
    if (bobOneTimePreKey.id !== initialMessage.oneTimePreKeyId) {
      throw new Error(
        `OTP key ID mismatch: Bob used ${bobOneTimePreKey.id} but Alice specified ${initialMessage.oneTimePreKeyId}`
      );
    }
    const dh4 = await deriveSharedSecret(bobOneTimePreKey.keyPair.privateKey, aliceEK);
    dhConcat = concatBuffers(dhConcat, dh4);
  } else if (!bobOneTimePreKey && initialMessage.oneTimePreKeyId) {
    // SECURITY DEGRADATION (responder side): Alice included a oneTimePreKeyId in her
    // initial message, but Bob no longer has that OTP key (already consumed or missing).
    // This should not normally happen if the server correctly marks OTPs as consumed.
    // Proceeding without DH4 — shared secret will not match Alice's, causing session failure.
    console.warn("[x3dh] OTP key ID specified in initial message but not available on responder side. Session key derivation may fail.");
  } else if (!initialMessage.oneTimePreKeyId) {
    // SECURITY DEGRADATION (responder side): Initiator established a 3-DH session
    // (no OTP key was available at the time). This is the expected counterpart to the
    // initiator-side 3-DH fallback. Forward secrecy is reduced for this session.
    console.warn("[X3DH] Performing 3-DH (no OTP prekey) — session has reduced forward secrecy. Client should refill prekeys.");
  }

  const salt = new ArrayBuffer(32);
  const sharedSecret = await hkdfDerive(dhConcat, salt, X3DH_INFO, 32);

  return { sharedSecret };
}
