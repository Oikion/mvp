import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

import { encrypt, decrypt, isEncrypted, encryptWithKey, decryptWithKey } from "@/lib/encryption";
import { encryptClient, decryptClient } from "@/lib/model-encryption";

// Use a deterministic 32-byte key for testing (all zeros — never use in production)
const TEST_KEY_HEX = "0000000000000000000000000000000000000000000000000000000000000000";
const TEST_KEY_BUF = Buffer.from(TEST_KEY_HEX, "hex");

beforeAll(() => {
  vi.stubEnv("SECRETS_ENCRYPTION_KEY", TEST_KEY_HEX);
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("isEncrypted", () => {
  it("returns false for plain text", () => {
    expect(isEncrypted("hello")).toBe(false);
    expect(isEncrypted("test@example.com")).toBe(false);
    expect(isEncrypted(null)).toBe(false);
    expect(isEncrypted(undefined)).toBe(false);
    expect(isEncrypted("")).toBe(false);
  });

  it("returns true for values produced by encrypt()", () => {
    const cipher = encrypt("test value");
    expect(isEncrypted(cipher)).toBe(true);
  });

  it("returns false for colon-separated strings that are not encrypted format", () => {
    // Correct structure: 32:32:anything — short parts should fail
    expect(isEncrypted("abc:def:ghi")).toBe(false);
    expect(isEncrypted("a:b")).toBe(false);
  });
});

describe("encrypt / decrypt round-trip", () => {
  it("encrypts and decrypts a plain string", () => {
    const plain = "Γεια σου κόσμε"; // Greek text
    const cipher = encrypt(plain);
    expect(cipher).not.toBe(plain);
    expect(isEncrypted(cipher)).toBe(true);
    expect(decrypt(cipher)).toBe(plain);
  });

  it("produces different ciphertext each call (random IV)", () => {
    const plain = "same plaintext";
    const c1 = encrypt(plain);
    const c2 = encrypt(plain);
    expect(c1).not.toBe(c2);
    expect(decrypt(c1)).toBe(plain);
    expect(decrypt(c2)).toBe(plain);
  });

  it("returns empty string as-is without encrypting", () => {
    expect(encrypt("")).toBe("");
    expect(decrypt("")).toBe("");
  });
});

describe("encryptWithKey / decryptWithKey round-trip", () => {
  it("encrypts and decrypts using an explicit key buffer", () => {
    const plain = "sensitive data";
    const cipher = encryptWithKey(plain, TEST_KEY_BUF);
    expect(isEncrypted(cipher)).toBe(true);
    expect(decryptWithKey(cipher, TEST_KEY_BUF)).toBe(plain);
  });
});

describe("encryptClient idempotency", () => {
  it("does not double-encrypt when called twice", () => {
    const data = { client_name: "Nikos Papadopoulos", primary_email: "nikos@example.com" };
    const once = encryptClient(data);
    const twice = encryptClient(once);

    // Values should be identical — second call is a no-op
    expect(twice.client_name).toBe(once.client_name);
    expect(twice.primary_email).toBe(once.primary_email);
  });

  it("round-trips client fields through encrypt → decrypt", () => {
    const original = {
      client_name: "Maria Ekonomou",
      primary_email: "maria@example.gr",
      primary_phone: "+30 210 1234567",
      afm: "123456789",
    };

    const encrypted = encryptClient(original);

    // Encrypted values should not be plaintext
    expect(encrypted.client_name).not.toBe(original.client_name);
    expect(isEncrypted(encrypted.client_name!)).toBe(true);

    const decrypted = decryptClient(encrypted);

    expect(decrypted.client_name).toBe(original.client_name);
    expect(decrypted.primary_email).toBe(original.primary_email);
    expect(decrypted.primary_phone).toBe(original.primary_phone);
    expect(decrypted.afm).toBe(original.afm);
  });

  it("preserves null and undefined fields without throwing", () => {
    const data = { client_name: null, primary_email: undefined };
    const encrypted = encryptClient(data);
    const decrypted = decryptClient(encrypted);

    expect(decrypted.client_name).toBeNull();
    expect(decrypted.primary_email).toBeUndefined();
  });

  it("encrypts communication_notes JSON field", () => {
    const notes = { preferred_contact: "email", language: "el" };
    const data = { communication_notes: notes };

    const encrypted = encryptClient(data);
    // JSON field is serialized to an encrypted string
    expect(typeof encrypted.communication_notes).toBe("string");
    expect(isEncrypted(encrypted.communication_notes as string)).toBe(true);

    const decrypted = decryptClient(encrypted);
    expect(decrypted.communication_notes).toEqual(notes);
  });
});
