# Entity-as-Channel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement entity-level Megolm session management, dual-mode (E2EE/Standard) comment encryption, and client-side entity comment encrypt/decrypt — Phase 2 of the Unified Encryption Architecture.

**Architecture:** Each entity (Client, Property, Mandate, Task) in an E2EE org gets its own Megolm session (entity-as-channel). The browser creates sessions, encrypts comments client-side, and shares session keys with authorized users. Standard orgs continue using server-side Layer 1 encryption. A server-side entity session service manages CRUD for `EntitySession`/`EntitySessionShare`/`EntitySessionBackup` records. Comment API routes branch on the org's `encryptionMode` to determine whether content arrives as ciphertext (E2EE) or plaintext (Standard, server-encrypts).

**Tech Stack:** Prisma ORM, Next.js API routes, Web Crypto API (Megolm), IndexedDB (idb), Vitest

**Spec:** `docs/superpowers/specs/2026-03-15-unified-encryption-architecture-design.md` (Sections 4–5, 9, 11 Phase 2)

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `lib/entity-session/types.ts` | `EntityType` literal union, service input/output interfaces |
| `lib/entity-session/encryption-mode.ts` | `getOrgEncryptionMode(orgId)` — cached lookup of immutable `encryptionMode` |
| `lib/entity-session/entity-session-service.ts` | Server-side CRUD for EntitySession, EntitySessionShare, EntitySessionBackup |
| `tests/lib/entity-session/encryption-mode.test.ts` | Tests for encryption mode helper |
| `tests/lib/entity-session/entity-session-service.test.ts` | Tests for entity session service |
| `app/api/e2ee/entity-sessions/route.ts` | GET active session + share for user; POST create new session |
| `app/api/e2ee/entity-sessions/[sessionId]/shares/route.ts` | POST create share for a user (granting access) |
| `app/api/e2ee/entity-sessions/[sessionId]/rotate/route.ts` | POST rotate session (on revocation / message limit) |
| `lib/e2ee/entity-comments.ts` | Client-side orchestrator: create entity session, encrypt/decrypt comments via Megolm |

### Modified Files

| File | Changes |
|------|---------|
| `lib/e2ee/session-store.ts` | Add `storeEntityMegolmOutbound`, `getEntityMegolmOutbound`, `deleteEntityMegolmOutbound` using `entity:<type>:<id>` key prefix. Entity inbound sessions reuse `storeMegolmInbound`/`getMegolmInbound` (sessionIds are globally unique UUIDs, no collision risk). |
| `lib/e2ee/index.ts` | Re-export entity comment functions from `entity-comments.ts` |
| `lib/model-encryption.ts` | Add `encryptClientCommentForOrg`, `decryptClientCommentForOrg`, `encryptTaskCommentForOrg`, `decryptTaskCommentForOrg` (delegates to `encryptMessageForOrg`) |
| `app/api/crm/clients/[clientId]/comments/route.ts` | Fix missing L1 encryption on POST + add E2EE dual-mode |
| `app/api/mls/properties/[propertyId]/comments/route.ts` | Add E2EE dual-mode to POST and GET |
| `app/api/mandates/[mandateId]/comments/route.ts` | Add E2EE dual-mode to POST and GET |
| `app/api/crm/tasks/addCommentToTask/[taskId]/route.ts` | Fix missing L1 encryption on POST + add E2EE dual-mode |

---

## Chunk 1: Server-Side Services

### Task 1: Create entity session types

**Files:**
- Create: `lib/entity-session/types.ts`

- [ ] **Step 1: Create types file**

```typescript
// lib/entity-session/types.ts

/** Entity types that support E2EE sessions */
export type EntityType = "CLIENT" | "PROPERTY" | "MANDATE" | "TASK";

/** Input for creating a new entity session */
export interface CreateEntitySessionInput {
  entityType: EntityType;
  entityId: string;
  orgId: string;
  megolmSessionId: string;
  /** Megolm session export encrypted for creator's identity public key */
  creatorShare: {
    userId: string;
    encryptedSession: string;
  };
  /** Megolm session export encrypted with ORK (for admin recovery) */
  orkBackup: string;
  /** Additional user shares (e.g., assigned agent already has access) */
  additionalShares?: Array<{
    userId: string;
    encryptedSession: string;
    startingIndex: number;
  }>;
}

/** Input for adding a session share (granting access) */
export interface CreateSessionShareInput {
  entitySessionId: string;
  userId: string;
  encryptedSession: string;
  startingIndex: number;
}

/** Input for session rotation (on access revocation or message limit) */
export interface RotateEntitySessionInput {
  entityType: EntityType;
  entityId: string;
  orgId: string;
  /** New Megolm session ID (generated client-side) */
  newMegolmSessionId: string;
  /** Shares for all remaining authorized users */
  shares: Array<{
    userId: string;
    encryptedSession: string;
  }>;
  /** New ORK backup */
  orkBackup: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/entity-session/types.ts
git commit -m "feat: add entity session type definitions"
```

---

### Task 2: Create encryption mode helper (TDD)

**Files:**
- Create: `lib/entity-session/encryption-mode.ts`
- Create: `tests/lib/entity-session/encryption-mode.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/entity-session/encryption-mode.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/lib/entity-session/encryption-mode.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement encryption mode helper**

```typescript
// lib/entity-session/encryption-mode.ts
import { prismadb } from "@/lib/prisma";
import { EncryptionMode } from "@prisma/client";

/**
 * In-process cache for org encryption modes.
 * Since encryptionMode is immutable after org creation, we can cache aggressively.
 */
const cache = new Map<string, { mode: EncryptionMode; ts: number }>();
const TTL = 10 * 60 * 1000; // 10 min (immutable, so long TTL is safe)

/**
 * Get the encryption mode for an organization.
 * Returns STANDARD if no settings exist (default).
 */
