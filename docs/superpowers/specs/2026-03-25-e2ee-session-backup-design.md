# E2EE Server-Mediated Session Sync — Design Spec

> **Date**: 2026-03-25
> **Finding**: H-6 (No Session Recovery After IndexedDB Clear)
> **Status**: Approved — ready for implementation planning
> **Related**: [application-security.md](../../security/application-security.md), [e2ee-architecture.md](../../security/e2ee-architecture.md)

## Problem

When a user clears browser data, switches devices, or loses their IndexedDB (browser update, private mode), all E2EE sessions are permanently lost. Double Ratchet (DM), Megolm outbound/inbound (group/entity), and OTP pre-key private keys are stored exclusively in IndexedDB. No server-side backup exists for these sessions.

**Impact**: Users cannot decrypt messages in existing conversations. Group/entity sessions must be re-established. DM conversations require a new X3DH handshake, and all prior messages become undecryptable.

**This also blocks multi-device usage**: A user on two devices (phone + laptop) cannot share E2EE sessions between them. Each device operates independently.

## Solution: Server-Mediated Session Sync

Store encrypted session backups on the server. Any authenticated device with the correct PIN can fetch and restore them. Uses dual-layer encryption: ECIES (client-side, identity-key-bound) nested inside per-org DEK wrapping (server-side).

### Security Model

Five-factor protection for session backups at rest:

1. **DB access** — required to read the stored blob
2. **Master key** (`SECRETS_ENCRYPTION_KEY`) — required to unwrap the org DEK
3. **Org DEK** — required to peel the outer encryption layer
4. **Identity private key** — required to ECIES-decrypt the inner layer
5. **User's PIN** — required to unwrap the identity private key

An attacker needs ALL FIVE to read session state. The server can only peel the DEK layer — the ECIES layer remains opaque without the user's PIN.

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
  sessionType     String                          // "ratchet" | "megolm-out" | "megolm-in" | "otp"
  sessionKey      String                          // Same format as IndexedDB key
  encryptedState  String   @db.Text               // DEK-wrapped ECIES blob
  ephemeralPubKey String                          // ECIES ephemeral public key
  iv              String                          // ECIES AES-GCM IV
  version         Int      @default(1)            // Incremented on each update
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userId, sessionType, sessionKey])
  @@index([userId])
}
```

**Key design decisions:**
- `@@unique([userId, sessionType, sessionKey])` — one backup per session per user. Upsert on conflict.
- `encryptedState` is `@db.Text` — session state can be several KB (Double Ratchet with skipped keys).
- `version` enables optimistic concurrency and conflict resolution between devices.
- No `orgId` column — the user's org is resolved via Clerk auth at request time. The DEK is fetched via `getOrgDek(orgId)`.

---

## Data Flow

### Backup (client → server)

```
CLIENT                                   SERVER
──────                                   ──────

1. Session state changes
   (encrypt/decrypt/init)

2. markDirty(sessionType, sessionKey)
   → adds to dirtyKeys Set
   → resets 5-second debounce timer

3. Timer fires → flush()
   For each dirty session:
   a. Read serialized state from IndexedDB
   b. ECIES-encrypt with user's identity
      PUBLIC key → {eciesBlob, ephPubKey, iv}
   c. POST /api/e2ee/session-backups       →  4. Auth: userId + orgId from Clerk
      Body: {sessionType, sessionKey,           5. Zod validate body
             eciesBlob, ephPubKey, iv}          6. DEK-wrap: encryptWithKey(eciesBlob, orgDek)
                                                7. Upsert E2eeSessionBackup
                                                   (version incremented on conflict)
                                                8. Return { id, version }
```

### Restore (server → client)

```
CLIENT                                   SERVER
──────                                   ──────

1. User enters PIN → identity key
   unwrapped (existing flow)

2. GET /api/e2ee/session-backups       →  3. Auth: userId + orgId from Clerk
                                           4. Fetch all E2eeSessionBackup for userId
                                           5. DEK-unwrap each: decryptWithKey(encryptedState, orgDek)
                                           6. Return [{sessionType, sessionKey,
                                                       eciesBlob, ephPubKey, iv, version}]

