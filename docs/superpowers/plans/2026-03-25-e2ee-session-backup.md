# E2EE Session Backup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable server-side encrypted session backup and restore for all E2EE sessions (Double Ratchet, Megolm), solving session loss on browser data clear and enabling multi-device session sharing.

**Architecture:** Dual-layer encryption (ECIES client-side + DEK wrap server-side) with debounced batch uploads, version-based conflict resolution, and `sendBeacon` for page unload. Sessions are backed up per-user per-org. Restore happens automatically on PIN unlock.

**Tech Stack:** Prisma (schema + migration), Next.js API routes (POST/GET/DELETE), Zod validation, WebCrypto ECIES, AES-256-GCM DEK wrapping, IndexedDB (version tracking store), `navigator.sendBeacon`, Vitest.

**Spec:** `docs/superpowers/specs/2026-03-25-e2ee-session-backup-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `prisma/migrations/YYYYMMDD_add_e2ee_session_backup/migration.sql` | DB schema for `E2eeSessionBackup` |
| `app/api/e2ee/session-backups/route.ts` | POST (batch upsert), GET (fetch all), DELETE (GDPR erasure) |
| `app/api/e2ee/session-backups/beacon/route.ts` | POST for `sendBeacon` (text/plain content type) |
| `lib/e2ee/session-backup.ts` | `SessionBackupManager` class — debounce, ECIES encrypt, restore (`"use client"`) |
| `lib/e2ee/session-backup-server.ts` | Shared server-side helper: `processBackupBatch()` used by both route + beacon |
| `tests/e2ee/session-backup.test.ts` | Unit + integration tests for SessionBackupManager |

### Modified Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `E2eeSessionBackup` model |
| `lib/e2ee/session-store.ts` | Add `backup-versions` store (DB_VERSION 2→3), version helpers |
| `lib/e2ee/index.ts` | Integrate `markDirty()` after every IndexedDB write, add restore to `unlock()`, export `flushBackupsOnUnload()` |
| `lib/e2ee/entity-comments.ts` | Accept optional `onDirty` callback for `markDirty` integration |
| `hooks/useE2EE.ts` | Add `isSyncing` state, call restore during unlock, register unload handlers, toast notifications |
| `components/layout/E2EESessionButton.tsx` | Add syncing state with `RefreshCw` icon |
| `components/e2ee/PinEntryDialog.tsx` | Add "Syncing encrypted sessions..." progress after PIN entry |
| `app/[locale]/app/(routes)/settings/security/page.tsx` | Add Session Backup status section |
| `docs/security/application-security.md` | Update H-6 status to FIXED |
| `docs/security/e2ee-architecture.md` | Add session backup section |

---

## Task 1: Prisma Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/YYYYMMDD_add_e2ee_session_backup/migration.sql`

- [ ] **Step 1: Add the E2eeSessionBackup model to schema.prisma**

Add after the `EntitySessionBackup` model (around line 3105):

```prisma
model E2eeSessionBackup {
  id              String   @id @default(uuid())
  userId          String
  organizationId  String
  sessionType     String                          // "ratchet" | "megolm-out" | "megolm-in"
  sessionKey      String
  encryptedState  String   @db.Text
  ephemeralPubKey String
  iv              String
  dekVersion      Int
  version         Int      @default(1)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userId, organizationId, sessionType, sessionKey])
  @@index([userId, organizationId])
}
```

- [ ] **Step 2: Generate and apply migration**

Run: `pnpm db:migrate` — name it `add_e2ee_session_backup`
Expected: Migration created and applied.

- [ ] **Step 3: Verify Prisma client**

Run: `pnpm prisma generate`
Expected: No errors. `prismadb.e2eeSessionBackup` available.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(e2ee): add E2eeSessionBackup model for server-side session sync"
```

---

## Task 2: IndexedDB Version Store

**Files:**
- Modify: `lib/e2ee/session-store.ts`
- Test: `tests/e2ee/session-store.test.ts`

- [ ] **Step 1: Add backup-versions store to session-store.ts**

Bump `DB_VERSION` from 2 to 3. Add `BACKUP_VERSIONS_STORE` constant. Add the store in the `upgrade` handler. Add `getBackupVersion()`, `setBackupVersion()`, `deleteBackupVersion()` helpers.

```typescript
const DB_VERSION = 3;
const BACKUP_VERSIONS_STORE = "backup-versions";