export async function getOrgEncryptionMode(
  orgId: string
): Promise<EncryptionMode> {
  const cached = cache.get(orgId);
  if (cached && Date.now() - cached.ts < TTL) return cached.mode;

  const settings = await prismadb.organizationSettings.findUnique({
    where: { organizationId: orgId },
    select: { encryptionMode: true },
  });

  const mode = settings?.encryptionMode ?? EncryptionMode.STANDARD;
  cache.set(orgId, { mode, ts: Date.now() });
  return mode;
}

/**
 * Check if an organization uses E2EE mode.
 */
export async function isE2EEOrg(orgId: string): Promise<boolean> {
  return (await getOrgEncryptionMode(orgId)) === EncryptionMode.E2EE;
}

/** Reset cache — for testing only */
export function _resetCacheForTesting(): void {
  cache.clear();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/lib/entity-session/encryption-mode.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/entity-session/encryption-mode.ts tests/lib/entity-session/encryption-mode.test.ts
git commit -m "feat: add org encryption mode helper with caching"
```

---

### Task 3: Write entity session service tests (TDD red)

**Files:**
- Create: `tests/lib/entity-session/entity-session-service.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
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

    const result = await getEntitySessionShareForUser("CLIENT", "client-1", "user-1");

    expect(result).toBeTruthy();
    expect(result?.encryptedSession).toBe("encrypted-for-user-1");
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/lib/entity-session/entity-session-service.test.ts`
Expected: FAIL — module not found

---

### Task 4: Implement entity session service (TDD green)

**Files:**
- Create: `lib/entity-session/entity-session-service.ts`

- [ ] **Step 1: Implement entity session service**

```typescript
// lib/entity-session/entity-session-service.ts
import { prismadb } from "@/lib/prisma";
import type {
  CreateEntitySessionInput,
  CreateSessionShareInput,
  RotateEntitySessionInput,
  EntityType,
} from "./types";

/**
 * Create a new entity session with creator's share and ORK backup.
 * Called when: first comment on an entity in E2EE org, or entity creation in E2EE org.
 */
export async function createEntitySession(input: CreateEntitySessionInput) {
  const {
    entityType,
    entityId,
    orgId,
    megolmSessionId,
    creatorShare,
    orkBackup,
    additionalShares,
  } = input;

  const ops = [
    prismadb.entitySession.create({
      data: {
        entityType,
        entityId,
        megolmSessionId,
        orgId,
      },
    }),
    // Create share will reference the session by its generated id,
    // but since we're using $transaction with an array (not interactive),
    // we need to use a nested create or handle differently.
    // Actually, array transactions don't allow cross-referencing.
    // We need an interactive transaction instead.
  ];

  // Use interactive transaction to get the session ID for related records
  return prismadb.$transaction(async (tx) => {
    const session = await tx.entitySession.create({
      data: {
        entityType,
        entityId,
        megolmSessionId,
        orgId,
      },
    });

    // Creator's share
    await tx.entitySessionShare.create({
      data: {
        entitySessionId: session.id,
        userId: creatorShare.userId,
        encryptedSession: creatorShare.encryptedSession,
        startingIndex: 0,
      },
    });

    // ORK backup
    await tx.entitySessionBackup.create({
      data: {
        entitySessionId: session.id,
        encryptedSession: orkBackup,
      },
    });

    // Additional shares (e.g., assigned agent)
    if (additionalShares?.length) {
      for (const share of additionalShares) {
        await tx.entitySessionShare.create({
          data: {
            entitySessionId: session.id,
            userId: share.userId,
            encryptedSession: share.encryptedSession,
            startingIndex: share.startingIndex,
          },
        });
      }
    }

    return session;
  });
}

/**
 * Get the active entity session for an entity.
 * Returns null if no session exists (Standard org or not yet created).
 */
export async function getActiveEntitySession(
  entityType: EntityType,
  entityId: string
) {
  return prismadb.entitySession.findFirst({
    where: {
      entityType,
      entityId,
      isActive: true,
    },
  });
}

/**
 * Get the active session for an entity WITH the specified user's share.
 * Returns the session with the user's share populated, or null.
 */
export async function getEntitySessionShareForUser(
  entityType: EntityType,
  entityId: string,
  userId: string
) {
  const session = await prismadb.entitySession.findFirst({
    where: {
      entityType,
      entityId,
      isActive: true,
    },
    include: {
      shares: {
        where: { userId },
      },
    },
  });

  if (!session || session.shares.length === 0) return null;

  return {
    ...session,
    share: session.shares[0],
  };
}

/**
 * Create a session share for a user (granting access to entity's E2EE comments).
 * Called by the granting user's browser.
 */
export async function createSessionShare(input: CreateSessionShareInput) {
  return prismadb.entitySessionShare.create({
    data: {
      entitySessionId: input.entitySessionId,
      userId: input.userId,
      encryptedSession: input.encryptedSession,
      startingIndex: input.startingIndex,
    },
  });
}

/**
 * Rotate an entity session: deactivate old, create new with fresh shares + backup.
 * Triggers: access revocation, 100-message limit, admin manual rotation.
 */
export async function rotateEntitySession(input: RotateEntitySessionInput) {
  const { entityType, entityId, orgId, newMegolmSessionId, shares, orkBackup } =
    input;

  // Find current active session
  const currentSession = await prismadb.entitySession.findFirst({
    where: { entityType, entityId, isActive: true },
  });

  if (!currentSession) {
    throw new Error(
      `No active session to rotate for ${entityType}:${entityId}`
    );
  }

  const newVersion = currentSession.version + 1;

  return prismadb.$transaction(async (tx) => {
    // Deactivate old session
    await tx.entitySession.update({
      where: { id: currentSession.id },
      data: { isActive: false, rotatedAt: new Date() },
    });

    // Create new session
    const newSession = await tx.entitySession.create({
      data: {
        entityType,
        entityId,
        megolmSessionId: newMegolmSessionId,
        version: newVersion,
        orgId,
      },
    });

    // Create shares for remaining authorized users
    for (const share of shares) {
      await tx.entitySessionShare.create({
        data: {
          entitySessionId: newSession.id,
          userId: share.userId,
          encryptedSession: share.encryptedSession,
          startingIndex: 0, // New session starts at 0
        },
      });
    }

    // Create ORK backup
    await tx.entitySessionBackup.create({
      data: {
        entitySessionId: newSession.id,
        encryptedSession: orkBackup,
      },
    });

    return newSession;
  });
}

/**
 * Delete all entity sessions (and cascading shares + backups) for an entity.
 * Called when an entity is deleted.
 */
export async function deleteEntitySessionsForEntity(
  entityType: EntityType,
  entityId: string
) {
  return prismadb.entitySession.deleteMany({
    where: { entityType, entityId },
  });
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm vitest run tests/lib/entity-session/entity-session-service.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add lib/entity-session/entity-session-service.ts tests/lib/entity-session/entity-session-service.test.ts
git commit -m "feat: implement entity session service with CRUD operations"
```

---

### Task 5: Add missing comment encryption helpers to model-encryption.ts

**Files:**
- Modify: `lib/model-encryption.ts` (after the PropertyComment section, ~line 390)

- [ ] **Step 1: Add ClientComment and TaskComment helpers**

Add after the PropertyComment section (line ~390):

```typescript
// ─────────────────────────────────────────────
// ClientComment (content field)
// Note: ClientComment has no organizationId — pass the parent client's orgId.
// Delegates to Message helpers (same {content?: string | null} shape).
// ─────────────────────────────────────────────

export async function encryptClientCommentForOrg<T extends MessageWithContent>(
  data: T,
  orgId: string
): Promise<T> {
  return encryptMessageForOrg(data, orgId);
}

export async function decryptClientCommentForOrg<T extends MessageWithContent>(
  record: T,
  orgId: string
): Promise<T> {
  return decryptMessageForOrg(record, orgId);
}

// ─────────────────────────────────────────────
// TaskComment (comment field — note: field name is "comment", not "content")
// crm_Accounts_Tasks_Comments uses "comment" as the text field.
// We wrap it into a content-compatible shape for the Message helpers.
// ─────────────────────────────────────────────

type TaskCommentWithComment = { comment?: string | null; [key: string]: any };

export async function encryptTaskCommentForOrg<T extends TaskCommentWithComment>(
  data: T,
  orgId: string
): Promise<T> {
  if (data.comment == null) return data;
  const wrapped = { content: data.comment } as MessageWithContent;
  const encrypted = await encryptMessageForOrg(wrapped, orgId);
  return { ...data, comment: encrypted.content } as T;
}

export async function decryptTaskCommentForOrg<T extends TaskCommentWithComment>(
  record: T,
  orgId: string
): Promise<T> {
  if (record.comment == null) return record;
  const wrapped = { content: record.comment } as MessageWithContent;
  const decrypted = await decryptMessageForOrg(wrapped, orgId);
  return { ...record, comment: decrypted.content } as T;
}
```

- [ ] **Step 2: Run lint to verify no issues**

Run: `pnpm lint`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add lib/model-encryption.ts
git commit -m "feat: add missing ClientComment and TaskComment encryption helpers"
```

---

### Task 6: Test comment encryption helpers

**Files:**
- Create: `tests/lib/model-encryption-comments.test.ts`

- [ ] **Step 1: Write tests for the new helpers**

```typescript
// tests/lib/model-encryption-comments.test.ts
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

const TEST_KEY_HEX = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
const TEST_KEY_BUF = Buffer.from(TEST_KEY_HEX, "hex");

// Mock key management to return a known DEK
vi.mock("@/lib/key-management", () => ({
  getOrgDek: vi.fn().mockResolvedValue(Buffer.from(TEST_KEY_HEX, "hex")),
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
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm vitest run tests/lib/model-encryption-comments.test.ts`
Expected: 4 tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/lib/model-encryption-comments.test.ts
git commit -m "test: add tests for ClientComment and TaskComment encryption helpers"
```

---

### Task 7: Commit chunk 1 — run all new tests together

- [ ] **Step 1: Run all entity-session and model-encryption tests**

Run: `pnpm vitest run tests/lib/entity-session/ tests/lib/model-encryption-comments.test.ts`
Expected: All tests PASS

---

## Chunk 2: Entity Session API Routes

### Task 8: Create entity session API route (GET/POST)

**Files:**
- Create: `app/api/e2ee/entity-sessions/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/e2ee/entity-sessions/route.ts
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { isE2EEOrg } from "@/lib/entity-session/encryption-mode";
import {
  createEntitySession,
  getEntitySessionShareForUser,
} from "@/lib/entity-session/entity-session-service";
import type { EntityType } from "@/lib/entity-session/types";

const VALID_ENTITY_TYPES = new Set(["CLIENT", "PROPERTY", "MANDATE", "TASK"]);

/**
 * GET /api/e2ee/entity-sessions?entityType=CLIENT&entityId=xxx
 * Get the active session + user's share for an entity.
 * Returns null fields if no session exists (lazy initialization).
 */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const orgId = await getCurrentOrgId();

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType") as EntityType;
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId || !VALID_ENTITY_TYPES.has(entityType)) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    if (!(await isE2EEOrg(orgId))) {
      return NextResponse.json(
        { error: "Entity sessions are only available for E2EE organizations" },
        { status: 400 }
      );
    }

    const result = await getEntitySessionShareForUser(
      entityType,
      entityId,
      user.id
    );

    if (!result) {
      return NextResponse.json({
        session: null,
        share: null,
      });
    }

    return NextResponse.json({
      session: {
        id: result.id,
        megolmSessionId: result.megolmSessionId,
        version: result.version,
        entityType: result.entityType,
        entityId: result.entityId,
      },
      share: {
        id: result.share.id,
        encryptedSession: result.share.encryptedSession,
        startingIndex: result.share.startingIndex,
      },
    });
  } catch (error) {
    console.error("[ENTITY_SESSIONS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch entity session" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/e2ee/entity-sessions
 * Create a new entity session (called by browser after entity creation or first comment).
 * Body: { entityType, entityId, megolmSessionId, creatorShare, orkBackup, additionalShares? }
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const orgId = await getCurrentOrgId();

    if (!(await isE2EEOrg(orgId))) {
      return NextResponse.json(
        { error: "Entity sessions are only available for E2EE organizations" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      entityType,
      entityId,
      megolmSessionId,
      creatorEncryptedSession,
      orkBackup,
      additionalShares,
    } = body;

    if (
      !entityType ||
      !entityId ||
      !megolmSessionId ||
      !creatorEncryptedSession ||
      !orkBackup
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!VALID_ENTITY_TYPES.has(entityType)) {
      return NextResponse.json(
        { error: "Invalid entity type" },
        { status: 400 }
      );
    }

    // Guard: reject if an active session already exists (prevents race condition duplicates)
    const existing = await prismadb.entitySession.findFirst({
      where: { entityType, entityId, isActive: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Active session already exists for this entity", sessionId: existing.id },
        { status: 409 }
      );
    }

    const session = await createEntitySession({
      entityType,
      entityId,
      orgId,
      megolmSessionId,
      creatorShare: {
        userId: user.id,
        encryptedSession: creatorEncryptedSession,
      },
      orkBackup,
      additionalShares,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("[ENTITY_SESSIONS_POST]", error);
    return NextResponse.json(
      { error: "Failed to create entity session" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/e2ee/entity-sessions/route.ts
git commit -m "feat: add entity session GET/POST API route"
```

---

### Task 9: Create entity session share API route

**Files:**
- Create: `app/api/e2ee/entity-sessions/[sessionId]/shares/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/e2ee/entity-sessions/[sessionId]/shares/route.ts
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { isE2EEOrg } from "@/lib/entity-session/encryption-mode";
import { createSessionShare } from "@/lib/entity-session/entity-session-service";

/**
 * POST /api/e2ee/entity-sessions/[sessionId]/shares
 * Create a share for a user (granting access to entity E2EE comments).
 * Called by the granting user's browser with the session encrypted for the recipient's public key.
 * Body: { userId, encryptedSession, startingIndex }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const orgId = await getCurrentOrgId();
    const { sessionId } = await params;

    if (!(await isE2EEOrg(orgId))) {
      return NextResponse.json(
        { error: "Entity sessions are only available for E2EE organizations" },
        { status: 400 }
      );
    }

    // Verify the session exists and belongs to the user's org
    const session = await prismadb.entitySession.findFirst({
      where: { id: sessionId, orgId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Entity session not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { userId: recipientId, encryptedSession, startingIndex } = body;

    if (!recipientId || !encryptedSession || startingIndex === undefined) {
      return NextResponse.json(
        { error: "userId, encryptedSession, and startingIndex are required" },
        { status: 400 }
      );
    }

    const share = await createSessionShare({
      entitySessionId: sessionId,
      userId: recipientId,
      encryptedSession,
      startingIndex,
    });

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    console.error("[ENTITY_SESSION_SHARES_POST]", error);
    return NextResponse.json(
      { error: "Failed to create session share" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/e2ee/entity-sessions/\[sessionId\]/shares/route.ts
git commit -m "feat: add entity session share creation API route"
```

---

### Task 10: Create entity session rotation API route

**Files:**
- Create: `app/api/e2ee/entity-sessions/[sessionId]/rotate/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/e2ee/entity-sessions/[sessionId]/rotate/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { isE2EEOrg } from "@/lib/entity-session/encryption-mode";
import { rotateEntitySession } from "@/lib/entity-session/entity-session-service";
import type { EntityType } from "@/lib/entity-session/types";
import { prismadb } from "@/lib/prisma";

/**
 * POST /api/e2ee/entity-sessions/[sessionId]/rotate
 * Rotate an entity session: deactivate old, create new with fresh shares.
 * Triggered by: access revocation, 100-message limit, admin manual rotation.
 * Body: { newMegolmSessionId, shares: [{ userId, encryptedSession }], orkBackup }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const orgId = await getCurrentOrgId();
    const { sessionId } = await params;

    if (!(await isE2EEOrg(orgId))) {
      return NextResponse.json(
        { error: "Entity sessions are only available for E2EE organizations" },
        { status: 400 }
      );
    }

    // Verify session exists and belongs to org
    const currentSession = await prismadb.entitySession.findFirst({
      where: { id: sessionId, orgId, isActive: true },
    });

    if (!currentSession) {
      return NextResponse.json(
        { error: "Active entity session not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { newMegolmSessionId, shares, orkBackup } = body;

    if (!newMegolmSessionId || !shares?.length || !orkBackup) {
      return NextResponse.json(
        { error: "newMegolmSessionId, shares, and orkBackup are required" },
        { status: 400 }
      );
    }

    const newSession = await rotateEntitySession({
      entityType: currentSession.entityType as EntityType,
      entityId: currentSession.entityId,
      orgId,
      newMegolmSessionId,
      shares,
      orkBackup,
    });

    return NextResponse.json({
      session: newSession,
      rotatedFromVersion: currentSession.version,
    });
  } catch (error) {
    console.error("[ENTITY_SESSION_ROTATE_POST]", error);
    return NextResponse.json(
      { error: "Failed to rotate entity session" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/e2ee/entity-sessions/\[sessionId\]/rotate/route.ts
git commit -m "feat: add entity session rotation API route"
```

---

### Task 11: Run lint on new API routes

- [ ] **Step 1: Verify no lint errors in new files**

Run: `pnpm lint`
Expected: No new errors (pre-existing warnings OK)

---

## Chunk 3: Client-Side E2EE Entity Comment Module

### Task 12: Extend session-store.ts for entity sessions

**Files:**
- Modify: `lib/e2ee/session-store.ts`

- [ ] **Step 1: Add entity session storage methods**

Add after the existing `deleteMegolmInbound` function (line ~170), before `clearAllSessions`:

```typescript
// ─── Entity Megolm Sessions (entity-as-channel) ─────────

/**
 * Store a Megolm outbound session for an entity.
 * Key format: entity:<entityType>:<entityId> (prevents collisions with channel sessions).
 */
export async function storeEntityMegolmOutbound(
  entityType: string,
  entityId: string,
  serialized: string,
  kek: ArrayBuffer
): Promise<void> {
  const db = await getDB();
  const key = `entity:${entityType}:${entityId}`;
  const entry = await encryptForStorage(`megolm-out:${key}`, serialized, kek);
  await db.put(MEGOLM_OUTBOUND_STORE, entry);
}

/**
 * Retrieve a Megolm outbound session for an entity.
 */
export async function getEntityMegolmOutbound(
  entityType: string,
  entityId: string,
  kek: ArrayBuffer
): Promise<string | null> {
  const db = await getDB();
  const key = `entity:${entityType}:${entityId}`;
  const entry = await db.get(MEGOLM_OUTBOUND_STORE, `megolm-out:${key}`) as EncryptedEntry | undefined;
  if (!entry) return null;
  return decryptFromStorage(entry, kek);
}

/**
 * Delete a Megolm outbound session for an entity (on rotation).
 */
export async function deleteEntityMegolmOutbound(
  entityType: string,
  entityId: string
): Promise<void> {
  const db = await getDB();
  const key = `entity:${entityType}:${entityId}`;
  await db.delete(MEGOLM_OUTBOUND_STORE, `megolm-out:${key}`);
}

// Note: Entity inbound sessions reuse storeMegolmInbound/getMegolmInbound directly
// since Megolm sessionIds are globally unique UUIDs — no key prefix needed.
```

- [ ] **Step 2: Commit**

```bash
git add lib/e2ee/session-store.ts
git commit -m "feat: add entity session storage methods to IndexedDB session store"
```

---

### Task 13: Create entity-comments.ts (client-side orchestrator)

**Files:**
- Create: `lib/e2ee/entity-comments.ts`

This is a `"use client"` module that orchestrates entity-level Megolm encrypt/decrypt. It talks to the entity-sessions API and uses the session-store for IndexedDB persistence.

- [ ] **Step 1: Create the entity comments module**

```typescript
// lib/e2ee/entity-comments.ts
"use client";

import { MegolmOutbound, MegolmInbound } from "./megolm";
import {
  storeEntityMegolmOutbound,
  getEntityMegolmOutbound,
  deleteEntityMegolmOutbound,
  storeMegolmInbound,
  getMegolmInbound,
} from "./session-store";

// ─── Types ───────────────────────────────────

type EntityType = "CLIENT" | "PROPERTY" | "MANDATE" | "TASK";

interface EncryptedCommentPayload {
  /** Combined "iv:ciphertext" string (both Base64). Server stores this as-is in the content field. */
  content: string;
  entitySessionId: string; // Megolm session ID (for server storage)
  messageIndex: number;    // Megolm ratchet index
}

interface EntitySessionResponse {
  session: {
    id: string;
    megolmSessionId: string;
    version: number;
    entityType: string;
    entityId: string;
  } | null;
  share: {
    id: string;
    encryptedSession: string;
    startingIndex: number;
  } | null;
}

// ─── In-Memory Caches ────────────────────────
// Keyed by "entity:<entityType>:<entityId>"

const _entityOutCache = new Map<string, MegolmOutbound>();
const _entityInCache = new Map<string, MegolmInbound>();

function entityKey(entityType: EntityType, entityId: string): string {
  return `entity:${entityType}:${entityId}`;
}

// ─── State ───────────────────────────────────
// KEK and identity key are managed by lib/e2ee/index.ts.
// This module receives them as parameters to avoid circular imports.

// ─── Public API ──────────────────────────────

/**
 * Encrypt a comment for an entity.
 * Loads or creates the entity's Megolm outbound session.
 *
 * @param entityType - "CLIENT" | "PROPERTY" | "MANDATE" | "TASK"
 * @param entityId - The entity's database ID
 * @param plaintext - Comment text to encrypt
 * @param kek - PIN-derived KEK (raw ArrayBuffer)
 * @returns Encrypted payload to POST to server
 */
export async function encryptEntityComment(
  entityType: EntityType,
  entityId: string,
  plaintext: string,
  kek: ArrayBuffer,
): Promise<EncryptedCommentPayload> {
  const key = entityKey(entityType, entityId);
  let session = _entityOutCache.get(key);

  if (!session) {
    // Try IndexedDB
    const serialized = await getEntityMegolmOutbound(entityType, entityId, kek);
    if (serialized) {
      session = MegolmOutbound.deserialize(serialized);
      _entityOutCache.set(key, session);
    }
  }

  // Check rotation
  if (session?.needsRotation()) {
    // Clear outbound — will be replaced after rotation API call
    await deleteEntityMegolmOutbound(entityType, entityId);
    _entityOutCache.delete(key);
    session = undefined;
  }

  if (!session) {
    // No session — caller must create one via the entity-sessions API first.
    // This is a programming error; the UI flow should ensure sessions exist.
    throw new Error(
      `No Megolm outbound session for ${entityType}:${entityId}. ` +
      `Call initEntitySession() first.`
    );
  }

  const payload = await session.encrypt(plaintext);

  // Persist updated session state (ratchet advanced)
  await storeEntityMegolmOutbound(entityType, entityId, session.serialize(), kek);

  // Combine iv:ciphertext into a single string for storage in the DB content field.
  // The server stores this opaque string as-is; only the client can split and decrypt.
  return {
    content: `${payload.iv}:${payload.ciphertext}`,
    entitySessionId: payload.sessionId,
    messageIndex: payload.messageIndex,
  };
}

/**
 * Decrypt a comment from an entity.
 * Loads the Megolm inbound session for the given sessionId.
 * The encryptedContent is the combined "iv:ciphertext" string stored in the DB.
 *
 * @param sessionId - The Megolm session ID (from comment.entitySessionId)
 * @param messageIndex - The ratchet index (from comment.messageIndex)
 * @param encryptedContent - Combined "iv:ciphertext" string (from comment.content)
 * @param kek - PIN-derived KEK (raw ArrayBuffer)
 * @returns Decrypted plaintext
 */
export async function decryptEntityComment(
  sessionId: string,
  messageIndex: number,
  encryptedContent: string,
  kek: ArrayBuffer,
): Promise<string> {
  // Split the combined iv:ciphertext format
  const colonIndex = encryptedContent.indexOf(":");
  if (colonIndex === -1) {
    throw new Error("Invalid encrypted content format — expected iv:ciphertext");
  }
  const iv = encryptedContent.slice(0, colonIndex);
  const ciphertext = encryptedContent.slice(colonIndex + 1);

  let session = _entityInCache.get(sessionId);

  if (!session) {
    // Try IndexedDB
    const serialized = await getMegolmInbound(sessionId, kek);
    if (!serialized) {
      throw new Error(
        `No Megolm inbound session for sessionId ${sessionId}. ` +
        `Fetch and import the session share first.`
      );
    }
    session = MegolmInbound.deserialize(serialized);
    _entityInCache.set(sessionId, session);
  }

  const plaintext = await session.decrypt(messageIndex, ciphertext, iv);

  // Persist updated state
  await storeMegolmInbound(sessionId, session.serialize(), kek);

  return plaintext;
}

/**
 * Initialize an entity's Megolm outbound session.
 * Creates a new MegolmOutbound, stores in IndexedDB, and returns
 * the session export to send to the server (for EntitySession + shares + backup).
 *
 * @returns sessionId, sessionExport (to send to entity-sessions API)
 */
export async function initEntitySession(
  entityType: EntityType,
  entityId: string,
  kek: ArrayBuffer,
): Promise<{
  sessionId: string;
  sessionExport: { sessionId: string; targetId: string; ratchetKey: string; messageIndex: number };
}> {
  const key = entityKey(entityType, entityId);
  const session = await MegolmOutbound.create(key);

  _entityOutCache.set(key, session);
  await storeEntityMegolmOutbound(entityType, entityId, session.serialize(), kek);

  return {
    sessionId: session.sessionId,
    sessionExport: session.exportSession(),
  };
}

/**
 * Import an entity's Megolm inbound session from a decrypted share.
 * Called after fetching the user's EntitySessionShare from the server
 * and decrypting it with the user's identity private key.
 */
export async function importEntitySession(
  sessionExport: { sessionId: string; targetId: string; ratchetKey: string; messageIndex: number },
  kek: ArrayBuffer,
): Promise<void> {
  const session = MegolmInbound.fromExport(sessionExport);
  _entityInCache.set(sessionExport.sessionId, session);
  await storeMegolmInbound(sessionExport.sessionId, session.serialize(), kek);
}

/**
 * Clear all entity session caches (called on lock/logout).
 */
export function clearEntitySessionCaches(): void {
  _entityOutCache.clear();
  _entityInCache.clear();
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/e2ee/entity-comments.ts
git commit -m "feat: add client-side entity comment encrypt/decrypt orchestrator"
```

---

### Task 14: Extend e2ee/index.ts to export entity comment functions

**Files:**
- Modify: `lib/e2ee/index.ts`

- [ ] **Step 1: Add imports and re-exports**

At the top of `lib/e2ee/index.ts`, add this import (after the existing session-store import, line ~41):

```typescript
import {
  encryptEntityComment as _encryptEntityComment,
  decryptEntityComment as _decryptEntityComment,
  initEntitySession as _initEntitySession,
  importEntitySession as _importEntitySession,
  clearEntitySessionCaches,
} from "./entity-comments";
import type { EntityType } from "../entity-session/types";
```

Add the following functions AFTER the existing `// ─── Group/Channel Encryption (Megolm) ────────` section (after `needsGroupRotation`, ~line 313), before `// ─── Attachments`:

```typescript
// ─── Entity Comment Encryption (Megolm) ──────

/**
 * Initialize a Megolm session for an entity (first comment or entity creation in E2EE org).
 * Returns session data to POST to /api/e2ee/entity-sessions.
 */
export async function initEntitySession(
  entityType: "CLIENT" | "PROPERTY" | "MANDATE" | "TASK",
  entityId: string,
) {
  assertUnlocked();
  return _initEntitySession(entityType, entityId, _kekRaw!);
}

/**
 * Import an entity Megolm inbound session from a decrypted session share.
 */
export async function importEntitySession(
  sessionExport: { sessionId: string; targetId: string; ratchetKey: string; messageIndex: number },
) {
  assertUnlocked();
  return _importEntitySession(sessionExport, _kekRaw!);
}

/**
 * Encrypt a comment for an entity using its Megolm session.
 * Session must be initialized first via initEntitySession().
 */
export async function encryptEntityComment(
  entityType: "CLIENT" | "PROPERTY" | "MANDATE" | "TASK",
  entityId: string,
  plaintext: string,
) {
  assertUnlocked();
  return _encryptEntityComment(entityType, entityId, plaintext, _kekRaw!);
}

/**
 * Decrypt an entity comment using the Megolm session identified by sessionId.
 * encryptedContent is the combined "iv:ciphertext" string from the DB.
 */
export async function decryptEntityComment(
  sessionId: string,
  messageIndex: number,
  encryptedContent: string,
) {
  assertUnlocked();
  return _decryptEntityComment(sessionId, messageIndex, encryptedContent, _kekRaw!);
}
```

Update the `lock()` function (~line 145) to also clear entity caches:

```typescript
export function lock(): void {
  _kekRaw = null;
  _identityKeyPair = null;
  _userId = null;
  _ratchetCache.clear();
  _megolmOutCache.clear();
  _megolmInCache.clear();
  clearEntitySessionCaches();
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/e2ee/index.ts
git commit -m "feat: expose entity comment encrypt/decrypt in E2EE public API"
```

---

### Task 15: Run lint on all client-side changes

- [ ] **Step 1: Verify no lint errors**

Run: `pnpm lint`
Expected: No new errors

---

## Chunk 4: Comment Route Dual-Mode + Bug Fixes

### Task 16: Fix ClientComment POST (missing encryption + dual-mode)

**Files:**
- Modify: `app/api/crm/clients/[clientId]/comments/route.ts`

**Context:** The current POST handler stores plaintext content (line 176). This is a bug — Standard orgs should Layer 1 encrypt. E2EE orgs should accept client-side ciphertext.

- [ ] **Step 1: Update imports at top of file**

Replace line 4:
```typescript
import { decryptMessageForOrg } from "@/lib/model-encryption";
```
with:
```typescript
import {
  encryptClientCommentForOrg,
  decryptClientCommentForOrg,
} from "@/lib/model-encryption";
import { getOrgEncryptionMode } from "@/lib/entity-session/encryption-mode";
import { EncryptionMode } from "@prisma/client";
```

- [ ] **Step 2: Update POST handler to dual-mode (lines 120-191)**

First, move the content length check (lines 121-126) AFTER the E2EE mode check — ciphertext is larger than plaintext so the 2000-char limit should only apply to Standard orgs. Replace lines 121-126 and 170-191 with:

```typescript
    // Determine encryption mode for this org
    const encryptionMode = await getOrgEncryptionMode(organizationId);
    const isE2EE = encryptionMode === EncryptionMode.E2EE;

    let commentContent: string;
    let entitySessionId: string | null = null;
    let messageIndex: number | null = null;

    if (isE2EE) {
      // E2EE: client sends pre-encrypted content (iv:ciphertext) + session metadata.
      // Skip server-side length validation — ciphertext is larger than plaintext.
      // Plaintext length is validated client-side before encryption.
      const { entitySessionId: sid, messageIndex: idx } = body;
      if (!sid || idx === undefined) {
        return NextResponse.json(
          { error: "entitySessionId and messageIndex required for E2EE orgs" },
          { status: 400 }
        );
      }
      commentContent = content.trim(); // Already ciphertext (iv:ciphertext format)
      entitySessionId = sid;
      messageIndex = idx;
    } else {
      // Standard: server-side Layer 1 encryption
      const { content: encrypted } = await encryptClientCommentForOrg(
        { content: content.trim() },
        organizationId
      );
      commentContent = encrypted ?? content.trim();
    }

    // Create comment
    const comment = await prismadb.clientComment.create({
      data: {
        id: crypto.randomUUID(),
        clientId,
        userId: user.id,
        content: commentContent,
        entitySessionId,
        messageIndex,
        updatedAt: new Date(),
      },
      include: {
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // For Standard orgs, decrypt before returning to client
    const responseComment = isE2EE
      ? comment
      : await decryptClientCommentForOrg(comment, organizationId);

    return NextResponse.json(
      { comment: { ...responseComment, user: comment.Users } },
      { status: 201 }
    );
```

- [ ] **Step 3: Update GET handler to dual-mode (lines 73-80)**

Replace the decrypt + return block (lines 73-80) with:

```typescript
    const encryptionMode = await getOrgEncryptionMode(organizationId);
    const isE2EE = encryptionMode === EncryptionMode.E2EE;

    if (isE2EE) {
      // E2EE: return ciphertext + session metadata — client decrypts
      return NextResponse.json({
        comments: comments.map((c) => ({
          ...c,
          user: c.Users,
        })),
        encryptionMode: "E2EE",
      });
    }

    // Standard: server-side decryption
    const decryptedComments = await Promise.all(
      comments.map((c) => decryptClientCommentForOrg(c, organizationId))
    );

    return NextResponse.json({
      comments: decryptedComments.map((c) => ({ ...c, user: (c as any).Users })),
      encryptionMode: "STANDARD",
    });
```

- [ ] **Step 4: Commit**

```bash
git add app/api/crm/clients/\[clientId\]/comments/route.ts
git commit -m "fix: add missing encryption to ClientComment POST + add E2EE dual-mode"
```

---

### Task 17: Update PropertyComment route for dual-mode

**Files:**
- Modify: `app/api/mls/properties/[propertyId]/comments/route.ts`

**Context:** PropertyComment POST already encrypts with Layer 1 (correct). Add E2EE branch.

- [ ] **Step 1: Add imports**

Add after the existing model-encryption import (line 4):
```typescript
import { getOrgEncryptionMode } from "@/lib/entity-session/encryption-mode";
import { EncryptionMode } from "@prisma/client";
```

- [ ] **Step 2: Update POST handler**

In the POST handler, after determining `propertyOrgId` and before the comment creation block, add the E2EE branch:

```typescript
    const encryptionMode = await getOrgEncryptionMode(propertyOrgId);
    const isE2EE = encryptionMode === EncryptionMode.E2EE;

    let commentContent: string;
    let entitySessionId: string | null = null;
    let messageIndex: number | null = null;

    if (isE2EE) {
      const { entitySessionId: sid, messageIndex: idx } = body;
      if (!sid || idx === undefined) {
        return NextResponse.json(
          { error: "entitySessionId and messageIndex required for E2EE orgs" },
          { status: 400 }
        );
      }
      commentContent = content.trim();
      entitySessionId = sid;
      messageIndex = idx;
    } else {
      const { content: encryptedContent } = await encryptPropertyCommentForOrg(
        { content: content.trim() },
        propertyOrgId
      );
      commentContent = encryptedContent ?? content.trim();
    }
```

Update the `prismadb.propertyComment.create()` data to include `entitySessionId` and `messageIndex`:

```typescript
      data: {
        id: crypto.randomUUID(),
        propertyId,
        userId: user.id,
        content: commentContent,
        entitySessionId,
        messageIndex,
        updatedAt: new Date(),
      },
```

Update the response to skip decryption for E2EE:

```typescript
    const responseComment = isE2EE
      ? comment
      : await decryptPropertyCommentForOrg(comment, propertyOrgId);
```

- [ ] **Step 3: Update GET handler similarly**

Add the encryption mode check before the decrypt loop. For E2EE, return raw ciphertext + metadata. For Standard, continue decrypting server-side.

- [ ] **Step 4: Commit**

```bash
git add app/api/mls/properties/\[propertyId\]/comments/route.ts
git commit -m "feat: add E2EE dual-mode to PropertyComment API route"
```

---

### Task 18: Update MandateComment route for dual-mode

**Files:**
- Modify: `app/api/mandates/[mandateId]/comments/route.ts`

**Context:** Same pattern as PropertyComment — already encrypts with Layer 1. Add E2EE branch.

- [ ] **Step 1: Add imports**

Add after existing model-encryption import:
```typescript
import { getOrgEncryptionMode } from "@/lib/entity-session/encryption-mode";
import { EncryptionMode } from "@prisma/client";
```

- [ ] **Step 2: Update POST handler**

Apply same dual-mode pattern as Task 17:
- Check `encryptionMode` via `getOrgEncryptionMode(organizationId)`
- E2EE: accept `entitySessionId` + `messageIndex` from body, store ciphertext as-is
- Standard: use existing `encryptMandateCommentForOrg()` path
- Include `entitySessionId` and `messageIndex` in create data
- Skip decryption in response for E2EE

- [ ] **Step 3: Update GET handler**

Same dual-mode pattern: E2EE returns raw ciphertext, Standard continues server-side decryption.

- [ ] **Step 4: Commit**

```bash
git add app/api/mandates/\[mandateId\]/comments/route.ts
git commit -m "feat: add E2EE dual-mode to MandateComment API route"
```

---

### Task 19: Fix TaskComment POST (missing encryption + dual-mode)

**Files:**
- Modify: `app/api/crm/tasks/addCommentToTask/[taskId]/route.ts`

**Context:** Task comment POST stores plaintext (line 56: `comment: cappedComment`). Bug — needs Layer 1 encryption for Standard orgs, E2EE acceptance for E2EE orgs.

- [ ] **Step 1: Add imports**

Add after existing imports (line 7):
```typescript
import { encryptTaskCommentForOrg } from "@/lib/model-encryption";
import { getOrgEncryptionMode } from "@/lib/entity-session/encryption-mode";
import { EncryptionMode } from "@prisma/client";
```

- [ ] **Step 2: Update POST handler comment creation (lines 38-61)**

First, update the capping logic (line 38) to only cap for Standard orgs — truncating ciphertext corrupts E2EE content. Move the cap inside the Standard branch. Replace lines 38 and 53-61:
```typescript
    const newComment = await prismadb.crm_Accounts_Tasks_Comments.create({
      data: {
        id: crypto.randomUUID(),
        comment: cappedComment,
        crm_account_task: taskId,
        user: user.id,
        organizationId,
      },
    });
```

With:
```typescript
    const encryptionMode = await getOrgEncryptionMode(organizationId);
    const isE2EE = encryptionMode === EncryptionMode.E2EE;

    let commentContent: string;
    let entitySessionId: string | null = null;
    let messageIndex: number | null = null;

    if (isE2EE) {
      // E2EE: content is ciphertext — don't truncate (client validates plaintext length)
      const { entitySessionId: sid, messageIndex: idx } = body;
      if (!sid || idx === undefined) {
        return NextResponse.json(
          { error: "entitySessionId and messageIndex required for E2EE orgs" },
          { status: 400 }
        );
      }
      commentContent = typeof comment === "string" ? comment : comment;
      entitySessionId = sid;
      messageIndex = idx;
    } else {
      // Standard: cap at 2000 chars then encrypt server-side
      const cappedComment = typeof comment === "string" ? comment.slice(0, 2000) : comment;
      const { comment: encrypted } = await encryptTaskCommentForOrg(
        { comment: cappedComment },
        organizationId
      );
      commentContent = encrypted ?? cappedComment;
    }

    const newComment = await prismadb.crm_Accounts_Tasks_Comments.create({
      data: {
        id: crypto.randomUUID(),
        comment: commentContent,
        entitySessionId,
        messageIndex,
        crm_account_task: taskId,
        user: user.id,
        organizationId,
      },
    });
```

- [ ] **Step 3: Commit**

```bash
git add app/api/crm/tasks/addCommentToTask/\[taskId\]/route.ts
git commit -m "fix: add missing encryption to TaskComment POST + add E2EE dual-mode"
```

---

### Task 20: Final verification

- [ ] **Step 1: Run all new and existing tests**

Run: `pnpm vitest run tests/lib/entity-session/ tests/lib/model-encryption-comments.test.ts`
Expected: All tests PASS

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`
Expected: All new tests pass. Pre-existing failures (encryption.test.ts, departure.test.ts) unchanged.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: No new errors

- [ ] **Step 4: Run build**

Run: `pnpm build`
Expected: No new type errors from our changes (pre-existing canvas issue may remain)

- [ ] **Step 5: Verify git status is clean**

Run: `git status`
Expected: All changes committed

---

## Summary

| Chunk | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 | 1–7 | Server-side entity session service, encryption mode helper, missing comment encryption helpers |
| 2 | 8–11 | Entity session API routes (GET/POST sessions, shares, rotation) |
| 3 | 12–15 | Client-side E2EE entity comment module (IndexedDB, Megolm orchestration, e2ee/index.ts) |
| 4 | 16–20 | Comment route dual-mode (all 4 entity types) + 2 bug fixes (ClientComment, TaskComment missing encryption) |
