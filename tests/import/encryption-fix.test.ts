// tests/import/encryption-fix.test.ts
//
// Verifies that each import config's encryptWithDek() method also encrypts
// the communication_notes JSON field, matching the behaviour of the
// per-org helpers in lib/model-encryption.ts.

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

// ─── Mocks (must appear before any dynamic import of the modules under test) ───

const FAKE_ENCRYPTED = "aabbcc:ddeeff:112233"; // iv:auth:ct sentinel

vi.mock("@/lib/encryption", () => ({
  encryptWithKey: vi.fn((_value: string, _dek: Buffer) => FAKE_ENCRYPTED),
  isEncrypted: vi.fn((value: string) => value === FAKE_ENCRYPTED),
}));

// encryptJsonWithKey is called from lib/model-encryption.ts — mock that module
// so we can spy on the JSON encryption helper without real crypto.
vi.mock("@/lib/model-encryption", async (importOriginal) => {
  // We still need the real module for CLIENT_ENCRYPTED_STRING_FIELDS /
  // MANDATE_ENCRYPTED_STRING_FIELDS constants if they are exported, but those
  // are not exported, so we only need to mock encryptJsonWithKey.
  return {
    encryptJsonWithKey: vi.fn((_value: unknown, _dek: Buffer) => FAKE_ENCRYPTED),
  };
});

// ─── Setup ───────────────────────────────────────────────────────────────────

const FAKE_DEK = Buffer.alloc(32, 0x42);

beforeAll(() => {
  vi.stubEnv("SECRETS_ENCRYPTION_KEY", "a".repeat(64));
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

// ─── Client ──────────────────────────────────────────────────────────────────

describe("contactImportConfig.encryptWithDek — communication_notes", () => {
  it("encrypts communication_notes when present and non-null", async () => {
    const { contactImportConfig } = await import(
      "@/lib/import/contact-import-config"
    );
    const { encryptJsonWithKey } = await import("@/lib/model-encryption");

    const notes = { channel: "email", summary: "Follow-up call" };
    const data: Record<string, unknown> = {
      client_name: "Acme Corp",
      communication_notes: notes,
    };

    const result = contactImportConfig.encryptWithDek(data, FAKE_DEK);

    expect(encryptJsonWithKey).toHaveBeenCalledWith(notes, FAKE_DEK);
    expect(result.communication_notes).toBe(FAKE_ENCRYPTED);
  });

  it("skips communication_notes when null", async () => {
    const { contactImportConfig } = await import(
      "@/lib/import/contact-import-config"
    );
    const { encryptJsonWithKey } = await import("@/lib/model-encryption");
    vi.mocked(encryptJsonWithKey).mockClear();

    const data: Record<string, unknown> = {
      client_name: "Acme Corp",
      communication_notes: null,
    };

    const result = contactImportConfig.encryptWithDek(data, FAKE_DEK);

    expect(encryptJsonWithKey).not.toHaveBeenCalled();
    expect(result.communication_notes).toBeUndefined();
  });

  it("skips communication_notes when absent", async () => {
    const { contactImportConfig } = await import(
      "@/lib/import/contact-import-config"
    );
    const { encryptJsonWithKey } = await import("@/lib/model-encryption");
    vi.mocked(encryptJsonWithKey).mockClear();

    const data: Record<string, unknown> = { client_name: "Acme Corp" };
    contactImportConfig.encryptWithDek(data, FAKE_DEK);

    expect(encryptJsonWithKey).not.toHaveBeenCalled();
  });
});

// ─── Property ─────────────────────────────────────────────────────────────────

describe("propertyImportConfig.encryptWithDek — communication_notes", () => {
  it("encrypts communication_notes when present and non-null", async () => {
    const { propertyImportConfig } = await import(
      "@/lib/import/property-import-config"
    );
    const { encryptJsonWithKey } = await import("@/lib/model-encryption");
    vi.mocked(encryptJsonWithKey).mockClear();

    const notes = { channel: "phone", summary: "Interested buyer" };
    const data: Record<string, unknown> = {
      property_name: "Flat 4B",
      communication_notes: notes,
    };

    const result = propertyImportConfig.encryptWithDek(data, FAKE_DEK);

    expect(encryptJsonWithKey).toHaveBeenCalledWith(notes, FAKE_DEK);
    expect(result.communication_notes).toBe(FAKE_ENCRYPTED);
  });

  it("skips communication_notes when null", async () => {
    const { propertyImportConfig } = await import(
      "@/lib/import/property-import-config"
    );
    const { encryptJsonWithKey } = await import("@/lib/model-encryption");
    vi.mocked(encryptJsonWithKey).mockClear();

    const data: Record<string, unknown> = {
      property_name: "Flat 4B",
      communication_notes: null,
    };

    const result = propertyImportConfig.encryptWithDek(data, FAKE_DEK);

    expect(encryptJsonWithKey).not.toHaveBeenCalled();
    expect(result.communication_notes).toBeUndefined();
  });

  it("skips communication_notes when absent", async () => {
    const { propertyImportConfig } = await import(
      "@/lib/import/property-import-config"
    );
    const { encryptJsonWithKey } = await import("@/lib/model-encryption");
    vi.mocked(encryptJsonWithKey).mockClear();

    const data: Record<string, unknown> = { property_name: "Flat 4B" };
    propertyImportConfig.encryptWithDek(data, FAKE_DEK);

    expect(encryptJsonWithKey).not.toHaveBeenCalled();
  });
});

// ─── Mandate ──────────────────────────────────────────────────────────────────

describe("requestImportConfig.encryptWithDek — communication_notes", () => {
  it("encrypts communication_notes when present and non-null", async () => {
    const { requestImportConfig } = await import(
      "@/lib/import/request-import-config"
    );
    const { encryptJsonWithKey } = await import("@/lib/model-encryption");
    vi.mocked(encryptJsonWithKey).mockClear();

    const notes = { channel: "visit", summary: "Wants 3 bedrooms" };
    const data: Record<string, unknown> = {
      title: "Buy apartment in Athens",
      communication_notes: notes,
    };

    const result = requestImportConfig.encryptWithDek(data, FAKE_DEK);

    expect(encryptJsonWithKey).toHaveBeenCalledWith(notes, FAKE_DEK);
    // requestImportConfig uses camelCase key to match the Prisma Request model
    expect(result.communicationNotes).toBe(FAKE_ENCRYPTED);
  });

  it("skips communication_notes when null", async () => {
    const { requestImportConfig } = await import(
      "@/lib/import/request-import-config"
    );
    const { encryptJsonWithKey } = await import("@/lib/model-encryption");
    vi.mocked(encryptJsonWithKey).mockClear();

    const data: Record<string, unknown> = {
      title: "Buy apartment",
      communication_notes: null,
    };

    const result = requestImportConfig.encryptWithDek(data, FAKE_DEK);

    expect(encryptJsonWithKey).not.toHaveBeenCalled();
    expect(result.communication_notes).toBeUndefined();
  });

  it("skips communication_notes when absent", async () => {
    const { requestImportConfig } = await import(
      "@/lib/import/request-import-config"
    );
    const { encryptJsonWithKey } = await import("@/lib/model-encryption");
    vi.mocked(encryptJsonWithKey).mockClear();

    const data: Record<string, unknown> = { name: "Buy apartment" };
    requestImportConfig.encryptWithDek(data, FAKE_DEK);

    expect(encryptJsonWithKey).not.toHaveBeenCalled();
  });
});