7. For each backup:                    ←
   a. ECIES-decrypt with identity
      PRIVATE key → plaintext state
   b. Check IndexedDB:
      - Has session with >= version? → skip
      - Missing or older version? → import
   c. Add to in-memory cache

8. Ready — all sessions available
```

### Delete (GDPR right to erasure)

```
DELETE /api/e2ee/session-backups
Auth: userId from Clerk
Server: DELETE FROM E2eeSessionBackup WHERE userId = :userId
Response: { deleted: count }
```

---

## API Routes

### `POST /api/e2ee/session-backups`

Upsert a session backup. Called by the debounced backup manager.

```typescript
// Zod schema
const SessionBackupSchema = z.object({
  sessionType: z.enum(["ratchet", "megolm-out", "megolm-in", "otp"]),
  sessionKey: z.string().min(1).max(256),
  eciesBlob: z.string().min(1).max(65536),    // 64KB max
  ephemeralPubKey: z.string().min(1).max(256),
  iv: z.string().min(1).max(64),
}).strict();
```

**Security:**
- Auth: `userId` + `orgId` from `auth()` — both required
- Rate limit: `lenient` tier (120 req/min)
- Blob size: 64KB max (consistent with entity session share limits)
- Session key pattern: validated by Zod string constraints

**Server logic:**
1. Validate body with Zod
2. Get org DEK: `const dek = await getOrgDek(orgId)`
3. DEK-wrap: `const wrapped = encryptWithKey(body.eciesBlob, dek)`
4. Upsert: `prismadb.e2eeSessionBackup.upsert({ where: unique constraint, create: {...}, update: { encryptedState: wrapped, version: { increment: 1 } } })`

### `GET /api/e2ee/session-backups`

Fetch all session backups for the authenticated user.

**Query params:** `?sessionType=ratchet` (optional filter)

**Server logic:**
1. Fetch all backups: `prismadb.e2eeSessionBackup.findMany({ where: { userId } })`
2. For each backup, DEK-unwrap: `decryptWithKey(backup.encryptedState, dek)`
3. Return array of ECIES blobs (client decrypts with identity private key)

### `DELETE /api/e2ee/session-backups`

Delete all session backups for the authenticated user (GDPR erasure).

**Server logic:**
1. `prismadb.e2eeSessionBackup.deleteMany({ where: { userId } })`
2. Return `{ deleted: count }`

---

## Client-Side: SessionBackupManager

New module: `lib/e2ee/session-backup.ts`

### Class Design

```typescript
class SessionBackupManager {
  private dirtyKeys = new Map<string, string>();  // "type:key" → serialized state
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private flushInProgress = false;
  private consecutiveFailures = 0;

  constructor(
    private getIdentityPublicKey: () => CryptoKey,
    private getIdentityPrivateKey: () => CryptoKey,
  ) {}

  // Called after every IndexedDB session write
  markDirty(sessionType: string, sessionKey: string, serializedState: string): void {
    this.dirtyKeys.set(`${sessionType}:${sessionKey}`, serializedState);
    this.scheduleFlush();
  }