// In upgrade handler:
if (!db.objectStoreNames.contains(BACKUP_VERSIONS_STORE)) {
  db.createObjectStore(BACKUP_VERSIONS_STORE, { keyPath: "id" });
}

// New helpers:
export async function getBackupVersion(sessionKey: string): Promise<number> {
  const db = await getDB();
  const entry = await db.get(BACKUP_VERSIONS_STORE, sessionKey);
  return entry?.version ?? 0;
}

export async function setBackupVersion(sessionKey: string, version: number): Promise<void> {
  const db = await getDB();
  await db.put(BACKUP_VERSIONS_STORE, { id: sessionKey, version });
}

export async function deleteBackupVersion(sessionKey: string): Promise<void> {
  const db = await getDB();
  await db.delete(BACKUP_VERSIONS_STORE, sessionKey);
}
```

Also add `BACKUP_VERSIONS_STORE` to `clearAllSessions()`.

- [ ] **Step 2: Add tests for version helpers**

In `tests/e2ee/session-store.test.ts`, add tests for get/set/delete backup version.

- [ ] **Step 3: Run tests**

Run: `pnpm vitest run tests/e2ee/session-store.test.ts`
Expected: All tests pass including new version store tests.

- [ ] **Step 4: Commit**

```bash
git add lib/e2ee/session-store.ts tests/e2ee/session-store.test.ts
git commit -m "feat(e2ee): add backup-versions IndexedDB store (DB v3)"
```

---

## Task 3: SessionBackupManager Core

**Files:**
- Create: `lib/e2ee/session-backup.ts`
- Create: `tests/e2ee/session-backup.test.ts`

- [ ] **Step 1: Create `lib/e2ee/session-backup.ts`**

Implement the `SessionBackupManager` class with:
- `markDirty(sessionType, sessionKey, serializedState)` — adds to dirty map, schedules debounce
- `flush()` — ECIES-encrypts each dirty session with identity public key, POSTs batch to `/api/e2ee/session-backups`, updates local backup versions, resets dirty map
- `flushOnUnload()` — uses `navigator.sendBeacon` with `/api/e2ee/session-backups/beacon`
- `restoreAll(kek)` — GETs all backups from server, ECIES-decrypts with identity private key, compares versions, imports newer sessions to IndexedDB
- `clearAll()` — DELETEs all backups from server

Key implementation details:
- `"use client"` directive required
- Constructor takes `getIdentityPublicKey` and `getIdentityPrivateKey` callbacks
- Reuses existing `eciesEncryptSessionExport` / `decryptSessionExportFromShare` from `lib/e2ee/index.ts` — but these take JSON strings, not arbitrary strings. **Gap check**: The existing ECIES functions in index.ts work with JSON session exports. For the backup manager, we need ECIES on arbitrary serialized state strings. Create local `eciesEncrypt(plaintext, pubKey)` and `eciesDecrypt(blob, ephPubKey, iv, privKey)` wrappers that reuse the primitives from `lib/e2ee/primitives.ts` directly. This avoids circular imports with `index.ts`.

- [ ] **Step 2: Write unit tests**

In `tests/e2ee/session-backup.test.ts`:
- Test `markDirty` + debounce (use `vi.useFakeTimers`)
- Test `flush` calls fetch with correct batch structure (mock fetch)
- Test `restoreAll` imports sessions when server version is newer
- Test `restoreAll` skips sessions when local version is >= server
- Test `flushOnUnload` calls `navigator.sendBeacon` (mock)
- Test consecutive failure counter increments on fetch error

- [ ] **Step 3: Run tests**

Run: `pnpm vitest run tests/e2ee/session-backup.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/e2ee/session-backup.ts tests/e2ee/session-backup.test.ts
git commit -m "feat(e2ee): SessionBackupManager with debounced backup and restore"
```

---

## Task 4: API Route — POST + GET + DELETE

**Files:**
- Create: `app/api/e2ee/session-backups/route.ts`

- [ ] **Step 1: Implement the route handler**

All three methods (POST, GET, DELETE) in one file per Next.js convention.

POST:
1. Auth: `const { userId, orgId } = await auth()` — both required
2. Zod validate body with `SessionBackupBatchSchema`
3. Get DEK + version: `getOrgDek(orgId)`, `getOrgKeyVersion(orgId)`
4. For each item: `encryptWithKey(item.eciesBlob, dek)` → upsert `E2eeSessionBackup`
5. Return `{ results: [{ sessionKey, version }] }`

GET:
1. Auth: userId + orgId
2. Optional `?sessionType=` filter
3. Fetch all for userId + orgId
4. For each: `getOrgDekByVersion(orgId, backup.dekVersion)` → `decryptWithKey(encryptedState, dek)`
5. Return array with ECIES blobs + version + updatedAt

DELETE:
1. Auth: userId + orgId
2. `deleteMany({ where: { userId, organizationId: orgId } })`
3. Return `{ deleted: count }`

Security: Zod `.strict()`, blob max 64KB, batch max 50, rate limits per spec.

- [ ] **Step 2: Verify compilation**

Run: `pnpm build` (or `npx tsc --noEmit`)
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/e2ee/session-backups/route.ts
git commit -m "feat(e2ee): session backup API routes (POST batch, GET, DELETE)"
```

