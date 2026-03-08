import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

import { DoubleRatchet } from "@/lib/e2ee/double-ratchet";
import { generateECDHKeyPair, generateRandomBytes } from "@/lib/e2ee/primitives";

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