  // Debounced: ECIES-encrypt dirty sessions, POST to server
  private scheduleFlush(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flush(), 5000);
  }

  // Immediate flush (called on lock/page unload)
  async flushNow(): Promise<void> {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    await this.flush();
  }

  // Fetch all backups from server, ECIES-decrypt, import to IndexedDB
  async restoreAll(kek: ArrayBuffer): Promise<RestoreResult> { ... }

  // Clear all server backups (GDPR)
  async clearAll(): Promise<void> { ... }
}
```

### Integration Points

Every function in `lib/e2ee/index.ts` that writes to IndexedDB also calls `markDirty`:

| Function | Backup key |
|----------|------------|
| `encryptDM()` / `decryptDM()` | `ratchet:${conversationId}` |
| `initiateDMSession()` / `acceptDMSession()` | `ratchet:${conversationId}` |
| `encryptGroup()` | `megolm-out:${targetId}` |
| `decryptGroup()` | `megolm-in:${sessionId}` |
| `createGroupSession()` | `megolm-out:${targetId}` |
| `importGroupSession()` | `megolm-in:${sessionId}` |
| `encryptEntityComment()` | `megolm-out:entity:${type}:${id}` |
| `decryptEntityComment()` | `megolm-in:${sessionId}` |
| `generatePreKeys()` | `otp:${keyId}` (each key) |

### Restore Flow (on unlock)

```
unlock() existing flow
    │
    ├── Identity key unwrapped
    ├── _kekRaw set
    │
    ├── NEW: backupManager.restoreAll(_kekRaw)
    │   ├── GET /api/e2ee/session-backups
    │   ├── For each backup:
    │   │   ├── ECIES-decrypt with identity private key
    │   │   ├── Check IndexedDB for existing session
    │   │   │   ├── Exists with >= version → skip
    │   │   │   └── Missing or older → write to IndexedDB (encrypted with KEK)
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

- "Force Sync Now" triggers `backupManager.flushNow()`
- "Clear All Backups" calls `DELETE /api/e2ee/session-backups` + confirmation dialog

---

## Known Limitations

1. **Concurrent DM ratchets**: Two devices in the same DM simultaneously will diverge. Version-based sync resolves by newest-wins, but the "losing" device's recent messages may become undecryptable. Acceptable for a business tool where simultaneous same-DM usage is rare.

2. **5-second backup window**: Ratchet state changes within the debounce window are lost if the browser crashes. At most a few messages become undecryptable on restore. Acceptable trade-off vs per-message HTTP overhead.

3. **No backup version history**: Only the latest version is stored. Corrupted backups have no rollback. Could add `maxVersions` retention in the future.

4. **Server availability required for restore on new device**: If server is down during first unlock on a new device, no sessions are available. Normal page refreshes use IndexedDB (unaffected).

---

## Testing Strategy

### Unit Tests (Vitest)

- `SessionBackupManager.markDirty()` debounce timing (5s)
- ECIES encrypt → DEK wrap → DEK unwrap → ECIES decrypt round-trip
- Restore into empty IndexedDB (fresh device scenario)
- Restore with existing IndexedDB (version comparison: local wins, server wins, equal)
- `flushNow()` on lock clears debounce timer
- Error handling: network failure during flush → retry on next cycle

### API Route Tests

- POST with valid body → 200 + stored
- POST with missing fields → 400 (Zod)
- POST with blob > 64KB → 400
- POST for different org's data → 403/404
- GET returns only authenticated user's backups
- GET DEK-unwraps correctly
- DELETE removes all user backups

### Integration Tests

- Full cycle: encrypt DM → backup fires → clear IndexedDB → unlock → restore → decrypt same DM
- Multi-session restore (ratchet + megolm-out + megolm-in)
- Cross-device simulation: Device A encrypts → backup → Device B restores → decrypts

---

## Files to Create / Modify

### New Files
- `prisma/migrations/YYYYMMDD_add_e2ee_session_backup/migration.sql`
- `app/api/e2ee/session-backups/route.ts` (POST, GET, DELETE)
- `lib/e2ee/session-backup.ts` (SessionBackupManager class)

### Modified Files
- `prisma/schema.prisma` — add `E2eeSessionBackup` model
- `lib/e2ee/index.ts` — integrate `markDirty()` calls after every IndexedDB write, add restore to `unlock()`
- `hooks/useE2EE.ts` — add "syncing" state, call restore during unlock
- `components/layout/E2EESessionButton.tsx` — add syncing state icon
- `components/e2ee/PinEntryDialog.tsx` — add "Syncing..." progress after PIN entry
- `app/[locale]/app/(routes)/settings/security/page.tsx` — add backup status section
- `docs/security/application-security.md` — update H-6 status
- `docs/security/e2ee-architecture.md` — add session backup section
