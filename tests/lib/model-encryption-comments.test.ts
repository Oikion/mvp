// tests/lib/model-encryption-comments.test.ts
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

const TEST_KEY_HEX = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

// Mock key management to return a known DEK
vi.mock("@/lib/key-management", () => ({
  getOrgDek: vi.fn().mockResolvedValue(Buffer.from("abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789", "hex")),
}));

// Mock Redis
vi.mock("@/lib/redis", () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  cacheDel: vi.fn().mockResolvedValue(undefined),
}));

beforeAll(() => {
  vi.stubEnv("SECRETS_ENCRYPTION_KEY", TEST_KEY_HEX);
});

afterAll(() => {
  vi.unstubAllEnvs();
});

const {
  encryptClientCommentForOrg,
  decryptClientCommentForOrg,
  encryptTaskCommentForOrg,
  decryptTaskCommentForOrg,
} = await import("@/lib/model-encryption");

describe("encryptClientCommentForOrg / decryptClientCommentForOrg", () => {
  it("round-trips client comment content", async () => {
    const original = { content: "Hello from client comment" };
    const encrypted = await encryptClientCommentForOrg(original, "org-1");
    expect(encrypted.content).not.toBe("Hello from client comment");

    const decrypted = await decryptClientCommentForOrg(encrypted, "org-1");
    expect(decrypted.content).toBe("Hello from client comment");
  });

  it("passes through null content", async () => {
    const data = { content: null };
    const result = await encryptClientCommentForOrg(data, "org-1");
    expect(result.content).toBeNull();
  });
});

describe("encryptTaskCommentForOrg / decryptTaskCommentForOrg", () => {
  it("round-trips task comment field", async () => {
    const original = { comment: "Task progress update" };
    const encrypted = await encryptTaskCommentForOrg(original, "org-1");
    expect(encrypted.comment).not.toBe("Task progress update");

    const decrypted = await decryptTaskCommentForOrg(encrypted, "org-1");
    expect(decrypted.comment).toBe("Task progress update");
  });

  it("passes through null comment", async () => {
    const data = { comment: null };
    const result = await encryptTaskCommentForOrg(data, "org-1");
    expect(result.comment).toBeNull();
  });
});
