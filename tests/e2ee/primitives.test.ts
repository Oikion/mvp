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
