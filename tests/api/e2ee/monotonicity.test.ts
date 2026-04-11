// tests/api/e2ee/monotonicity.test.ts
// Tests for messageIndex monotonicity enforcement in client comments POST route

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// ---------------------------------------------------------------------------
// Mock prismadb — must be hoisted before any module imports that use it
// ---------------------------------------------------------------------------
const mockClientsFind = vi.fn();
const mockEntitySessionFind = vi.fn();
const mockEntitySessionUpdateMany = vi.fn();
const mockClientCommentCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    contact: {
      findFirst: (...args: any[]) => mockClientsFind(...args),
    },
    entitySession: {
      findFirst: (...args: any[]) => mockEntitySessionFind(...args),
      updateMany: (...args: any[]) => mockEntitySessionUpdateMany(...args),
    },
    contactComment: {
      create: (...args: any[]) => mockClientCommentCreate(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock auth helpers
// ---------------------------------------------------------------------------
vi.mock("@/lib/get-current-user", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: "user-1", name: "Test User" }),
  getCurrentOrgId: vi.fn().mockResolvedValue("org-1"),
}));

// ---------------------------------------------------------------------------
// Mock encryption helpers — return content unchanged (not testing encryption)
// ---------------------------------------------------------------------------
vi.mock("@/lib/model-encryption", () => ({
  encryptContactCommentForOrg: vi.fn().mockImplementation(async (data: any) => data),
  decryptContactCommentForOrg: vi.fn().mockImplementation(async (data: any) => data),
}));

// ---------------------------------------------------------------------------
// Mock encryption mode — E2EE by default for all monotonicity tests
// ---------------------------------------------------------------------------
vi.mock("@/lib/entity-session/encryption-mode", () => ({
  getOrgEncryptionMode: vi.fn().mockResolvedValue("E2EE"),
}));

// ---------------------------------------------------------------------------
// Import the route AFTER all mocks are registered
// ---------------------------------------------------------------------------
let POST: typeof import("@/app/api/crm/clients/[clientId]/comments/route").POST;
beforeAll(async () => {
  ({ POST } = await import("@/app/api/crm/clients/[clientId]/comments/route"));
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/crm/clients/client-1/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(clientId = "client-1") {
  return { params: Promise.resolve({ clientId }) };
}

const DUMMY_COMMENT = {
  id: "cmt-1",
  clientId: "client-1",
  userId: "user-1",
  content: "iv:ciphertext",
  entitySessionId: "sess-1",
  messageIndex: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
  Users: { id: "user-1", name: "Test User", email: "t@t.com", avatar: null },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("messageIndex monotonicity — client comments POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: client belongs to the org
    mockClientsFind.mockResolvedValue({ id: "client-1", client_name: "Acme" });

    // Default: session ownership check passes
    mockEntitySessionFind.mockResolvedValue({ id: "sess-1" });

    // Default: comment creation succeeds
    mockClientCommentCreate.mockResolvedValue(DUMMY_COMMENT);
  });

  it("accepts a comment when updateMany returns count 1 (valid index)", async () => {
    mockEntitySessionUpdateMany.mockResolvedValue({ count: 1 });

    const req = makeRequest({
      content: "iv:ciphertext",
      entitySessionId: "sess-1",
      messageIndex: 5,
    });

    const res = await POST(req, makeParams());

    expect(res.status).not.toBe(400);
    const json = await res.json();
    expect(json.error).toBeUndefined();
    expect(json.comment).toBeDefined();
  });

  it("rejects a replay when updateMany returns count 0 (non-monotonic index)", async () => {
    mockEntitySessionUpdateMany.mockResolvedValue({ count: 0 });

    const req = makeRequest({
      content: "iv:ciphertext",
      entitySessionId: "sess-1",
      messageIndex: 3, // simulates a replayed / stale index
    });

    const res = await POST(req, makeParams());

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/not monotonically increasing/i);
  });

  it("accepts a first comment when lastMessageIndex is null (updateMany returns count 1)", async () => {
    // Simulates the very first message on a fresh session (lastMessageIndex IS null in DB).
    // The WHERE clause includes `{ lastMessageIndex: null }`, so updateMany matches and
    // returns count 1.
    mockEntitySessionUpdateMany.mockResolvedValue({ count: 1 });

    const req = makeRequest({
      content: "iv:ciphertext",
      entitySessionId: "sess-1",
      messageIndex: 0, // first message
    });

    const res = await POST(req, makeParams());

    expect(res.status).not.toBe(400);
    const json = await res.json();
    expect(json.error).toBeUndefined();
    expect(json.comment).toBeDefined();

    // Confirm updateMany was called with the null-tolerant WHERE clause
    expect(mockEntitySessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ lastMessageIndex: null }),
          ]),
        }),
        data: { lastMessageIndex: 0 },
      })
    );
  });
});
