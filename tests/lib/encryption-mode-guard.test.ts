import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prismadb before importing the module under test
vi.mock("@/lib/prisma", () => ({
  prismadb: {
    organizationSettings: {
      findUnique: vi.fn(),
    },
  },
}));

import { assertEncryptionModeUnchanged } from "@/lib/encryption-mode-guard";
import { prismadb } from "@/lib/prisma";

const mockFindUnique = vi.mocked(prismadb.organizationSettings.findUnique);

describe("assertEncryptionModeUnchanged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when update does not include encryptionMode", async () => {
    await expect(
      assertEncryptionModeUnchanged("org-1", { dataOwnershipMode: "AGENCY" })
    ).resolves.toBeUndefined();

    // Should NOT query the database — no need to check
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("does nothing when org has no existing settings (new org)", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(
      assertEncryptionModeUnchanged("org-1", { encryptionMode: "E2EE" })
    ).resolves.toBeUndefined();
  });

  it("does nothing when setting the same mode as existing", async () => {
    mockFindUnique.mockResolvedValue({ encryptionMode: "E2EE" } as any);

    await expect(
      assertEncryptionModeUnchanged("org-1", { encryptionMode: "E2EE" })
    ).resolves.toBeUndefined();
  });

  it("throws when attempting to change encryptionMode", async () => {
    mockFindUnique.mockResolvedValue({ encryptionMode: "STANDARD" } as any);

    await expect(
      assertEncryptionModeUnchanged("org-1", { encryptionMode: "E2EE" })
    ).rejects.toThrow("Encryption mode cannot be changed after organization creation");
  });

  it("throws when downgrading from E2EE to STANDARD", async () => {
    mockFindUnique.mockResolvedValue({ encryptionMode: "E2EE" } as any);

    await expect(
      assertEncryptionModeUnchanged("org-1", { encryptionMode: "STANDARD" })
    ).rejects.toThrow("Encryption mode cannot be changed after organization creation");
  });
});
