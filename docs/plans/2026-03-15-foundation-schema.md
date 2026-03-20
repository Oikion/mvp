# Unified Encryption — Plan 1: Foundation + Schema

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all Prisma models, enums, and server-side services needed for the unified encryption architecture (Phase 1 from spec).

**Architecture:** New `EncryptionMode` enum on `OrganizationSettings` (immutable after creation). Six new Prisma models (`EntitySession`, `EntitySessionShare`, `EntitySessionBackup`, `OrgRecoveryKey`, `RecoveryCode`, `PiiAccessLog`, `PlatformEncryptionKey`). Two new server-side services (`lib/platform-key-management.ts`, `lib/pii-access-log.ts`). Org creation flow updated to accept encryption mode. Comment tables gain nullable E2EE metadata columns.

**Tech Stack:** Prisma (PostgreSQL), TypeScript, Vitest, Next.js server actions

**Spec:** `docs/superpowers/specs/2026-03-15-unified-encryption-architecture-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `lib/encryption-mode-guard.ts` | Immutability guard — rejects updates to `encryptionMode` after org creation |
| `lib/platform-key-management.ts` | Platform-wide DEK lifecycle (get, rotate) for FeedbackComment / AgentContactSubmission |
| `lib/pii-access-log.ts` | Append-only audit logging for all Layer 1 PII decryption events |
| `tests/lib/encryption-mode-guard.test.ts` | Tests for immutability guard |
| `tests/lib/platform-key-management.test.ts` | Tests for platform key management |
| `tests/lib/pii-access-log.test.ts` | Tests for PII access logging |

### Modified Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `EncryptionMode` enum, 7 new models, nullable columns on 4 comment tables, `pendingSessionReshare` on `UserIdentityKey` |
| `actions/organization/create-organization.ts` | Accept `encryptionMode` param, upsert `OrganizationSettings` after Clerk org creation |
| `actions/organization/ensure-personal-workspace.ts` | Upsert `OrganizationSettings` with `STANDARD` mode on personal workspace creation |
| `lib/env.ts` | Add `PLATFORM_ENCRYPTION_KEY` to validation schema |
| `tests/env-validation.test.ts` | Add test for new env var |

---

## Chunk 1: Prisma Schema Changes + Migration

### Task 1: Add EncryptionMode Enum + OrganizationSettings Field

**Files:**
- Modify: `prisma/schema.prisma:1553-1556` (after `DataOwnershipMode` enum)
- Modify: `prisma/schema.prisma:2869-2876` (inside `OrganizationSettings`)

- [ ] **Step 1: Add EncryptionMode enum**

Add after the `DataOwnershipMode` enum (line 1556 in `prisma/schema.prisma`):

```prisma
enum EncryptionMode {
  STANDARD // Layer 1 (server-side) encryption only
  E2EE     // Full end-to-end encryption for comments, messages, files
}
```

- [ ] **Step 2: Add encryptionMode field to OrganizationSettings**

Add after the `createdBy` field (line 2868) and before the `// Data Ownership Policy` comment (line 2870):

```prisma
  // Encryption Mode — set at org creation, IMMUTABLE after that.
  // Application-layer guard in lib/encryption-mode-guard.ts rejects any update.
  encryptionMode EncryptionMode @default(STANDARD)
```

- [ ] **Step 3: Commit schema changes**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add EncryptionMode enum and field on OrganizationSettings"
```

---

### Task 2: Add Entity Session Models

**Files:**
- Modify: `prisma/schema.prisma` (add after `OrgEncryptionKey` model, ~line 2948)

- [ ] **Step 1: Add EntitySession model**

Add after the `OrgEncryptionKey` model closing brace (line 2948):

```prisma
// ============================================
// E2EE ENTITY SESSIONS — Entity-as-Channel Megolm
// ============================================

