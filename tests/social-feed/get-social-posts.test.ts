/**
 * tests/social-feed/get-social-posts.test.ts
 *
 * Security and correctness tests for getSocialPosts():
 * - Tenant isolation: mandate.findMany must always be scoped to organizationId
 * - Entity type mapping: legacy "mandate"/"client" stored values are surfaced
 *   as the new "request"/"contact" terminology in the returned SocialPost objects
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
  mockMandateFindMany,
  mockPropertiesFindMany,
  mockContactFindMany,
} = vi.hoisted(() => {
  return {
    mockGetCurrentUserSafe: vi.fn(),
    mockGetCurrentOrgIdSafe: vi.fn(),
    mockSocialPostFindMany: vi.fn(),
    mockMandateFindMany: vi.fn(),
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
    mandate: {
      findMany: mockMandateFindMany,
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
    mockMandateFindMany.mockResolvedValue([]);
    mockPropertiesFindMany.mockResolvedValue([]);
    mockContactFindMany.mockResolvedValue([]);
  });

  // ---- 1. Tenant isolation: mandate.findMany includes organizationId ----

  it("filters linked requests (mandate) by organizationId for tenant isolation", async () => {
    // Arrange: one post linked to a request (stored as "request" type)
    mockSocialPostFindMany.mockResolvedValue([
      makePostRecord({
        linkedEntityId: "req-001",
        linkedEntityType: "request",
      }),
    ]);
    mockMandateFindMany.mockResolvedValue([
      { id: "req-001", friendlyId: "req-000001" },
    ]);

    const { getSocialPosts } = await import(
      "@/actions/social-feed/get-social-posts"
    );
    await getSocialPosts();

    // The mandate.findMany call MUST include organizationId for tenant isolation
    expect(mockMandateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-test",
        }),
      }),
    );
  });

  it("filters legacy 'mandate' linkedEntityType posts by organizationId", async () => {
    // Arrange: post stored with legacy "mandate" entity type
    mockSocialPostFindMany.mockResolvedValue([
      makePostRecord({
        linkedEntityId: "req-002",
        linkedEntityType: "mandate",
      }),
    ]);
    mockMandateFindMany.mockResolvedValue([
      { id: "req-002", friendlyId: "req-000002" },
    ]);

    const { getSocialPosts } = await import(
      "@/actions/social-feed/get-social-posts"
    );
    await getSocialPosts();

    expect(mockMandateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-test",
        }),
      }),
    );
  });

  // ---- 2. mandate.findMany is NOT called when there are no linked requests ----

  it("does not query mandate when no posts have linked requests", async () => {
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

    expect(mockMandateFindMany).not.toHaveBeenCalled();
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

  // ---- 4. Legacy "mandate" postType is mapped to "request" in returned type ----

  it("maps legacy 'mandate' postType to 'request' in returned SocialPost", async () => {
    mockSocialPostFindMany.mockResolvedValue([
      makePostRecord({ postType: "mandate" }),
    ]);

    const { getSocialPosts } = await import(
      "@/actions/social-feed/get-social-posts"
    );
    const result = await getSocialPosts();

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("request");
  });

  // ---- 5. Legacy "client" postType is mapped to "contact" in returned type ----

  it("maps legacy 'client' postType to 'contact' in returned SocialPost", async () => {
    mockSocialPostFindMany.mockResolvedValue([
      makePostRecord({ postType: "client" }),
    ]);

    const { getSocialPosts } = await import(
      "@/actions/social-feed/get-social-posts"
    );
    const result = await getSocialPosts();

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("contact");
  });

  // ---- 6. Legacy "mandate" linkedEntityType is mapped to "request" in linkedEntity ----

  it("maps legacy 'mandate' linkedEntityType to 'request' in returned linkedEntity", async () => {
    mockSocialPostFindMany.mockResolvedValue([
      makePostRecord({
        postType: "mandate",
        linkedEntityId: "req-003",
        linkedEntityType: "mandate",
      }),
    ]);
    mockMandateFindMany.mockResolvedValue([
      { id: "req-003", friendlyId: "req-000003" },
    ]);

    const { getSocialPosts } = await import(
      "@/actions/social-feed/get-social-posts"
    );
    const result = await getSocialPosts();

    expect(result).toHaveLength(1);
    expect(result[0].linkedEntity?.type).toBe("request");
  });
});