---

## Task 5: Shared Server Helper + Beacon Endpoint

**Files:**
- Create: `lib/e2ee/session-backup-server.ts`
- Create: `app/api/e2ee/session-backups/beacon/route.ts`
- Modify: `app/api/e2ee/session-backups/route.ts` (refactor to use shared helper)

- [ ] **Step 1: Create shared server helper `lib/e2ee/session-backup-server.ts`**

Extract the DEK-wrap + upsert logic from the main route into a reusable function:

```typescript
// lib/e2ee/session-backup-server.ts
import { prismadb } from "@/lib/prisma";
import { encryptWithKey } from "@/lib/encryption";
import { getOrgDek, getOrgKeyVersion } from "@/lib/key-management";

interface BackupItem {
  sessionType: string;
  sessionKey: string;
  eciesBlob: string;
  ephemeralPubKey: string;
  iv: string;
}

export async function processBackupBatch(
  userId: string,
  orgId: string,
  backups: BackupItem[]
): Promise<Array<{ sessionKey: string; version: number }>> {
  const dek = await getOrgDek(orgId);
  const dekVersion = await getOrgKeyVersion(orgId);
  const results: Array<{ sessionKey: string; version: number }> = [];

  for (const item of backups) {
    const encryptedState = encryptWithKey(item.eciesBlob, dek);
    const result = await prismadb.e2eeSessionBackup.upsert({
      where: {
        userId_organizationId_sessionType_sessionKey: {
          userId, organizationId: orgId, sessionType: item.sessionType, sessionKey: item.sessionKey,
        },
      },
      create: {
        userId, organizationId: orgId,
        sessionType: item.sessionType, sessionKey: item.sessionKey,
        encryptedState, ephemeralPubKey: item.ephemeralPubKey, iv: item.iv,
        dekVersion, version: 1,
      },
      update: {
        encryptedState, ephemeralPubKey: item.ephemeralPubKey, iv: item.iv,
        dekVersion, version: { increment: 1 },
      },
      select: { sessionKey: true, version: true },
    });
    results.push(result);
  }

  return results;
}
```

- [ ] **Step 2: Refactor main route to use shared helper**

Replace the inline DEK-wrap + upsert logic in `app/api/e2ee/session-backups/route.ts` POST handler with a call to `processBackupBatch(userId, orgId, parsed.data.backups)`.

- [ ] **Step 3: Create beacon endpoint**

`app/api/e2ee/session-backups/beacon/route.ts`:
- `const text = await req.text()` then `JSON.parse(text)` with try/catch
- Same `SessionBackupBatchSchema` validation
- Call `processBackupBatch(userId, orgId, parsed.data.backups)`
- Return `200` (sendBeacon ignores responses, but the route must complete)

- [ ] **Step 4: Commit**

```bash
git add lib/e2ee/session-backup-server.ts app/api/e2ee/session-backups/beacon/route.ts app/api/e2ee/session-backups/route.ts
git commit -m "feat(e2ee): shared backup helper + sendBeacon endpoint"
```

---

## Task 6: Integrate markDirty into E2EE Index + Entity Comments

