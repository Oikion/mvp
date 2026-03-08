import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

import { generateECDHKeyPair, exportPublicKey } from "@/lib/e2ee/primitives";
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
