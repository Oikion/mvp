import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

import {
  generateECDHKeyPair,
  generateEd25519KeyPair,
  exportPublicKey,
  exportEd25519PublicKey,
} from "@/lib/e2ee/primitives";
import {
  generateSignedPreKey,
  generateOneTimePreKeys,
  initiateX3DH,
  respondX3DH,
} from "@/lib/e2ee/x3dh";

describe("Signed Pre-Key", () => {
  it("generates SPK and signature using Ed25519 signing key", async () => {
    const signingPair = await generateEd25519KeyPair();
    const spk = await generateSignedPreKey(signingPair.privateKey);
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
    const bobSigningPair = await generateEd25519KeyPair();
    const bobSPK = await generateSignedPreKey(bobSigningPair.privateKey);
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
      { keyPair: bobOTPs[0].keyPair, id: bobOTPs[0].id },
      aliceResult.initialMessage
    );

    // Shared secrets must match
    expect(new Uint8Array(aliceResult.sharedSecret))
      .toEqual(new Uint8Array(bobResult.sharedSecret));
  });

  it("works without one-time pre-key", async () => {
    const bobIdentity = await generateECDHKeyPair();
    const bobSigningPair = await generateEd25519KeyPair();
    const bobSPK = await generateSignedPreKey(bobSigningPair.privateKey);

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

  it("accepts a valid SPK signature when signingPublicKey is present", async () => {
    const bobIdentity = await generateECDHKeyPair();
    const bobSigningPair = await generateEd25519KeyPair();
    const bobSPK = await generateSignedPreKey(bobSigningPair.privateKey);

    const bobBundle = {
      identityKey: await exportPublicKey(bobIdentity.publicKey),
      signedPreKey: bobSPK.publicKey,
      signature: bobSPK.signature,
      signingPublicKey: await exportEd25519PublicKey(bobSigningPair.publicKey),
    };

    const aliceIdentity = await generateECDHKeyPair();
    // Should resolve without throwing — signature is valid
    const aliceResult = await initiateX3DH(aliceIdentity, bobBundle);
    expect(aliceResult.sharedSecret).toBeDefined();
  });

  it("throws when SPK signature is invalid (MITM attack)", async () => {
    const bobIdentity = await generateECDHKeyPair();
    const bobSigningPair = await generateEd25519KeyPair();
    const bobSPK = await generateSignedPreKey(bobSigningPair.privateKey);

    // Attacker provides their own signing public key — verification will fail
    // because the signature was made with Bob's key, not the attacker's
    const attackerSigningPair = await generateEd25519KeyPair();

    const corruptBundle = {
      identityKey: await exportPublicKey(bobIdentity.publicKey),
      signedPreKey: bobSPK.publicKey,
      signature: bobSPK.signature,
      signingPublicKey: await exportEd25519PublicKey(attackerSigningPair.publicKey),
    };

    const aliceIdentity = await generateECDHKeyPair();
    await expect(initiateX3DH(aliceIdentity, corruptBundle))
      .rejects.toThrow("Invalid signed pre-key signature");
  });

  it("completes handshake without signingPublicKey (legacy user)", async () => {
    const bobIdentity = await generateECDHKeyPair();
    const bobSigningPair = await generateEd25519KeyPair();
    const bobSPK = await generateSignedPreKey(bobSigningPair.privateKey);

    // Legacy bundle — no signingPublicKey, verification is skipped with console.warn
    const legacyBundle = {
      identityKey: await exportPublicKey(bobIdentity.publicKey),
      signedPreKey: bobSPK.publicKey,
      signature: bobSPK.signature,
    };

    const aliceIdentity = await generateECDHKeyPair();
    const aliceResult = await initiateX3DH(aliceIdentity, legacyBundle);
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