**Files:**
- Modify: `lib/e2ee/index.ts`
- Modify: `lib/e2ee/entity-comments.ts`

- [ ] **Step 1: Add onDirty callback to entity-comments.ts**

The entity comment functions (`encryptEntityComment`, `decryptEntityComment`) in `entity-comments.ts` do their own IndexedDB writes internally — the store calls are NOT in `index.ts`. To integrate `markDirty`, add an optional `onDirty` callback parameter:

```typescript
// entity-comments.ts — add to encryptEntityComment and decryptEntityComment signatures:
export async function encryptEntityComment(
  entityType: EntityType,
  entityId: string,
  plaintext: string,
  kek: ArrayBuffer,
  onDirty?: (sessionType: string, sessionKey: string, state: string) => void,
): Promise<EncryptEntityCommentResult> {
  // ... existing logic ...
  // After storeEntityMegolmOutbound:
  onDirty?.("megolm-out", `megolm-out:${key}`, session.serialize());
  // ...
}
```

Same pattern for `decryptEntityComment` — call `onDirty("megolm-in", ...)` after `storeMegolmInbound`.

- [ ] **Step 2: Add backup manager instance and markDirty calls to index.ts**

In `lib/e2ee/index.ts`:
1. Import `SessionBackupManager` from `./session-backup`
2. Create a module-level `let _backupManager: SessionBackupManager | null = null`
3. Initialize it in `unlock()` after identity key is available
4. Clear it in `lock()`: call `_backupManager?.flushOnUnload()` then set to `null`
5. Export a `flushBackupsOnUnload()` function for the hook to call on page visibility change

Functions to add `markDirty` after (direct IndexedDB writes in index.ts):
- `encryptDM()` → after `storeRatchetSession` → `_backupManager?.markDirty("ratchet", "ratchet:" + conversationId, serialized)`
- `decryptDM()` → same pattern
- `initiateDMSession()` → same
- `acceptDMSession()` → same
- `encryptGroup()` → after `storeMegolmOutbound` → `_backupManager?.markDirty("megolm-out", "megolm-out:" + targetId, session.serialize())`
- `decryptGroup()` → after `storeMegolmInbound` → `_backupManager?.markDirty("megolm-in", "megolm-in:" + sessionId, session.serialize())`
- `createGroupSession()` → same as encryptGroup for outbound
- `importGroupSession()` → same as decryptGroup for inbound

For entity comments (delegated to entity-comments.ts), pass the `onDirty` callback:
- `encryptEntityComment()` wrapper → pass `(type, key, state) => _backupManager?.markDirty(type, key, state)`
- `decryptEntityComment()` wrapper → same pattern

6. In `unlock()`, after identity key setup, call `await _backupManager.restoreAll(_kekRaw!)`

- [ ] **Step 2: Run existing E2EE tests**

