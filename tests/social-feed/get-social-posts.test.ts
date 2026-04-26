/**
 * tests/social-feed/get-social-posts.test.ts
 *
 * Security and correctness tests for getSocialPosts():
 * - Tenant isolation: request.findMany must always be scoped to organizationId
 *
 * All external dependencies (Prisma, Clerk auth) are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Shared mock values via vi.hoisted() (factories are hoisted before imports)
// ---------------------------------------------------------------------------

const {
  mockGetCurrentUserSafe,
  mockGetCurrentOrgIdSafe,
  mockSocialPostFindMany,
  mockRequestFindMany,
  mockPropertiesFindMany,
  mockContactFindMany,
} = vi.hoisted(() => {
  return {
    mockGetCurrentUserSafe: vi.fn(),
    mockGetCurrentOrgIdSafe: vi.fn(),
    mockSocialPostFindMany: vi.fn(),
    mockRequestFindMany: vi.fn(),
    mockPropertiesFindMany: vi.fn(),
    mockContactFindMany: vi.fn(),
  };
});

vi.mock("@/lib/get-current-user", () => ({
  getCurrentUserSafe: mockGetCurrentUserSafe,
  getCurrentOrgIdSafe: mockGetCurrentOrgIdSafe,
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    agentConnection: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    agentProfile: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    socialPost: {
      findMany: mockSocialPostFindMany,
    },
    request: {
      findMany: mockRequestFindMany,
    },
    properties: {
      findMany: mockPropertiesFindMany,
    },
    contact: {
      findMany: mockContactFindMany,
    },
  },
}));

// ---------------------------------------------------------------------------
// Helper — minimal SocialPost DB record shape
// ---------------------------------------------------------------------------

function makePostRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "post-001",
    slug: null,
    postType: "text",
    content: "Hello world",
    createdAt: new Date("2026-01-01T10:00:00Z"),
    authorId: "user-001",
    organizationId: "org-test",
    linkedEntityId: null,
    linkedEntityType: null,
    attachments: [],
    comments: [],
    reactions: [],
    _count: { comments: 0, reactions: 0 },
    author: {
      id: "user-001",
      clerkUserId: "clerk-001",
      first_name: "Alice",
      last_name: "Smith",
      imageUrl: null,
      agentProfile: null,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getSocialPosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated user in org-test
    mockGetCurrentUserSafe.mockResolvedValue({
      id: "user-001",
      clerkUserId: "clerk-001",
    });
    mockGetCurrentOrgIdSafe.mockResolvedValue("org-test");

    // Default: no posts, no linked entities
    mockSocialPostFindMany.mockResolvedValue([]);
    mockRequestFindMany.mockResolvedValue([]);
    mockPropertiesFindMany.mockResolvedValue([]);
    mockContactFindMany.mockResolvedValue([]);
  });

  // ---- 1. Tenant isolation: request.findMany includes organizationId ----

  it("filters linked requests by organizationId for tenant isolation", async () => {
    mockSocialPostFindMany.mockResolvedValue([
      makePostRecord({
        linkedEntityId: "req-001",
        linkedEntityType: "request",
      }),
    ]);
    mockRequestFindMany.mockResolvedValue([
      { id: "req-001", friendlyId: "req-000001" },
    ]);

    const { getSocialPosts } = await import(
      "@/actions/social-feed/get-social-posts"
    );
    await getSocialPosts();

    // request.findMany MUST include organizationId for tenant isolation
    expect(mockRequestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-test",
        }),
      }),
    );
  });

  // ---- 2. request.findMany is NOT called when there are no linked requests ----

  it("does not query request when no posts have linked requests", async () => {
    mockSocialPostFindMany.mockResolvedValue([
      makePostRecord({ linkedEntityType: "property", linkedEntityId: "prop-001" }),
    ]);
    mockPropertiesFindMany.mockResolvedValue([
      { id: "prop-001", friendlyId: "prp-000001" },
    ]);

    const { getSocialPosts } = await import(
      "@/actions/social-feed/get-social-posts"
    );
    await getSocialPosts();

    expect(mockRequestFindMany).not.toHaveBeenCalled();
  });

  // ---- 3. Returns empty array when unauthenticated ----

  it("returns empty array when user is not authenticated", async () => {
    mockGetCurrentUserSafe.mockResolvedValue(null);
    mockGetCurrentOrgIdSafe.mockResolvedValue(null);

    const { getSocialPosts } = await import(
      "@/actions/social-feed/get-social-posts"
    );
    const result = await getSocialPosts();

    expect(result).toEqual([]);
    expect(mockSocialPostFindMany).not.toHaveBeenCalled();
  });

});
