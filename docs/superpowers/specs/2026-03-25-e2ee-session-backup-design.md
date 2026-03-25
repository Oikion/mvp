# E2EE Server-Mediated Session Sync — Design Spec

> **Date**: 2026-03-25
> **Finding**: H-6 (No Session Recovery After IndexedDB Clear)
> **Status**: Approved — ready for implementation planning
> **Revision**: 2 (post spec-review — 4 blocking issues + 3 concerns resolved)
> **Related**: [application-security.md](../../security/application-security.md), [e2ee-architecture.md](../../security/e2ee-architecture.md)

## Problem

When a user clears browser data, switches devices, or loses their IndexedDB (browser update, private mode), all E2EE sessions are permanently lost. Double Ratchet (DM) and Megolm outbound/inbound (group/entity) sessions are stored exclusively in IndexedDB. No server-side backup exists for these sessions.

**Impact**: Users cannot decrypt messages in existing conversations. Group/entity sessions must be re-established. DM conversations require a new X3DH handshake, and all prior messages become undecryptable.

**This also blocks multi-device usage**: A user on two devices (phone + laptop) cannot share E2EE sessions between them. Each device operates independently.

## Solution: Server-Mediated Session Sync

Store encrypted session backups on the server. Any authenticated device with the correct PIN can fetch and restore them. Uses dual-layer encryption: ECIES (client-side, identity-key-bound) nested inside per-org DEK wrapping (server-side).

### Security Model

Four independent factors protect session backups at rest:

1. **DB access + Master key** (`SECRETS_ENCRYPTION_KEY`) — required to obtain the org DEK
2. **Org DEK** — required to peel the outer encryption layer (server-side factor)
3. **User's PIN** — required to derive the KEK and unwrap the identity private key (knowledge factor)
4. **Identity private key** — derived from factor 3 + server-stored wrapped material; required to ECIES-decrypt the inner layer

> **Note on factor independence**: Factors 3 and 4 are coupled — the identity private key is unwrapped using the PIN-derived KEK. An attacker who has factors 1+2 AND factor 3 (PIN) can reconstruct factor 4. The true independent factors are: *server access* (1+2), *PIN knowledge* (3→4). This provides two-party security: server alone cannot decrypt, PIN alone cannot decrypt.

This is the same security model used by Signal's SVR (Secure Value Recovery) and WhatsApp's encrypted backups: server-stored encrypted material, protected by a user-chosen credential.

### Compliance

- **GDPR Article 32**: Backups encrypted at rest (DEK + ECIES). Processor cannot access content.
- **Data minimization**: Only session state is backed up — no message content, no plaintext PII.
- **Right to erasure**: "Clear all backups" in settings + `DELETE` API endpoint.
- **Data portability**: Backups are ECIES-encrypted to user's key — exportable and self-decryptable.
- **Greek Law 4624/2019**: Follows GDPR requirements. No additional E2EE-specific mandates.
- **ePrivacy Directive**: Server cannot read communication content. Confidentiality maintained.

### Standards

- ECIES — ISO/IEC 18033-2
- AES-256-GCM — NIST SP 800-38D
- PBKDF2-SHA256 (600k iterations) — NIST SP 800-132
- Envelope encryption (DEK wrapping) — standard KMS pattern

---

## Data Model

```prisma
model E2eeSessionBackup {
  id              String   @id @default(uuid())
  userId          String                          // Clerk user ID (owner)
  organizationId  String                          // Org that owns the DEK used for wrapping
  sessionType     String                          // "ratchet" | "megolm-out" | "megolm-in"
  sessionKey      String                          // Same format as IndexedDB key (max ~200 chars for UUID-based keys)
  encryptedState  String   @db.Text               // DEK-wrapped ECIES blob (~1.37x overhead from base64+hex encoding)
  ephemeralPubKey String                          // ECIES ephemeral public key (base64)
  iv              String                          // ECIES AES-GCM IV (base64)
  dekVersion      Int                             // OrgEncryptionKey.keyVersion used for DEK wrapping
  version         Int      @default(1)            // Incremented on each update (optimistic concurrency)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userId, organizationId, sessionType, sessionKey])
  @@index([userId, organizationId])
}
```