/// Each entity (Client/Property/Mandate/Task) in an E2EE org has its own
/// Megolm session, conceptually identical to Matrix/Element encrypted rooms.
/// Cleanup: when an entity is deleted, the delete route must also delete
/// all EntitySession rows matching (entityType, entityId).
model EntitySession {
  id              String               @id @default(uuid())
  entityType      String               // "CLIENT" | "PROPERTY" | "MANDATE" | "TASK"
  entityId        String
  megolmSessionId String               @unique // Megolm session identifier (distinct from row id)
  version         Int                  @default(1)
  isActive        Boolean              @default(true) // false after rotation
  createdAt       DateTime             @default(now())
  rotatedAt       DateTime?
  orgId           String

  shares          EntitySessionShare[]
  backups         EntitySessionBackup[]

  @@unique([entityType, entityId, version])
  @@index([entityType, entityId, isActive])
  @@index([orgId])
}
```

- [ ] **Step 2: Add EntitySessionShare model**

Add immediately after the `EntitySession` model:

```prisma
/// Per-user copy of an entity's Megolm session, encrypted with the user's
/// identity public key. startingIndex records the Megolm message index at
/// the time the share was created — the user can decrypt from this index onward.
model EntitySessionShare {
  id               String        @id @default(uuid())
  entitySessionId  String
  userId           String
  encryptedSession String        @db.Text // Megolm export encrypted for user's identity public key
  startingIndex    Int           @default(0)
  createdAt        DateTime      @default(now())

  entitySession    EntitySession @relation(fields: [entitySessionId], references: [id], onDelete: Cascade)

  @@unique([entitySessionId, userId])
  @@index([userId])
}
```

- [ ] **Step 3: Add EntitySessionBackup model**

Add immediately after the `EntitySessionShare` model:

```prisma
/// ORK-encrypted backup of an entity's Megolm session.
/// Backups for ALL session versions are kept (not just active).
/// During admin recovery or data export, the admin traverses all versions
/// (ordered by EntitySession.version ASC) to decrypt the full comment history.
model EntitySessionBackup {
  id               String        @id @default(uuid())
  entitySessionId  String        @unique
  encryptedSession String        @db.Text // Megolm export encrypted with ORK
  createdAt        DateTime      @default(now())

  entitySession    EntitySession @relation(fields: [entitySessionId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add EntitySession, EntitySessionShare, EntitySessionBackup models"
```

---

### Task 3: Add Recovery Models

**Files:**
- Modify: `prisma/schema.prisma` (add after `EntitySessionBackup`)

- [ ] **Step 1: Add OrgRecoveryKey model**

```prisma
// ============================================
// E2EE ORG RECOVERY — Admin recovery codes
// ============================================

/// Per-E2EE-org recovery key. The ORK is a random 32-byte key that encrypts
/// backup copies of ALL entity session keys. It is wrapped by the admin's
/// PIN-derived KEK. On admin transfer, the outgoing admin re-wraps with the
/// new admin's KEK.
model OrgRecoveryKey {
  id              String         @id @default(uuid())
  orgId           String         @unique
  wrappedOrk      String         @db.Text // ORK encrypted with admin's PIN-derived KEK
  wrappedByUserId String                  // Admin userId who holds the KEK-wrapped copy
  salt            String                  // Salt used for admin's KEK derivation of ORK wrap
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  codes           RecoveryCode[]
}
```

- [ ] **Step 2: Add RecoveryCode model**

```prisma
/// Single-use recovery codes for E2EE orgs. 8 codes generated at setup,
/// each wrapping the ORK with PBKDF2(code, salt). On use, code is consumed
/// and cannot be reused. When < 3 remain, admin sees regeneration prompt.
model RecoveryCode {
  id            String          @id @default(uuid())
  recoveryKeyId String
  codeHash      String          // bcrypt hash of the plaintext code
  wrappedOrk    String          @db.Text // ORK encrypted with PBKDF2(code, salt)
  salt          String
  used          Boolean         @default(false)
  usedAt        DateTime?
  createdAt     DateTime        @default(now())

  recoveryKey   OrgRecoveryKey  @relation(fields: [recoveryKeyId], references: [id], onDelete: Cascade)

  @@index([recoveryKeyId])
}
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add OrgRecoveryKey and RecoveryCode models"
```

---

### Task 4: Add PiiAccessLog Model

**Files:**
- Modify: `prisma/schema.prisma` (add after `RecoveryCode`)

- [ ] **Step 1: Add PiiAccessLog model**

```prisma
// ============================================
// PII ACCESS AUDIT LOG — Append-only
// ============================================

/// Every server-side PII decryption event is logged here.
/// Append-only: application layer enforces no UPDATE or DELETE.
/// Tracks: reads, exports, webhook sends, external API responses.
model PiiAccessLog {
  id             String   @id @default(uuid())
  timestamp      DateTime @default(now())
  userId         String
  organizationId String
  entityType     String   // "CLIENT" | "PROPERTY" | "MANDATE" | "TASK" | etc.
  entityId       String
  action         String   // "DECRYPT" | "EXPORT" | "WEBHOOK_SEND" | "API_RESPONSE"
  fields         String[] // List of field names decrypted, e.g. ["client_name", "primary_email"]
  source         String   // Route or action path, e.g. "GET /api/crm/clients/[id]"
  ipAddress      String?

  @@index([organizationId, timestamp])
  @@index([userId, timestamp])
  @@index([entityType, entityId])
}
```

- [ ] **Step 2: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add PiiAccessLog model for audit logging"
```

---

### Task 5: Add PlatformEncryptionKey Model

**Files:**
- Modify: `prisma/schema.prisma` (add after `PiiAccessLog`)

- [ ] **Step 1: Add PlatformEncryptionKey model**

```prisma
// ============================================
// PLATFORM-WIDE ENCRYPTION KEY
// ============================================

/// Platform-level DEK for encrypting data that is not org-scoped:
/// FeedbackComment content and AgentContactSubmission fields.
/// Same structure as OrgEncryptionKey but without orgId.
/// Encrypted by PLATFORM_ENCRYPTION_KEY env var (master KEK).
model PlatformEncryptionKey {
  id           String    @id @default(cuid())
  encryptedDek String    @db.Text // 32-byte random key, AES-256-GCM encrypted with PLATFORM_ENCRYPTION_KEY
  keyVersion   Int       @default(1)
  isActive     Boolean   @default(true)
  rotatedAt    DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@unique([keyVersion])
  @@index([isActive])
}
```

- [ ] **Step 2: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add PlatformEncryptionKey model"
```

---

### Task 6: Add E2EE Columns to Comment Tables + UserIdentityKey Update

**Files:**
- Modify: `prisma/schema.prisma:140-153` (ClientComment)
- Modify: `prisma/schema.prisma:785-798` (PropertyComment)
- Modify: `prisma/schema.prisma:1643-1655` (MandateComment)
- Modify: `prisma/schema.prisma:1043-1056` (crm_Accounts_Tasks_Comments)
- Modify: `prisma/schema.prisma:2445-2457` (UserIdentityKey)

- [ ] **Step 1: Add E2EE columns to ClientComment**

Add two nullable fields after the `content` field (line 146) and before the `Clients` relation (line 147):

```prisma
  entitySessionId String?  // Megolm session ID (null for Standard org comments)
  messageIndex    Int?     // Megolm ratchet index (null for Standard org comments)
```

- [ ] **Step 2: Add E2EE columns to PropertyComment**

Add two nullable fields after the `content` field (line 791) and before the `Properties` relation (line 792):

```prisma
  entitySessionId String?  // Megolm session ID (null for Standard org comments)
  messageIndex    Int?     // Megolm ratchet index (null for Standard org comments)
```

- [ ] **Step 3: Add E2EE columns to MandateComment**

Add two nullable fields after the `content` field (line 1647) and before the `createdAt` field (line 1648):

```prisma
  entitySessionId String?  // Megolm session ID (null for Standard org comments)
  messageIndex    Int?     // Megolm ratchet index (null for Standard org comments)
```

- [ ] **Step 4: Add E2EE columns to crm_Accounts_Tasks_Comments**

Add two nullable fields after the `comment` field (line 1045) and before the `createdAt` field (line 1046):

```prisma
  entitySessionId String?  // Megolm session ID (null for Standard org comments)
  messageIndex    Int?     // Megolm ratchet index (null for Standard org comments)
```

- [ ] **Step 5: Add pendingSessionReshare to UserIdentityKey**

Add after the `keyVersion` field (line 2452) and before `createdAt` (line 2453):

```prisma
  pendingSessionReshare Boolean @default(false) // True during PIN reset, cleared when all entity sessions re-shared
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add E2EE columns to comment tables, pendingSessionReshare to UserIdentityKey"
```

---

### Task 7: Generate Migration + Prisma Client

**Files:**
- Create: `prisma/migrations/<timestamp>_unified_encryption_foundation/migration.sql` (auto-generated)

- [ ] **Step 1: Generate the migration**

```bash
pnpm db:migrate --name unified_encryption_foundation
```

Expected: Prisma generates a migration SQL file containing:
- `CREATE TYPE "EncryptionMode"` with values `STANDARD`, `E2EE`
- `ALTER TABLE "OrganizationSettings"` add `encryptionMode` column
- `CREATE TABLE "EntitySession"` with indexes
- `CREATE TABLE "EntitySessionShare"` with indexes
- `CREATE TABLE "EntitySessionBackup"`
- `CREATE TABLE "OrgRecoveryKey"`
- `CREATE TABLE "RecoveryCode"` with index
- `CREATE TABLE "PiiAccessLog"` with indexes
- `CREATE TABLE "PlatformEncryptionKey"` with indexes
- `ALTER TABLE` for each comment table adding `entitySessionId` and `messageIndex`
- `ALTER TABLE "UserIdentityKey"` add `pendingSessionReshare`

- [ ] **Step 2: Verify migration applied and Prisma client generated**

```bash
pnpm db:status
```

Expected: All migrations applied, no pending migrations.

- [ ] **Step 3: Verify the build still compiles**

```bash
pnpm build
```

Expected: Build succeeds. No type errors — all new fields are optional or have defaults, so existing code is unaffected.

- [ ] **Step 4: Run existing tests to verify no regressions**

```bash
pnpm test
```

Expected: All existing tests pass.

- [ ] **Step 5: Commit the migration**

```bash
git add prisma/migrations/ prisma/schema.prisma
git commit -m "feat(schema): apply unified_encryption_foundation migration"
```

---

## Chunk 2: Encryption Mode Immutability Guard

### Task 8: Write Tests for Immutability Guard

**Files:**
- Create: `tests/lib/encryption-mode-guard.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/lib/encryption-mode-guard.test.ts
```

Expected: FAIL — module `@/lib/encryption-mode-guard` does not exist.

- [ ] **Step 3: Commit the test file**

```bash
git add tests/lib/encryption-mode-guard.test.ts
git commit -m "test: add failing tests for encryption mode immutability guard"
```

---

### Task 9: Implement Immutability Guard

**Files:**
- Create: `lib/encryption-mode-guard.ts`

- [ ] **Step 1: Implement the guard function**

```typescript
/**
 * lib/encryption-mode-guard.ts
 *
 * Prevents changes to OrganizationSettings.encryptionMode after initial creation.
 * The encryption mode is an immutable org-level security decision (spec Section 3).
 *
 * Usage: call assertEncryptionModeUnchanged(orgId, updateData) before any
 * OrganizationSettings update/upsert that could include encryptionMode.
 */

import { prismadb } from "@/lib/prisma";

/**
 * Throws if the update payload attempts to change an existing encryptionMode.
 * Safe to call unconditionally — it's a no-op when encryptionMode is not in the payload
 * or when the org has no settings yet (first creation).
 */
export async function assertEncryptionModeUnchanged(
  organizationId: string,
  updateData: Record<string, unknown>
): Promise<void> {
  // Fast path: if the update doesn't touch encryptionMode, nothing to check.
  if (!("encryptionMode" in updateData)) return;

  const existing = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
    select: { encryptionMode: true },
  });

  // No existing record — this is the initial creation, allow any mode.
  if (!existing) return;

  // Same mode — idempotent, allow.
  if (existing.encryptionMode === updateData.encryptionMode) return;

  throw new Error(
    "Encryption mode cannot be changed after organization creation. " +
    `Current mode: ${existing.encryptionMode}, attempted: ${updateData.encryptionMode}`
  );
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
pnpm vitest run tests/lib/encryption-mode-guard.test.ts
```

Expected: All 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/encryption-mode-guard.ts
git commit -m "feat: implement encryption mode immutability guard"
```

---

## Chunk 3: Platform Key Management

### Task 10: Write Tests for Platform Key Management

**Files:**
- Create: `tests/lib/platform-key-management.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { encryptWithKey, decryptWithKey } from "@/lib/encryption";

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
  vi.stubEnv("SECRETS_ENCRYPTION_KEY", TEST_PLATFORM_KEY_HEX);
});

afterAll(() => {
  vi.unstubAllEnvs();
});

// Import after mocks are set up
const { getPlatformDek, rotatePlatformDek } = await import("@/lib/platform-key-management");

describe("getPlatformDek", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const rawDek = Buffer.from("0123456789abcdef0123456789abcdef", "hex");
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
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/lib/platform-key-management.test.ts
```

Expected: FAIL — module `@/lib/platform-key-management` does not exist.

- [ ] **Step 3: Commit**

```bash
git add tests/lib/platform-key-management.test.ts
git commit -m "test: add failing tests for platform key management"
```

---

### Task 11: Implement Platform Key Management

**Files:**
- Create: `lib/platform-key-management.ts`

- [ ] **Step 1: Implement platform DEK management**

This follows the same pattern as `lib/key-management.ts` but uses `PLATFORM_ENCRYPTION_KEY` env var and the `PlatformEncryptionKey` table. No `orgId` scoping.

```typescript
/**
 * lib/platform-key-management.ts
 *
 * Platform-wide DEK lifecycle for encrypting non-org-scoped data:
 * - FeedbackComment content
 * - AgentContactSubmission fields
 *
 * Mirrors the pattern in lib/key-management.ts (per-org DEKs) but uses
 * PLATFORM_ENCRYPTION_KEY env var and PlatformEncryptionKey table.
 *
 * Caching: L1 (in-process Map, 5min TTL) → L2 (Redis, 10min) → L3 (DB).
 */

import crypto from "crypto";

import { encryptWithKey, decryptWithKey } from "@/lib/encryption";
import { prismadb } from "@/lib/prisma";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";

// ─── L1 in-process cache ─────────────────────
const L1_TTL_MS = 5 * 60 * 1000; // 5 minutes
let l1Cache: { dek: Buffer; expiresAt: number } | null = null;

const REDIS_KEY = "oik:platform-dek";
const REDIS_TTL_SEC = 600; // 10 minutes

function getPlatformMasterKey(): Buffer {
  const hex = process.env.PLATFORM_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "PLATFORM_ENCRYPTION_KEY env var must be a 64-char hex string (32 bytes)"
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Get the active platform DEK. Creates one on first call (lazy initialization).
 * Returns a 32-byte raw key Buffer.
 */
export async function getPlatformDek(): Promise<Buffer> {
  // L1: in-process cache
  if (l1Cache && Date.now() < l1Cache.expiresAt) {
    return l1Cache.dek;
  }

  // L2: Redis cache
  const cached = await cacheGet(REDIS_KEY);
  if (cached) {
    const dek = Buffer.from(
      decryptWithKey(cached, getPlatformMasterKey()),
      "hex"
    );
    l1Cache = { dek, expiresAt: Date.now() + L1_TTL_MS };
    return dek;
  }

  // L3: Database
  const row = await prismadb.platformEncryptionKey.findFirst({
    where: { isActive: true },
    orderBy: { keyVersion: "desc" },
  });

  if (row) {
    const dek = Buffer.from(
      decryptWithKey(row.encryptedDek, getPlatformMasterKey()),
      "hex"
    );
    l1Cache = { dek, expiresAt: Date.now() + L1_TTL_MS };
    await cacheSet(REDIS_KEY, row.encryptedDek, REDIS_TTL_SEC);
    return dek;
  }

  // First ever call — generate and persist a new platform DEK
  const rawDek = crypto.randomBytes(32);
  const encryptedDek = encryptWithKey(
    rawDek.toString("hex"),
    getPlatformMasterKey()
  );

  await prismadb.platformEncryptionKey.create({
    data: { encryptedDek, keyVersion: 1, isActive: true },
  });

  l1Cache = { dek: rawDek, expiresAt: Date.now() + L1_TTL_MS };
  await cacheSet(REDIS_KEY, encryptedDek, REDIS_TTL_SEC);
  return rawDek;
}

/**
 * Rotate the platform DEK. Creates a new version and deactivates the old.
 * Returns the new key version number.
 */
export async function rotatePlatformDek(
  currentVersion: number
): Promise<number> {
  const newVersion = currentVersion + 1;
  const rawDek = crypto.randomBytes(32);
  const encryptedDek = encryptWithKey(
    rawDek.toString("hex"),
    getPlatformMasterKey()
  );

  await prismadb.$transaction(async (tx) => {
    await tx.platformEncryptionKey.updateMany({
      where: { isActive: true },
      data: { isActive: false, rotatedAt: new Date() },
    });

    await tx.platformEncryptionKey.create({
      data: { encryptedDek, keyVersion: newVersion, isActive: true },
    });
  });

  // Clear caches
  l1Cache = null;
  await cacheDel(REDIS_KEY);

  return newVersion;
}

/**
 * Get a specific platform DEK version (for decrypting historical data).
 */
export async function getPlatformDekByVersion(
  version: number
): Promise<Buffer> {
  const row = await prismadb.platformEncryptionKey.findFirst({
    where: { keyVersion: version },
  });

  if (!row) {
    throw new Error(`Platform encryption key version ${version} not found`);
  }

  return Buffer.from(
    decryptWithKey(row.encryptedDek, getPlatformMasterKey()),
    "hex"
  );
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
pnpm vitest run tests/lib/platform-key-management.test.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/platform-key-management.ts
git commit -m "feat: implement platform-wide DEK management"
```

---

### Task 12: Add PLATFORM_ENCRYPTION_KEY to Env Validation

**Files:**
- Modify: `lib/env.ts`
- Modify: `tests/env-validation.test.ts`

- [ ] **Step 1: Read the env validation file**

Read `lib/env.ts` to find the existing validation schema. Note: `SECRETS_ENCRYPTION_KEY` may not currently be in this schema — if not, add `PLATFORM_ENCRYPTION_KEY` as a standalone entry.

- [ ] **Step 2: Add PLATFORM_ENCRYPTION_KEY to the validation schema**

Add `PLATFORM_ENCRYPTION_KEY` as an optional 64-character hex string: `z.string().length(64).regex(/^[0-9a-f]+$/i).optional()`.

- [ ] **Step 3: Add a test for the new env var**

Add a test case to `tests/env-validation.test.ts` verifying:
- Valid 64-char hex string passes
- Invalid (wrong length, non-hex) fails
- Missing is allowed (optional)

- [ ] **Step 4: Run the env validation tests**

```bash
pnpm vitest run tests/env-validation.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/env.ts tests/env-validation.test.ts
git commit -m "feat: add PLATFORM_ENCRYPTION_KEY to env validation"
```

---

## Chunk 4: PII Access Logging Service

### Task 13: Write Tests for PII Access Log

**Files:**
- Create: `tests/lib/pii-access-log.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    piiAccessLog: {
      create: (...args: any[]) => mockCreate(...args),
    },
  },
}));

const { logPiiAccess, PiiAction } = await import("@/lib/pii-access-log");

describe("logPiiAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ id: "log-1" });
  });

  it("creates an audit log entry with all required fields", async () => {
    await logPiiAccess({
      userId: "user-1",
      organizationId: "org-1",
      entityType: "CLIENT",
      entityId: "client-1",
      action: PiiAction.DECRYPT,
      fields: ["client_name", "primary_email"],
      source: "GET /api/crm/clients/[id]",
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        organizationId: "org-1",
        entityType: "CLIENT",
        entityId: "client-1",
        action: "DECRYPT",
        fields: ["client_name", "primary_email"],
        source: "GET /api/crm/clients/[id]",
        ipAddress: undefined,
      },
    });
  });

  it("includes optional ipAddress when provided", async () => {
    await logPiiAccess({
      userId: "user-1",
      organizationId: "org-1",
      entityType: "PROPERTY",
      entityId: "prop-1",
      action: PiiAction.API_RESPONSE,
      fields: ["primary_email"],
      source: "GET /api/v1/properties/[id]",
      ipAddress: "192.168.1.1",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: "192.168.1.1",
        action: "API_RESPONSE",
      }),
    });
  });

  it("does not throw on database errors (fire-and-forget logging)", async () => {
    mockCreate.mockRejectedValue(new Error("DB connection failed"));

    // Should not throw — logging failures must not break the main flow
    await expect(
      logPiiAccess({
        userId: "user-1",
        organizationId: "org-1",
        entityType: "CLIENT",
        entityId: "client-1",
        action: PiiAction.DECRYPT,
        fields: ["client_name"],
        source: "test",
      })
    ).resolves.toBeUndefined();
  });

  it("accepts all valid PiiAction values", () => {
    expect(PiiAction.DECRYPT).toBe("DECRYPT");
    expect(PiiAction.EXPORT).toBe("EXPORT");
    expect(PiiAction.WEBHOOK_SEND).toBe("WEBHOOK_SEND");
    expect(PiiAction.API_RESPONSE).toBe("API_RESPONSE");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/lib/pii-access-log.test.ts
```

Expected: FAIL — module `@/lib/pii-access-log` does not exist.

- [ ] **Step 3: Commit**

```bash
git add tests/lib/pii-access-log.test.ts
git commit -m "test: add failing tests for PII access logging"
```

---

### Task 14: Implement PII Access Log Service

**Files:**
- Create: `lib/pii-access-log.ts`

- [ ] **Step 1: Implement the logging service**

```typescript
/**
 * lib/pii-access-log.ts
 *
 * Append-only audit log for all server-side PII decryption events.
 * Every time the server decrypts PII fields (Layer 1), an entry is created.
 *
 * Design decisions:
 * - Fire-and-forget: logging failures are caught and logged to console,
 *   never thrown — audit logging must not break the main request flow.
 * - No UPDATE or DELETE operations — this module only creates entries.
 * - The PiiAccessLog table has no foreign keys — it stores IDs as strings
 *   for maximum durability (entries survive entity/user deletion).
 */

import { prismadb } from "@/lib/prisma";

export const PiiAction = {
  DECRYPT: "DECRYPT",
  EXPORT: "EXPORT",
  WEBHOOK_SEND: "WEBHOOK_SEND",
  API_RESPONSE: "API_RESPONSE",
} as const;

export type PiiActionType = (typeof PiiAction)[keyof typeof PiiAction];

export interface PiiAccessLogEntry {
  userId: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  action: PiiActionType;
  fields: string[];
  source: string;
  ipAddress?: string;
}

/**
 * Log a PII access event. Fire-and-forget — never throws.
 */
export async function logPiiAccess(entry: PiiAccessLogEntry): Promise<void> {
  try {
    await prismadb.piiAccessLog.create({
      data: {
        userId: entry.userId,
        organizationId: entry.organizationId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        fields: entry.fields,
        source: entry.source,
        ipAddress: entry.ipAddress,
      },
    });
  } catch (error) {
    // Fire-and-forget: log to console but never throw.
    // Audit logging must not break the main request flow.
    console.error("[PiiAccessLog] Failed to write audit entry:", error);
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
pnpm vitest run tests/lib/pii-access-log.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 3: Run all tests to verify no regressions**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/pii-access-log.ts
git commit -m "feat: implement PII access audit logging service"
```

---

## Chunk 5: Org Creation Flow Update

### Task 15: Update create-organization Action

**Files:**
- Modify: `actions/organization/create-organization.ts`
- Modify: `actions/organization/ensure-personal-workspace.ts`

- [ ] **Step 1: Update createOrganizationAction to accept encryptionMode**

Modify `actions/organization/create-organization.ts`:

Add imports:

```typescript
import { EncryptionMode } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
```

Change the function signature from:

```typescript
export async function createOrganizationAction(name: string, slug?: string) {
```

to:

```typescript
export async function createOrganizationAction(
  name: string,
  slug?: string,
  encryptionMode: EncryptionMode = EncryptionMode.STANDARD
) {
```

- [ ] **Step 2: Create OrganizationSettings after Clerk org creation**

After the `clerk.organizations.createOrganization()` call (line 50) and before `revalidatePath` (line 53), add:

```typescript
    // Create OrganizationSettings with chosen encryption mode.
    // encryptionMode is immutable after creation (enforced by lib/encryption-mode-guard.ts).
    // Note: if this upsert fails after Clerk org creation, the org exists without settings.
    // The upsert is idempotent (update: {}), so retrying the action or any subsequent
    // OrganizationSettings access that uses upsert will create the missing record.
    await prismadb.organizationSettings.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        createdBy: userId,
        encryptionMode,
      },
      update: {},  // Never update — if settings exist, keep them as-is
    });
```

- [ ] **Step 3: Update ensure-personal-workspace to set STANDARD mode**

Modify `actions/organization/ensure-personal-workspace.ts`:

Add imports:

```typescript
import { EncryptionMode } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
```

After the personal workspace org is created and metadata is set, add (before the return):

```typescript
      // Personal workspaces always use STANDARD encryption mode.
      await prismadb.organizationSettings.upsert({
        where: { organizationId: personalOrg.id },
        create: {
          organizationId: personalOrg.id,
          createdBy: userId,
          encryptionMode: EncryptionMode.STANDARD,
        },
        update: {},
      });
```

- [ ] **Step 4: Verify the build compiles**

```bash
pnpm build
```

Expected: Build succeeds. The new `encryptionMode` parameter has a default, so existing callers are unaffected.

- [ ] **Step 5: Run all tests**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add actions/organization/create-organization.ts actions/organization/ensure-personal-workspace.ts
git commit -m "feat: set encryptionMode during org and personal workspace creation"
```

---

### Task 16: Wire Immutability Guard into Org Settings Update Paths

The `assertEncryptionModeUnchanged` guard must be called with the **actual update data** to be effective. Existing update paths (`set-ownership-mode`, `change-ownership-mode`) don't currently pass `encryptionMode`, but the guard protects against future regressions where someone adds it by accident.

**Files:**
- Modify: `actions/data-ownership/set-ownership-mode.ts`
- Modify: `actions/data-ownership/change-ownership-mode.ts`

- [ ] **Step 1: Add guard to set-ownership-mode action**

In `actions/data-ownership/set-ownership-mode.ts`, add import:

```typescript
import { assertEncryptionModeUnchanged } from "@/lib/encryption-mode-guard";
```

Before the `prismadb.$transaction` call (line 54), extract the create data and pass it through the guard:

```typescript
    const settingsData = {
      dataOwnershipMode: mode,
      dataOwnershipSetAt: now,
      dataOwnershipChangedBy: userId,
      policyVersion: 1,
      policyHistory: [{ mode, from: now.toISOString(), to: null }],
    };

    // Guard: reject if someone accidentally adds encryptionMode to settingsData
    await assertEncryptionModeUnchanged(orgId, settingsData);
```

Then update the upsert to use `settingsData` instead of inline objects (both `create` and `update` blocks).

- [ ] **Step 2: Add guard to change-ownership-mode action**

In `actions/data-ownership/change-ownership-mode.ts`, add import:

```typescript
import { assertEncryptionModeUnchanged } from "@/lib/encryption-mode-guard";
```

Before the `prismadb.$transaction` call, extract the update data and pass through the guard:

```typescript
    const updateData = {
      dataOwnershipMode: newMode,
      dataOwnershipChangedAt: now,
      dataOwnershipChangedBy: userId,
      policyVersion: { increment: 1 },
      policyHistory: newHistory,
    };

    // Guard: reject if someone accidentally adds encryptionMode to updateData
    await assertEncryptionModeUnchanged(orgId, updateData);
```

Then update the transaction to use `updateData`.

- [ ] **Step 3: Verify build compiles and tests pass**

```bash
pnpm build && pnpm test
```

Expected: Both succeed.

- [ ] **Step 4: Commit**

```bash
git add actions/data-ownership/set-ownership-mode.ts actions/data-ownership/change-ownership-mode.ts
git commit -m "feat: wire encryption mode immutability guard into org settings update paths"
```

---

### Task 17: Final Verification

- [ ] **Step 1: Run full build**

```bash
pnpm build
```

Expected: Clean build, no errors.

- [ ] **Step 2: Run full test suite**

```bash
pnpm test
```

Expected: All tests pass (existing + new).

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: No lint errors.

- [ ] **Step 4: Verify database state**

```bash
pnpm db:status
```

Expected: All migrations applied, schema in sync.

- [ ] **Step 5: Review all changes**

```bash
git log --oneline -15
```

Expected: ~12 clean commits covering schema, migration, guard, platform key management, PII logging, and org creation flow.
