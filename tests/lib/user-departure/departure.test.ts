import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// Mock prismadb
const mockUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
const mockDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
const mockFindUnique = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    users: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    organizationSettings: { findUnique: vi.fn().mockResolvedValue(null) },
    departureLog: { create: vi.fn().mockResolvedValue({ id: "dep-1" }) },
    notification: { deleteMany: (...args: unknown[]) => mockDeleteMany(...args) },
    eventInvitee: { deleteMany: (...args: unknown[]) => mockDeleteMany(...args) },
    // All org-data models use updateMany
    contact: { updateMany: mockUpdateMany },
    properties: { updateMany: mockUpdateMany },
    mandate: { updateMany: mockUpdateMany },
    deal: { updateMany: mockUpdateMany },
    documents: { updateMany: mockUpdateMany },
    calendarEvent: { updateMany: mockUpdateMany },
    socialPost: { updateMany: mockUpdateMany },
    crm_Accounts_Tasks: { updateMany: mockUpdateMany },
    feedback: { updateMany: mockUpdateMany },
    attachment: { updateMany: mockUpdateMany },
    message: { updateMany: mockUpdateMany },
    changelogEntry: { updateMany: mockUpdateMany },
    changelogBroadcast: { updateMany: mockUpdateMany },
    client_Contacts: { updateMany: mockUpdateMany },
    crm_Accounts_Tasks_Comments: { updateMany: mockUpdateMany },
    clientComment: { updateMany: mockUpdateMany },
    contactComment: { updateMany: mockUpdateMany },
    propertyComment: { updateMany: mockUpdateMany },
    mandateComment: { updateMany: mockUpdateMany },
    socialPostComment: { updateMany: mockUpdateMany },
    socialPostLike: { updateMany: mockUpdateMany },
    sharedEntity: { updateMany: mockUpdateMany },
    documentView: { updateMany: mockUpdateMany },
    property_Contacts: { updateMany: mockUpdateMany },
    referralCode: { updateMany: mockUpdateMany },
    referral: { updateMany: mockUpdateMany },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// Mock personal workspace guard
const mockIsOrgPersonal = vi.fn();
vi.mock("@/lib/personal-workspace-guard", () => ({
  isOrgPersonal: (...args: unknown[]) => mockIsOrgPersonal(...args),
}));

// Import after mocks
let handleUserDeparture: Awaited<typeof import("@/lib/user-departure")>["handleUserDeparture"];

beforeAll(async () => {
  ({ handleUserDeparture } = await import("@/lib/user-departure"));
});

beforeEach(() => {
  vi.clearAllMocks();
  mockFindUnique.mockResolvedValue({ id: "user-1", clerkUserId: "clerk-1" });
  mockIsOrgPersonal.mockResolvedValue(false);

  // Default: transaction returns array of updateMany results
  mockTransaction.mockImplementation(async (ops: unknown[]) => {
    if (Array.isArray(ops)) {
      return ops.map(() => ({ count: 0 }));
    }
    return [];
  });
});

describe("handleUserDeparture", () => {
  it("returns error if user not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await handleUserDeparture(
      "nonexistent",
      "org-1",
      "ACCOUNT_DELETED"
    );

    expect(result.errors).toContain("User not found");
    expect(result.nulledReferences).toBe(0);
  });

  it("blocks departure from personal workspace", async () => {
    mockIsOrgPersonal.mockResolvedValue(true);

    const result = await handleUserDeparture(
      "user-1",
      "personal-org",
      "LEFT_ORG"
    );

    expect(result.errors).toContain(
      "Cannot depart from a personal workspace"
    );
    // Should NOT have called any updateMany
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("calls nullifyOrgReferences and deletes personal data on success", async () => {
    // nullifyOrgReferences runs via $transaction — first call
    mockTransaction
      .mockResolvedValueOnce(
        // 30 updateMany results from nullifyOrgReferences
        Array(30).fill({ count: 1 })
      )
      .mockResolvedValueOnce([
        // Personal data deletion: notifications, invitees
        { count: 5 },
        { count: 2 },
      ]);

    const result = await handleUserDeparture(
      "user-1",
      "org-1",
      "ACCOUNT_DELETED"
    );

    expect(result.errors).toHaveLength(0);
    expect(result.nulledReferences).toBe(30);
    expect(result.deletedPersonalData).toBe(7);
    expect(result.reason).toBe("ACCOUNT_DELETED");
    expect(result.orgId).toBe("org-1");
  });
});