**Key design decisions:**
- **`organizationId` column (review fix #1)**: Required because Clerk supports multi-org. A user in Org A and Org B has sessions encrypted with different DEKs. Without org scoping, switching orgs would cause DEK mismatch on restore. All queries filter by `organizationId` per the project's tenant isolation invariant.
- **`dekVersion` column (review fix #5)**: Records which DEK version was used for wrapping. After a DEK rotation, the GET endpoint uses `getOrgDekByVersion(orgId, dekVersion)` to unwrap old backups correctly. New backups use the current active DEK version.
- **`sessionType` excludes `"otp"` (review fix #7)**: OTP pre-keys are NOT backed up. They are one-time-use by design — backing them across devices would allow the same key to be used twice, violating the Signal protocol's OTP guarantee. OTP keys are regenerated per-device via the existing replenishment flow.
- `@@unique([userId, organizationId, sessionType, sessionKey])` — one backup per session per user per org. Upsert on conflict.
- `encryptedState` is `@db.Text` — session state can be several KB (Double Ratchet with skipped keys). ECIES + DEK wrapping adds ~1.37x overhead from base64+hex encoding (10KB state → ~14KB stored).
- `version` enables optimistic concurrency and conflict resolution between devices.

---

## Data Flow

### Backup (client → server)

```
CLIENT                                   SERVER
──────                                   ──────

1. Session state changes
   (encrypt/decrypt/init)

2. markDirty(sessionType, sessionKey)
   → adds to dirtyKeys Map
   → resets 5-second debounce timer

3. Timer fires → flush()
   Batch all dirty sessions into ONE request:
   a. Read serialized state for each from IndexedDB
   b. ECIES-encrypt each with user's identity
      PUBLIC key → {eciesBlob, ephPubKey, iv}
   c. POST /api/e2ee/session-backups       →  4. Auth: userId + orgId from Clerk
      Body: { backups: [{sessionType,           5. Zod validate body (max 50 per batch)
              sessionKey, eciesBlob,             6. Get org DEK + version
              ephPubKey, iv}, ...] }             7. DEK-wrap each eciesBlob
                                                 8. Upsert each E2eeSessionBackup
                                                    (version incremented on conflict)
                                                 9. Return { results: [{sessionKey, version}] }
```

### Restore (server → client)

```
CLIENT                                   SERVER
──────                                   ──────

1. User enters PIN → identity key
   unwrapped (existing flow)

2. GET /api/e2ee/session-backups       →  3. Auth: userId + orgId from Clerk
                                           4. Fetch all E2eeSessionBackup for userId+orgId
                                           5. DEK-unwrap each using getOrgDekByVersion(orgId, dekVersion)
                                           6. Return [{sessionType, sessionKey,
                                                       eciesBlob, ephPubKey, iv, version}]

7. For each backup:                    ←
   a. ECIES-decrypt with identity
      PRIVATE key → plaintext state
   b. Check IndexedDB for existing session
      (compare version from backup-versions store)
      - Has session with >= version? → skip
      - Missing or older version? → import to IndexedDB
   c. Add to in-memory cache

8. Ready — all sessions available
```

### Delete (GDPR right to erasure)

```
DELETE /api/e2ee/session-backups
Auth: userId + orgId from Clerk
Server: DELETE FROM E2eeSessionBackup WHERE userId = :userId AND organizationId = :orgId
Response: { deleted: count }
Rate limit: strict tier (10 req/min)
```

---

## API Routes

### `POST /api/e2ee/session-backups`

Batch upsert session backups. Called by the debounced backup manager.

```typescript
// Zod schema
const SessionBackupItemSchema = z.object({
  sessionType: z.enum(["ratchet", "megolm-out", "megolm-in"]),  // No "otp" — see design decision
  sessionKey: z.string().min(1).max(512),
  eciesBlob: z.string().min(1).max(65536),    // 64KB max per blob
  ephemeralPubKey: z.string().min(1).max(512),
  iv: z.string().min(1).max(64),
}).strict();

const SessionBackupBatchSchema = z.object({
  backups: z.array(SessionBackupItemSchema).min(1).max(50),  // Max 50 per batch
}).strict();
```

**Security:**
- Auth: `userId` + `orgId` from `auth()` — both required
- Rate limit: `lenient` tier (120 req/min)
- Blob size: 64KB max per item (consistent with entity session share limits)
- Batch size: max 50 items per request (prevents unbounded writes)

**Server logic:**
1. Validate body with Zod
2. Get org DEK + version: `const dek = await getOrgDek(orgId)` + `const dekVer = await getOrgKeyVersion(orgId)`
3. For each backup in batch:
   a. DEK-wrap: `encryptWithKey(item.eciesBlob, dek)`
   b. Upsert with `{ userId, organizationId: orgId, sessionType, sessionKey }` as the unique key
   c. Set `dekVersion: dekVer`, increment `version` on conflict
4. Return results array with `{ sessionKey, version }` per item

### `GET /api/e2ee/session-backups`

Fetch all session backups for the authenticated user in the current org.

**Query params:** `?sessionType=ratchet` (optional filter)

**Security:**
- Auth: `userId` + `orgId` from `auth()` — both required
- Rate limit: `lenient` tier

**Server logic:**
1. Fetch backups: `findMany({ where: { userId, organizationId: orgId } })`
2. For each backup, DEK-unwrap using the correct version: `decryptWithKey(encryptedState, await getOrgDekByVersion(orgId, backup.dekVersion))`
3. Return array of `{ sessionType, sessionKey, eciesBlob, ephemeralPubKey, iv, version, updatedAt }`

Note: `updatedAt` is included so the UI can display "Last synced: N minutes ago."

### `DELETE /api/e2ee/session-backups`

Delete all session backups for the authenticated user in the current org (GDPR erasure).

**Security:**
- Auth: `userId` + `orgId` from `auth()` — both required
- Rate limit: `strict` tier (10 req/min) — prevents abuse

**Server logic:**
1. `deleteMany({ where: { userId, organizationId: orgId } })`
2. Return `{ deleted: count }`

---

## Client-Side: SessionBackupManager

New module: `lib/e2ee/session-backup.ts` (with `"use client"` directive)

### Class Design

```typescript
class SessionBackupManager {
  private dirtyKeys = new Map<string, { sessionType: string; sessionKey: string; state: string }>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private consecutiveFailures = 0;

  constructor(
    private getIdentityPublicKey: () => CryptoKey,
    private getIdentityPrivateKey: () => CryptoKey,
  ) {}

  // Called after every IndexedDB session write. Receives the serialized state.
  markDirty(sessionType: string, sessionKey: string, serializedState: string): void;

  // Debounced: ECIES-encrypts dirty sessions, POSTs batch to server
  private scheduleFlush(): void;
  private async flush(): Promise<void>;

  // On E2EE lock: attempt best-effort flush via navigator.sendBeacon or keepalive fetch
  flushOnUnload(): void;

  // On unlock: fetch all backups from server, ECIES-decrypt, import to IndexedDB.
  // Needs both KEK (for IndexedDB writes) and identity private key (for ECIES decrypt).
  async restoreAll(kek: ArrayBuffer): Promise<RestoreResult>;

  // Clear all server backups (GDPR)
  async clearAll(): Promise<void>;
}

interface RestoreResult {
  restored: number;
  skipped: number;
  errors: number;
}
```

### Page Unload Strategy (review fix #4)

`async flush()` with `await fetch()` does NOT work reliably in `beforeunload` — browsers cancel async operations during page teardown.

Strategy:
- **Primary mechanism**: The 5-second debounce timer. Under normal use, backups are at most 5 seconds stale.
- **On E2EE lock** (`lock()` called explicitly): Call `flush()` — this is a user-initiated action, the page isn't closing.
- **On `visibilitychange` (hidden)**: Attempt `navigator.sendBeacon()` with the batch payload if dirty sessions exist. `sendBeacon` is fire-and-forget (no response), limited to 64KB per origin, but reliable during page transitions.
- **On `beforeunload`**: Same `sendBeacon` attempt. Does NOT use `fetch` or `await`.
- **Accepted risk**: If the browser crashes (not a clean close), up to 5 seconds of ratchet state changes are lost. This is the same risk as the current system (IndexedDB writes are also not guaranteed to persist through a crash).

For `sendBeacon`, the server needs a dedicated lightweight endpoint:
```
POST /api/e2ee/session-backups/beacon
Content-Type: text/plain (sendBeacon limitation)
Body: JSON-stringified batch payload
```
This endpoint parses the same `SessionBackupBatchSchema` but accepts `text/plain` content type.

### Version Tracking in IndexedDB (review fix #3)

IndexedDB's `EncryptedEntry` interface (`session-store.ts`) currently stores `{ id, ciphertext, iv }`. To track backup versions locally, add a new IndexedDB store:

```typescript
const BACKUP_VERSIONS_STORE = "backup-versions";  // DB_VERSION bumped to 3

// Stored entries: { id: "ratchet:<convId>", version: 5 }
interface BackupVersionEntry {
  id: string;     // Same key as the session entry
  version: number;
}
```

This is cheaper than modifying the `EncryptedEntry` interface (which would require migrating all existing entries). The version store is small (one int per session) and is only read during restore to decide "skip or import."

### Integration Points

Every function in `lib/e2ee/index.ts` that writes to IndexedDB also calls `markDirty`:

| Function | Backup type | Backup key |
|----------|------------|------------|
| `encryptDM()` / `decryptDM()` | `ratchet` | `ratchet:${conversationId}` |
| `initiateDMSession()` / `acceptDMSession()` | `ratchet` | `ratchet:${conversationId}` |
| `encryptGroup()` | `megolm-out` | `megolm-out:${targetId}` |
| `decryptGroup()` | `megolm-in` | `megolm-in:${sessionId}` |
| `createGroupSession()` | `megolm-out` | `megolm-out:${targetId}` |
| `importGroupSession()` | `megolm-in` | `megolm-in:${sessionId}` |
| `encryptEntityComment()` | `megolm-out` | `megolm-out:entity:${type}:${id}` |
| `decryptEntityComment()` | `megolm-in` | `megolm-in:${sessionId}` |

**OTP pre-keys are NOT backed up** (review fix #7). They are device-local and regenerated via the existing replenishment flow. Each device independently generates and uploads its own OTP keys.

### Restore Flow (on unlock)

```
unlock() existing flow
    │
    ├── Identity key unwrapped (both ECDH + Ed25519)
    ├── _kekRaw set
    │
    ├── NEW: backupManager.restoreAll(_kekRaw)
    │   ├── GET /api/e2ee/session-backups
    │   ├── For each backup:
    │   │   ├── ECIES-decrypt with identity PRIVATE key
    │   │   ├── Read local version from backup-versions store
    │   │   │   ├── Local version >= server version → skip
    │   │   │   └── Missing or local < server → write to IndexedDB (encrypted with KEK)
    │   │   │       + update backup-versions store
    │   │   └── Populate in-memory cache
    │   └── Return { restored: N, skipped: N, errors: N }
    │
    └── setState({ isUnlocked: true })
```

### Conflict Resolution

| Scenario | Resolution |
|----------|-----------|
| Local version == server version | Skip (already synced) |
| Local version > server version | Keep local, upload to server on next flush |
| Local version < server version | Replace local with server version |
| No local session, server has backup | Import from server |
| Local session, no server backup | Upload on next flush |

---

## UI/UX Changes

### E2EESessionButton States

| State | Icon | Color | Action |
|-------|------|-------|--------|
| Not set up | `ShieldAlert` | Warning orange | Open PinSetupDialog |
| Locked | `Lock` | Muted | Open PinEntryDialog |
| **Syncing** | `RefreshCw` (animated) | Muted | None (auto-resolves in 1-3s) |
| Unlocked | `LockOpen` | Success green | Show status / lock |

### PinEntryDialog Enhancement

After PIN entry succeeds, show brief "Syncing encrypted sessions..." state before transitioning to unlocked. If restore takes > 3 seconds, show a progress count: "Restoring sessions (12/18)..."

### Conflict Toast

When the backup manager detects a newer server version during flush:
```
useAppToast().info("Encrypted sessions synced from another device.")
```

### Error Toasts

| Scenario | Toast |
|----------|-------|
| Restore fails (network) | `info`: "Could not sync encrypted sessions. Some conversations may be unavailable until reconnected." |
| Backup flush fails (3x consecutive) | `info`: "Session backup delayed — check your connection." |
| ECIES decrypt fails (corrupted backup) | Silent — logged server-side, session treated as missing |

### Settings Page (Security tab)

Add to existing `/app/[locale]/app/(routes)/settings/security/`:

```
Session Backup
──────────────
Status: ● Synced (Last: 2 minutes ago)
Sessions backed up: 14

[Force Sync Now]  [Clear All Backups]
```

- "Force Sync Now" triggers `backupManager.flush()` (immediate, not debounced)
- "Clear All Backups" calls `DELETE /api/e2ee/session-backups` + confirmation dialog (`AlertDialog` per component conventions)

---

## DEK Rotation Handling (review fix #5)

When `rotateOrgDek(orgId)` runs:
1. Existing backups remain encrypted with the OLD DEK version (recorded in `dekVersion` column).
2. The GET endpoint uses `getOrgDekByVersion(orgId, backup.dekVersion)` — NOT the current active DEK — to unwrap each backup.
3. New backups are encrypted with the new active DEK and tagged with its version.
4. **Optional future enhancement**: A background job re-encrypts old backups with the new DEK (similar to the `migrate-to-org-dek.ts` script). Not required for correctness — `getOrgDekByVersion` handles old versions — but reduces the number of DEK versions that must be retained.

---

## Known Limitations

1. **Concurrent DM ratchets**: Two devices in the same DM simultaneously will diverge. Version-based sync resolves by newest-wins, but the "losing" device's recent messages may become undecryptable. Acceptable for a business tool where simultaneous same-DM usage is rare.

2. **5-second backup window**: Ratchet state changes within the debounce window are lost if the browser crashes. At most a few messages become undecryptable on restore.

3. **No backup version history**: Only the latest version is stored. Corrupted backups have no rollback. Could add `maxVersions` retention in the future.

4. **Server availability required for restore on new device**: If server is down during first unlock on a new device, no sessions are available. Normal page refreshes use IndexedDB (unaffected).

5. **`sendBeacon` 64KB limit**: If more than ~50 sessions are dirty at page close, the beacon payload may exceed 64KB and be silently dropped. The debounce timer is the primary backup mechanism; beacon is best-effort.

6. **OTP keys not synced across devices**: Each device generates its own OTP pre-keys independently. A sender's X3DH handshake uses the OTP key from whichever device uploaded it. This is correct per the Signal protocol but means Device B cannot complete DH4 for an OTP key generated by Device A.

---

## Testing Strategy

### Unit Tests (Vitest)

- `SessionBackupManager.markDirty()` debounce timing (5s)
- ECIES encrypt → DEK wrap → DEK unwrap (by version) → ECIES decrypt round-trip
- Restore into empty IndexedDB (fresh device scenario)
- Restore with existing IndexedDB (version comparison: local wins, server wins, equal)
- `flush()` batches multiple dirty sessions into one request
- Error handling: network failure during flush → `consecutiveFailures` incremented, retry on next cycle
- `flushOnUnload()` calls `navigator.sendBeacon` (mock test)

### API Route Tests

- POST batch with valid body → 200 + stored (check `dekVersion` matches active)
- POST batch with > 50 items → 400 (Zod)
- POST with `sessionType: "otp"` → 400 (not allowed)
- POST with blob > 64KB → 400
- POST without orgId → 401
- POST for different org → backups isolated by org (verify query scoping)
- GET returns only userId + orgId scoped backups
- GET DEK-unwraps using correct `dekVersion` (test with rotated key)
- GET includes `updatedAt` in response
- DELETE removes only current org's backups, not other orgs
- DELETE rate-limited at strict tier

### Integration Tests

- Full cycle: encrypt DM → backup fires → clear IndexedDB → unlock → restore → decrypt same DM
- Multi-session restore (ratchet + megolm-out + megolm-in in one GET)
- Cross-device simulation: Device A encrypts → backup → Device B restores → decrypts
- DEK rotation: backup with old DEK → rotate → restore still works via `dekVersion`

---

## Files to Create / Modify

### New Files
- `prisma/migrations/YYYYMMDD_add_e2ee_session_backup/migration.sql`
- `app/api/e2ee/session-backups/route.ts` (POST, GET, DELETE)
- `app/api/e2ee/session-backups/beacon/route.ts` (POST — sendBeacon endpoint)
- `lib/e2ee/session-backup.ts` (SessionBackupManager class, `"use client"`)

### Modified Files
- `prisma/schema.prisma` — add `E2eeSessionBackup` model
- `lib/e2ee/session-store.ts` — add `backup-versions` store (DB_VERSION 2→3), version read/write helpers
- `lib/e2ee/index.ts` — integrate `markDirty()` calls after every IndexedDB write, add restore to `unlock()`
- `hooks/useE2EE.ts` — add "syncing" state, call restore during unlock, register unload handlers
- `components/layout/E2EESessionButton.tsx` — add syncing state icon
- `components/e2ee/PinEntryDialog.tsx` — add "Syncing..." progress after PIN entry
- `app/[locale]/app/(routes)/settings/security/page.tsx` — add backup status section
- `docs/security/application-security.md` — update H-6 status
- `docs/security/e2ee-architecture.md` — add session backup section

---

## Spec Review Fixes Applied

| # | Issue | Resolution |
|---|-------|------------|
| 1 | Missing `organizationId` (multi-org DEK mismatch) | Added `organizationId` column + scoped unique constraint + all queries filter by orgId |
| 2 | Overstated "five-factor" security | Corrected to four independent factors with note on coupling |
| 3 | No version tracking in IndexedDB | Added `backup-versions` IndexedDB store (DB_VERSION 3) |
| 4 | `flushNow()` unreliable on page unload | Replaced with `flushOnUnload()` using `sendBeacon`; documented as best-effort |
| 5 | DEK rotation breaks existing backups | Added `dekVersion` column; GET uses `getOrgDekByVersion()` |
| 6 | Unbounded batch POSTs | Changed to single batch POST (max 50 items per request) |
| 7 | OTP backup creates one-time-use violation | Excluded OTP from backup; each device regenerates independently |
