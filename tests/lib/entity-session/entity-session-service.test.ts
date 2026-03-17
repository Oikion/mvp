// tests/lib/entity-session/entity-session-service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prismadb
const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDeleteMany = vi.fn();
const mockShareCreate = vi.fn();
const mockShareDeleteMany = vi.fn();
const mockBackupCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    entitySession: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
      findMany: (...args: any[]) => mockFindMany(...args),
      create: (...args: any[]) => mockCreate(...args),
      update: (...args: any[]) => mockUpdate(...args),
      deleteMany: (...args: any[]) => mockDeleteMany(...args),
    },
    entitySessionShare: {
      create: (...args: any[]) => mockShareCreate(...args),
      deleteMany: (...args: any[]) => mockShareDeleteMany(...args),
    },
    entitySessionBackup: {
      create: (...args: any[]) => mockBackupCreate(...args),
    },
    $transaction: (...args: any[]) => mockTransaction(...args),
  },
}));

const {
  createEntitySession,
  getActiveEntitySession,
  getEntitySessionShareForUser,
  createSessionShare,
  rotateEntitySession,
  deleteEntitySessionsForEntity,
} = await import("@/lib/entity-session/entity-session-service");

describe("createEntitySession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Interactive transaction mock — passes a mock tx client to the callback
    mockTransaction.mockImplementation(async (fn: any) => {
      return fn({
        entitySession: {
          create: mockCreate.mockResolvedValue({
            id: "es-1",
            entityType: "CLIENT",
            entityId: "client-1",
            megolmSessionId: "megolm-abc",
            version: 1,
            isActive: true,
            orgId: "org-1",
          }),
        },
        entitySessionShare: {
          create: mockShareCreate.mockResolvedValue({}),
        },
        entitySessionBackup: {
          create: mockBackupCreate.mockResolvedValue({}),
        },
      });
    });
  });

  it("creates session + creator share + backup in a transaction", async () => {
    await createEntitySession({
      entityType: "CLIENT",
      entityId: "client-1",
      orgId: "org-1",
      megolmSessionId: "megolm-abc",
      creatorShare: {
        userId: "user-1",
        encryptedSession: "encrypted-export-for-user-1",
      },
      orkBackup: "encrypted-export-for-ork",
    });

    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledOnce(); // Session create
    expect(mockShareCreate).toHaveBeenCalledOnce(); // Creator share
    expect(mockBackupCreate).toHaveBeenCalledOnce(); // ORK backup
  });
});

describe("getActiveEntitySession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns active session for entity", async () => {
    const session = {
      id: "es-1",
      entityType: "CLIENT",
      entityId: "client-1",
      megolmSessionId: "megolm-abc",
      version: 1,
      isActive: true,
    };
    mockFindFirst.mockResolvedValue(session);

    const result = await getActiveEntitySession("CLIENT", "client-1");

    expect(result).toEqual(session);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        entityType: "CLIENT",
        entityId: "client-1",
        isActive: true,
      },
    });
  });

  it("returns null when no active session exists", async () => {
    mockFindFirst.mockResolvedValue(null);
    const result = await getActiveEntitySession("PROPERTY", "prop-1");
    expect(result).toBeNull();
  });
});

describe("getEntitySessionShareForUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the user's share for the active entity session", async () => {
    // First, getActiveEntitySession is called internally
    mockFindFirst.mockResolvedValue({
      id: "es-1",
      entityType: "CLIENT",
      entityId: "client-1",
      isActive: true,
      shares: [
        {
          id: "share-1",
          userId: "user-1",
          encryptedSession: "encrypted-for-user-1",
          startingIndex: 0,
        },
      ],
    });

    const result = await getEntitySessionShareForUser("CLIENT", "client-1", "user-1", "org-1");

    expect(result).toBeTruthy();
    expect(result?.encryptedSession).toBe("encrypted-for-user-1");
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orgId: "org-1" }),
      })
    );
  });

  it("returns null when session belongs to a different org", async () => {
    mockFindFirst.mockResolvedValue(null);
    const result = await getEntitySessionShareForUser("CLIENT", "client-1", "user-1", "different-org");
    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orgId: "different-org" }),
      })
    );
  });
});

describe("rotateEntitySession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Current active session exists
    mockFindFirst.mockResolvedValue({
      id: "es-1",
      version: 1,
      isActive: true,
    });
    // Interactive transaction mock
    mockTransaction.mockImplementation(async (fn: any) => {
      return fn({
        entitySession: {
          update: mockUpdate.mockResolvedValue({}),
          create: mockCreate.mockResolvedValue({
            id: "es-2",
            version: 2,
            isActive: true,
          }),
        },
        entitySessionShare: {
          create: mockShareCreate.mockResolvedValue({}),
        },
        entitySessionBackup: {
          create: mockBackupCreate.mockResolvedValue({}),
        },
      });
    });
  });

  it("deactivates old session and creates new one with shares + backup", async () => {
    await rotateEntitySession({
      entityType: "CLIENT",
      entityId: "client-1",
      orgId: "org-1",
      newMegolmSessionId: "megolm-new",
      shares: [
        { userId: "user-1", encryptedSession: "enc-1" },
        { userId: "user-2", encryptedSession: "enc-2" },
      ],
      orkBackup: "ork-backup-new",
    });

    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(mockUpdate).toHaveBeenCalledOnce(); // Deactivate old session
    expect(mockCreate).toHaveBeenCalledOnce(); // Create new session
    expect(mockShareCreate).toHaveBeenCalledTimes(2); // 2 user shares
    expect(mockBackupCreate).toHaveBeenCalledOnce(); // ORK backup
  });
});

describe("deleteEntitySessionsForEntity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes all sessions for an entity (cascade deletes shares + backups)", async () => {
    mockDeleteMany.mockResolvedValue({ count: 2 });

    await deleteEntitySessionsForEntity("CLIENT", "client-1");

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: {
        entityType: "CLIENT",
        entityId: "client-1",
      },
    });
  });
});
