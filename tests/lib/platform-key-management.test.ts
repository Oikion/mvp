// @ts-nocheck
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { encryptWithKey } from "@/lib/encryption";

const TEST_PLATFORM_KEY_HEX = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
const TEST_PLATFORM_KEY_BUF = Buffer.from(TEST_PLATFORM_KEY_HEX, "hex");

// Mock prismadb
const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockUpdateMany = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    platformEncryptionKey: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
      create: (...args: any[]) => mockCreate(...args),
      updateMany: (...args: any[]) => mockUpdateMany(...args),
    },
    $transaction: (...args: any[]) => mockTransaction(...args),
  },
}));

// Mock Redis cache
vi.mock("@/lib/redis", () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  cacheDel: vi.fn().mockResolvedValue(undefined),
}));

beforeAll(() => {
  vi.stubEnv("PLATFORM_ENCRYPTION_KEY", TEST_PLATFORM_KEY_HEX);
  // Required because decryptWithKey falls back to decrypt() which reads SECRETS_ENCRYPTION_KEY
  vi.stubEnv("SECRETS_ENCRYPTION_KEY", TEST_PLATFORM_KEY_HEX);
});

afterAll(() => {
  vi.unstubAllEnvs();
});

// Import after mocks are set up
const { getPlatformDek, rotatePlatformDek, _resetL1CacheForTesting } = await import("@/lib/platform-key-management");

describe("getPlatformDek", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetL1CacheForTesting();
  });

  it("creates a new platform DEK on first call when none exists", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockImplementation(({ data }: any) => ({
      id: "pk-1",
      encryptedDek: data.encryptedDek,
      keyVersion: 1,
      isActive: true,
    }));

    const dek = await getPlatformDek();

    expect(dek).toBeInstanceOf(Buffer);
    expect(dek.length).toBe(32);
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("returns existing DEK from database", async () => {
    // Create a real encrypted DEK to simulate the DB value
    const rawDek = Buffer.from("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "hex");
    const encryptedDek = encryptWithKey(rawDek.toString("hex"), TEST_PLATFORM_KEY_BUF);

    mockFindFirst.mockResolvedValue({
      id: "pk-1",
      encryptedDek,
      keyVersion: 1,
      isActive: true,
    });

    const dek = await getPlatformDek();

    expect(dek).toBeInstanceOf(Buffer);
    expect(dek.length).toBe(32);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("rotatePlatformDek", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetL1CacheForTesting();
  });

  it("creates new version and deactivates old", async () => {
    mockTransaction.mockImplementation(async (fn: any) => {
      return fn({
        platformEncryptionKey: {
          updateMany: mockUpdateMany.mockResolvedValue({ count: 1 }),
          create: mockCreate.mockResolvedValue({
            id: "pk-2",
            keyVersion: 2,
            isActive: true,
          }),
        },
      });
    });

    const newVersion = await rotatePlatformDek(1);

    expect(newVersion).toBe(2);

    // Verify cache was cleared
    const { cacheDel } = await import("@/lib/redis");
    expect(cacheDel).toHaveBeenCalledWith("oik:platform-dek");
  });
});
