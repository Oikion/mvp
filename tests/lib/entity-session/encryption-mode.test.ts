// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EncryptionMode } from "@prisma/client";

const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    organizationSettings: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
  },
}));

const { getOrgEncryptionMode, isE2EEOrg, _resetCacheForTesting } = await import(
  "@/lib/entity-session/encryption-mode"
);

describe("getOrgEncryptionMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetCacheForTesting();
  });

  it("returns STANDARD when no settings exist", async () => {
    mockFindUnique.mockResolvedValue(null);
    const mode = await getOrgEncryptionMode("org-1");
    expect(mode).toBe(EncryptionMode.STANDARD);
  });

  it("returns the org's encryption mode from DB", async () => {
    mockFindUnique.mockResolvedValue({ encryptionMode: EncryptionMode.E2EE });
    const mode = await getOrgEncryptionMode("org-2");
    expect(mode).toBe(EncryptionMode.E2EE);
  });

  it("caches the result — second call skips DB", async () => {
    mockFindUnique.mockResolvedValue({ encryptionMode: EncryptionMode.E2EE });
    await getOrgEncryptionMode("org-3");
    await getOrgEncryptionMode("org-3");
    expect(mockFindUnique).toHaveBeenCalledOnce();
  });
});

describe("isE2EEOrg", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetCacheForTesting();
  });

  it("returns true for E2EE org", async () => {
    mockFindUnique.mockResolvedValue({ encryptionMode: EncryptionMode.E2EE });
    expect(await isE2EEOrg("org-e2ee")).toBe(true);
  });

  it("returns false for STANDARD org", async () => {
    mockFindUnique.mockResolvedValue({ encryptionMode: EncryptionMode.STANDARD });
    expect(await isE2EEOrg("org-std")).toBe(false);
  });
});