Run: `pnpm vitest run tests/e2ee/`
Expected: All 55 existing tests pass (markDirty is fire-and-forget, doesn't affect encrypt/decrypt behavior).

- [ ] **Step 3: Commit**

```bash
git add lib/e2ee/index.ts
git commit -m "feat(e2ee): integrate session backup markDirty into all E2EE operations"
```

---

## Task 7: Hook + UI — Syncing State

**Files:**
- Modify: `hooks/useE2EE.ts`
- Modify: `components/layout/E2EESessionButton.tsx`

- [ ] **Step 1: Add isSyncing state to useE2EE**

In `hooks/useE2EE.ts`:
1. Add `isSyncing: boolean` to the `E2EEState` interface (default `false`)
2. In the `unlock` callback, after the `e2ee.unlock(...)` call succeeds:
   - Set `isSyncing: true`
   - The `e2ee.unlock()` function now internally calls `restoreAll()`, which is async
   - After unlock completes, set `isSyncing: false` and `isUnlocked: true`
3. Register `visibilitychange` and `beforeunload` listeners that call `e2ee.flushOnUnload()` (imported from the backup manager via index.ts)
4. Expose `isSyncing` in the context value

- [ ] **Step 2: Add syncing state to E2EESessionButton**

In `components/layout/E2EESessionButton.tsx`:
1. Destructure `isSyncing` from `useE2EE()`
2. Add the syncing state between locked and unlocked:

```tsx
import { Lock, LockOpen, ShieldAlert, RefreshCw } from "lucide-react";

// In the render:
{!isSetUp ? (
  <ShieldAlert className="h-4 w-4 text-warning" />
) : isSyncing ? (
  <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
) : isUnlocked ? (
  <LockOpen className="h-4 w-4 text-success" />
) : (
  <Lock className="h-4 w-4 text-muted-foreground" />
)}
```

Update tooltip text for syncing state: `"Syncing encrypted sessions..."`

- [ ] **Step 3: Commit**

```bash
git add hooks/useE2EE.ts components/layout/E2EESessionButton.tsx
git commit -m "feat(e2ee): add syncing state to E2EE button during session restore"
```

---

## Task 7b: PinEntryDialog Syncing Progress

**Files:**
- Modify: `components/e2ee/PinEntryDialog.tsx`

- [ ] **Step 1: Add syncing progress to PinEntryDialog**

After the PIN is accepted and `unlock()` is called, the dialog should show a "Syncing encrypted sessions..." state instead of immediately closing. Use the `isSyncing` state from `useE2EE()`:

- While `isSyncing` is true: show a spinner/loading state with text "Syncing encrypted sessions..."
- If restore takes > 3 seconds: show progress count "Restoring sessions (12/18)..." (requires exposing `restoreProgress` from the backup manager through the hook)
- When `isSyncing` becomes false: close the dialog

Implementation note: The simplest approach is to keep the dialog open while `isSyncing` is true, replacing the PIN form content with the sync status. The dialog closes when `isUnlocked && !isSyncing`.

- [ ] **Step 2: Commit**

```bash
git add components/e2ee/PinEntryDialog.tsx
git commit -m "feat(e2ee): show syncing progress in PinEntryDialog after unlock"
```

---

## Task 7c: Settings Page Backup Status + Toast Notifications

**Files:**
- Modify: `app/[locale]/app/(routes)/settings/security/page.tsx`
- Modify: `hooks/useE2EE.ts`

- [ ] **Step 1: Add backup status section to security settings page**

Add a "Session Backup" card to the security settings page with:
- Status indicator: "Synced" (green dot) or "Pending" (amber dot)
- Last synced timestamp: "Last: 2 minutes ago" (from the backup manager's last flush time)
- Session count: "Sessions backed up: 14"
- "Force Sync Now" button → calls exposed `forceBackupFlush()` from `useE2EE()`
- "Clear All Backups" button → `AlertDialog` confirmation → calls `DELETE /api/e2ee/session-backups`

Expose `backupStatus: { lastSynced: Date | null; sessionCount: number; isDirty: boolean }` and `forceBackupFlush()` and `clearBackups()` from the E2EE hook.

- [ ] **Step 2: Add toast notifications to useE2EE hook**

Wire the following toasts using `useAppToast()` (import from `@/hooks/use-app-toast`):
- **Conflict toast**: When backup manager detects a newer server version during restore → `info("Encrypted sessions synced from another device.")`
- **Restore failure toast**: When `restoreAll()` catches a network error → `info("Could not sync encrypted sessions. Some conversations may be unavailable until reconnected.")`
- **Flush failure toast**: When backup manager reports 3 consecutive failures → `info("Session backup delayed — check your connection.")`
- **ECIES decrypt failure**: Silent — logged to console, session treated as missing

Implementation note: The `SessionBackupManager` should emit events (or accept callbacks) that the hook listens to, rather than importing toast logic directly. Keep the manager pure; let the hook handle UI notifications.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/app/(routes)/settings/security/page.tsx hooks/useE2EE.ts
git commit -m "feat(e2ee): backup status in settings + toast notifications for sync events"
```

---

## Task 8: Update Security Documentation

**Files:**
- Modify: `docs/security/application-security.md`
- Modify: `docs/security/e2ee-architecture.md`

- [ ] **Step 1: Update H-6 status in application-security.md**

Change H-6 status from `OPEN` to `FIXED` with implementation notes referencing the spec and this plan.

- [ ] **Step 2: Add session backup section to e2ee-architecture.md**

Add a "Session Backup" section after "IndexedDB Session Storage" describing the dual-layer encryption, sync timing, and restore flow.

- [ ] **Step 3: Commit**

```bash
git add docs/security/application-security.md docs/security/e2ee-architecture.md
git commit -m "docs(security): update H-6 status to FIXED, add session backup to architecture"
```

---

## Task 9: Comprehensive Testing

**Files:**
- Test: `tests/e2ee/session-backup.test.ts` (extend with integration + API-level tests)

- [ ] **Step 1: Add integration round-trip tests**

Tests that exercise the full crypto round-trip (mock fetch, real crypto):
1. Create a DoubleRatchet session → serialize → ECIES encrypt → DEK wrap → DEK unwrap → ECIES decrypt → deserialize → verify state matches
2. Create a MegolmOutbound session → same round-trip
3. Version conflict: set local version to 3, server returns version 5 → verify server version imported
4. Version conflict: set local version to 5, server returns version 3 → verify local kept
5. Fresh device (empty IndexedDB): restore populates all sessions from server

- [ ] **Step 2: Add API validation tests (unit-style, mock Prisma)**

Tests that verify the API route logic:
1. POST batch with valid body → 200 + results array
2. POST batch with > 50 items → 400 (Zod max array length)
3. POST with `sessionType: "otp"` → 400 (enum validation)
4. POST with blob > 64KB → 400 (max string length)
5. POST without `orgId` in auth → 401
6. GET returns only userId + orgId scoped backups (verify WHERE clause)
7. GET DEK-unwraps using correct `dekVersion` (mock `getOrgDekByVersion`)
8. GET response includes `updatedAt` field
9. DELETE removes only current org's backups (verify WHERE clause)
10. Cross-org isolation: POST backup with Org A, GET with Org B → empty result

- [ ] **Step 3: Run full test suite**

Run: `pnpm vitest run tests/e2ee/`
Expected: All tests pass (original 55 + new session backup tests).

- [ ] **Step 4: Run lint**

Run: `pnpm lint`
Expected: 0 errors (warnings acceptable).

- [ ] **Step 5: Final commit**

```bash
git add tests/e2ee/session-backup.test.ts
git commit -m "test(e2ee): comprehensive tests for session backup — round-trip, API validation, conflict resolution"
```

---

## Dependency Order

```
Task 1 (Schema) ─┐
                  ├──→ Task 4 (API routes) ──→ Task 5 (Shared helper + Beacon)
Task 2 (IDB ver) ─┘          │
                              ▼
                    Task 3 (BackupManager) ──→ Task 6 (Index + entity-comments)
                                                      │
                                                      ▼
                                            Task 7 (E2EE button syncing)
                                                      │
                                                      ▼
                                           Task 7b (PinEntryDialog progress)
                                                      │
                                                      ▼
                                           Task 7c (Settings + toasts)
                                                      │
                                                      ▼
                                            Task 8 (Docs) ──→ Task 9 (All tests)
```

- Tasks 1 and 2 are parallel (no dependency between schema migration and IDB store).
- Task 4 needs Task 1 (Prisma schema must exist for route to compile).
- Task 3 needs Task 2 (BackupManager uses version helpers from IDB store).
- Task 5 needs Task 4 (refactors main route into shared helper).
- Task 6 needs Tasks 3+4 (integrates manager that calls API).
- Tasks 7, 7b, 7c are sequential UI work building on Task 6.
- Task 9 is the final verification covering unit, API, and integration tests.

---

## Security Review Checkpoints

After **Task 4** (API routes): Verify org scoping on all queries (`userId` + `organizationId`), Zod validation with `.strict()`, DEK version tracking (`dekVersion` column populated from `getOrgKeyVersion`), rate limit tier annotations.

After **Task 5** (Shared helper): Verify `processBackupBatch` is the single code path for both route and beacon — no logic duplication.

After **Task 6** (Index + entity-comments integration): Verify `markDirty` is called after EVERY IndexedDB write. Cross-reference with the spec's integration points table. Specific check: entity-comments.ts `onDirty` callback is wired through from index.ts for both `encryptEntityComment` and `decryptEntityComment`.

After **Task 7c** (Toasts): Verify error toasts match the spec's error handling table. Verify the backup manager emits events/callbacks rather than importing UI code directly.

After **Task 9** (All tests): Verify the full round-trip: encrypt → backup → clear IndexedDB → restore → decrypt produces the same plaintext. Verify cross-org isolation in API tests.
