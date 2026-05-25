// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

import { encrypt, decrypt, isEncrypted, encryptWithKey, decryptWithKey } from "@/lib/encryption";
import { encryptContactForOrg, decryptContactForOrg } from "@/lib/model-encryption";

// Use a deterministic 32-byte key for testing (all zeros — never use in production)
const TEST_KEY_HEX = "0000000000000000000000000000000000000000000000000000000000000000";
const TEST_KEY_BUF = Buffer.from(TEST_KEY_HEX, "hex");
const TEST_ORG_ID = "test-org-id";

beforeAll(() => {
  vi.stubEnv("SECRETS_ENCRYPTION_KEY", TEST_KEY_HEX);
});

afterAll(() => {
  vi.unstubAllEnvs();
});

// Mock getOrgDek to return the test key buffer
vi.mock("@/lib/key-management", () => ({
  getOrgDek: vi.fn().mockResolvedValue(Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex")),
  getOrgDeksForDecryption: vi.fn().mockResolvedValue([Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex")]),
}));

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

  // Test the false-positive scenario (regression test for the ciphertext hex validation fix)
  it("returns false when ciphertext portion is not hex-encoded", () => {
    // Valid 24-char hex IV, valid 32-char hex authTag, but non-hex ciphertext
    const validIv = "a1b2c3d4e5f6a7b8c9d0e1f2"; // 24 hex chars
    const validTag = "f6e5d4c3b2a1f0e9d8c7b6a5949392a1"; // 32 hex chars
    expect(isEncrypted(`${validIv}:${validTag}:plaintext`)).toBe(false);
    expect(isEncrypted(`${validIv}:${validTag}:not-valid-hex!`)).toBe(false);
  });

  it("returns true for genuinely encrypted values with all-hex ciphertext", () => {
    // All three parts are valid hex — this is what a real encrypted value looks like
    const validIv = "a1b2c3d4e5f6a7b8c9d0e1f2"; // 24 hex chars
    const validTag = "f6e5d4c3b2a1f0e9d8c7b6a5949392a1"; // 32 hex chars
    const validCiphertext = "deadbeefcafe1234deadbeefcafe5678"; // 32 hex chars
    expect(isEncrypted(`${validIv}:${validTag}:${validCiphertext}`)).toBe(true);
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

  it("encrypts empty strings (M-02: empty string leaks metadata)", () => {
    // Empty strings are now encrypted — null means "field not set"
    const cipher = encrypt("");
    expect(isEncrypted(cipher)).toBe(true);
    expect(decrypt(cipher)).toBe("");
    // decrypt of truly empty string returns empty (not in encrypted format)
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

describe("encryptContactForOrg idempotency", () => {
  it("does not double-encrypt when called twice", async () => {
    const data = { displayName: "Νίκος Παπαδόπουλος", email: "nikos@example.com" };
    const once = await encryptContactForOrg(data, TEST_ORG_ID);
    const twice = await encryptContactForOrg(once, TEST_ORG_ID);

    // Values should be identical — second call is a no-op
    expect(twice.displayName).toBe(once.displayName);
    expect(twice.email).toBe(once.email);
  });

  it("round-trips contact fields through encrypt → decrypt", async () => {
    const original = {
      displayName: "Μαρία Οικονόμου",
      email: "maria@example.gr",
      primaryPhone: "+30 210 1234567",
      taxId: "123456789",
    };

    const encrypted = await encryptContactForOrg(original, TEST_ORG_ID);

    // Encrypted values should not be plaintext
    expect(encrypted.displayName).not.toBe(original.displayName);
    expect(isEncrypted(encrypted.displayName!)).toBe(true);

    const decrypted = await decryptContactForOrg(encrypted, TEST_ORG_ID);

    expect(decrypted.displayName).toBe(original.displayName);
    expect(decrypted.email).toBe(original.email);
    expect(decrypted.primaryPhone).toBe(original.primaryPhone);
    expect(decrypted.taxId).toBe(original.taxId);
  });

  it("preserves null and undefined fields without throwing", async () => {
    const data = { displayName: null, email: undefined };
    const encrypted = await encryptContactForOrg(data, TEST_ORG_ID);
    const decrypted = await decryptContactForOrg(encrypted, TEST_ORG_ID);

    expect(decrypted.displayName).toBeNull();
    expect(decrypted.email).toBeUndefined();
  });

  it("encrypts communicationNotes JSON field", async () => {
    const notes = { preferred_contact: "email", language: "el" };
    const data = { communicationNotes: notes };

    const encrypted = await encryptContactForOrg(data, TEST_ORG_ID);
    // JSON field is serialized to an encrypted string
    expect(typeof encrypted.communicationNotes).toBe("string");
    expect(isEncrypted(encrypted.communicationNotes as unknown as string)).toBe(true);

    const decrypted = await decryptContactForOrg(encrypted, TEST_ORG_ID);
    expect(decrypted.communicationNotes).toEqual(notes);
  });
});
