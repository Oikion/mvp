# E2EE Architecture — Oikion MVP

> **Date**: 2026-03-25
> **Scope**: All encryption systems in the application
> **Status**: Active (three parallel systems — see System III for retirement note)

---

## Overview

The application implements three distinct encryption systems that operate in parallel, each serving a different threat model and data surface. They share no session state, no key material, and have separate unlock flows.

| System | Name | Scope | Status |
|--------|------|-------|--------|
| I | Server-Side Field Encryption (Per-Org DEK) | CRM/MLS PII fields at rest | Active (production) |
| II | Client-Side Passphrase E2EE (OMK) | CRM/MLS field display in browser | Active — scheduled for retirement |
| III | Advanced Messaging E2EE (Signal Protocol) | DMs, group channels, entity comments | Active (messaging subsystem) |

---

## System I — Server-Side Field Encryption (Per-Org DEK)

### Purpose

Encrypt sensitive PII fields before writing to PostgreSQL. The server holds both the plaintext (after processing) and the key material. This protects against database-level breaches — a dump of the `clients` table without the master key reveals only ciphertext.

### Key Files

| File | Role |
|------|------|
| [lib/encryption.ts](../../lib/encryption.ts) | AES-256-GCM primitives, `isEncrypted()` detection |
| [lib/key-management.ts](../../lib/key-management.ts) | Per-org DEK lifecycle, 3-tier caching |
| [lib/model-encryption.ts](../../lib/model-encryption.ts) | Typed encrypt/decrypt helpers per model |
| [lib/platform-key-management.ts](../../lib/platform-key-management.ts) | Platform-wide DEK for non-org data |

### Algorithm

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **IV**: 16 bytes random, stored with ciphertext
- **Auth Tag**: 16 bytes, provides tamper detection
- **Ciphertext format**: `<iv_hex>:<authTag_hex>:<ciphertext_hex>` (colon-separated)

### Key Hierarchy

```
SECRETS_ENCRYPTION_KEY (env var, 32 bytes / 64 hex)
         │
         │  AES-256-GCM wraps
         ▼
OrgEncryptionKey.encryptedDek  (PostgreSQL)
         │
         │  decrypt → raw 32-byte Buffer
         ▼
Per-Org DEK
         │
         │  AES-256-GCM encrypts
         ▼
Field ciphertext stored in DB
```

### DEK Caching (3-Tier)

Avoids a DB round-trip on every request. The raw DEK is never sent over the network.

```
Request arrives
      │
      ▼
L1: In-process Map (5-min TTL, per serverless instance)
      │ miss
      ▼
L2: Redis (10-min TTL, stores encrypted DEK string only)
      │ miss
      ▼
L3: PostgreSQL OrgEncryptionKey table (source of truth)
      │
      ▼ (on new org)
Generate fresh 32-byte random DEK → encrypt → store
```

The Redis L2 cache stores the **encrypted** DEK (not the raw key), so a Redis breach alone is insufficient — the master key is also required.

### Encrypted Fields by Model

**Clients** (26 string + 1 JSON):
`client_name`, `full_name`, `company_name`, `company_id`, `primary_email`, `secondary_email`, `primary_phone`, `secondary_phone`, `office_phone`, `fax`, `afm`, `vat`, `doy`, `id_doc`, `company_gemi`, `description`, all `billing_*` and `shipping_*` address fields (10 total), `communication_notes` (JSON)

**Properties** (1 string + 1 JSON):
`primary_email`, `communication_notes`
_(Addresses and property names intentionally NOT encrypted — required for MLS searchability)_

**Mandates** (2 string + 1 JSON):
`title`, `notes`, `communication_notes`

**CalendarEvents** (6 string):
`title`, `description`, `location`, `attendeeEmail`, `attendeeName`, `notes`

**Documents** (2 string):
`document_name`, `description`

**Messages/Comments** (1 string):
`content`

**MyAccount** (8 string):
`VAT_number`, `TAX_number`, `bank_name`, `bank_account`, `bank_code`, `bank_IBAN`, `bank_SWIFT`, `email_accountant`

**NewsletterSubscriber** (3 string):
`email`, `firstName`, `lastName`

**AgentContactSubmission** (3 string + 1 JSON):
`senderName`, `senderEmail`, `notes`, `formData`

### Usage Pattern

```typescript
// On write — encrypt then persist
const encrypted = await encryptClientForOrg(data, organizationId);
await prismadb.clients.create({ data: encrypted });

// On read — fetch then decrypt
const raw = await prismadb.clients.findFirst({ where: { id, organizationId } });
const client = await decryptClientForOrg(raw, organizationId);
```

Encryption is **idempotent** — `isEncrypted()` guards against double-encryption. Decryption is **partial-safe** — only decrypts fields that are present in the object.

### Key Rotation

`rotateOrgDek(orgId)` creates a new key version atomically (old deactivated, new created in `$transaction`). After rotation, existing ciphertext remains readable via `getOrgDekByVersion()` until a background re-encryption migration runs. The fallback in `decryptWithKey()` also handles data encrypted before the per-org DEK system was introduced (falls back to master key).

### Platform Encryption

Non-org-scoped data (`FeedbackComments`, `AgentContactSubmissions`) uses a single platform-wide DEK managed by `lib/platform-key-management.ts`, backed by the `PlatformEncryptionKey` table. Same caching strategy and ciphertext format.

---

## System II — Client-Side Passphrase E2EE (OMK)

### Purpose

Field-level encryption driven by an Organization Master Key that lives **only in the browser**. The server stores wrapped key material but cannot decrypt content — only users with the passphrase can. This extends System I for higher-sensitivity orgs that want true end-to-end protection for displayed PII.

> **Note**: This system is marked for retirement pending the Unified Encryption Architecture spec (`docs/superpowers/specs/2026-03-15-unified-encryption-architecture-design.md`). It remains fully operational.

### Key Files

| File | Role |
|------|------|
| [lib/crypto/constants.ts](../../lib/crypto/constants.ts) | Algorithm constants (iterations, IV length, prefix) |
| [lib/crypto/key-derivation.ts](../../lib/crypto/key-derivation.ts) | PBKDF2-SHA256 passphrase → KEK |
| [lib/crypto/key-wrapping.ts](../../lib/crypto/key-wrapping.ts) | OMK generation, AES-GCM wrapping/unwrapping |
| [lib/crypto/encryption.ts](../../lib/crypto/encryption.ts) | Field and JSON encryption via OMK |
| [lib/crypto/field-handlers.ts](../../lib/crypto/field-handlers.ts) | Model-specific field encrypt/decrypt |
| [components/providers/EncryptionProvider.tsx](../../components/providers/EncryptionProvider.tsx) | React context, idle auto-lock |

### Algorithm

- **Key derivation**: PBKDF2-SHA256, 100,000 iterations, 16-byte salt
- **Passphrase requirements**: Minimum 12 chars, must include uppercase, lowercase, numbers
- **OMK**: AES-256-GCM `CryptoKey` (extractable: false once wrapped)
- **Ciphertext format**: `e2ee:v1:<base64(iv + ciphertext)>` (12-byte IV prepended)

### Key Hierarchy

```
User passphrase (browser only, never sent to server)
         │
         │  PBKDF2-SHA256 (100k iterations, per-user salt from DB)
         ▼
KEK (Key Encryption Key) — in-memory only during session
         │
         │  AES-GCM wraps
         ▼
Wrapped OMK — stored in UserEncryptionKey table (per user per org)
         │
         │  AES-GCM unwraps on unlock
         ▼
OMK (Organization Master Key) — in useRef, never in React state
         │
         │  AES-GCM encrypts/decrypts
         ▼
Field ciphertext with e2ee:v1: prefix
```

### Session Lifecycle

1. **Admin enables encryption** via `actions/encryption/setup-encryption.ts`: generates OMK, wraps it with admin's KEK, stores in `OrganizationEncryptionStatus` + admin's `UserEncryptionKey`
2. **Admin grants access** to team members via `actions/encryption/grant-access.ts`: re-wraps OMK with each member's KEK (requires admin to be unlocked)
3. **User unlocks**: enters passphrase → `deriveKEK()` → `unwrapKey()` → OMK stored in `useRef`
4. **Auto-lock**: 5-minute idle timer using both `setTimeout` and `setInterval` countdown. OMK reference set to `null`
5. **OMK is stored in `useRef`** (not `useState`) to prevent React DevTools from exposing it in component state inspection

### React Context API

```typescript
// components/providers/EncryptionProvider.tsx
const { isEnabled, hasAccess, isUnlocked, unlock, lock, encrypt, decrypt } = useEncryption();
```

The provider exposes both field-level (`encrypt`, `decrypt`) and object-level (`encryptObject`, `decryptObject`) operations. `isFieldEncrypted()` detects the `e2ee:v1:` prefix.

---

## System III — Advanced Messaging E2EE (Signal Protocol)

### Purpose

True end-to-end encrypted messaging for DMs and group channels. The server stores only ciphertext and public key material — it cannot decrypt messages. Uses the Signal Protocol's cryptographic primitives for forward secrecy and deniability.

### Key Files

| File | Role |
|------|------|
| [lib/e2ee/types.ts](../../lib/e2ee/types.ts) | TypeScript interfaces for all E2EE types |
| [lib/e2ee/primitives.ts](../../lib/e2ee/primitives.ts) | WebCrypto primitives (ECDH, AES-GCM, HKDF, HMAC, SHA-256) |
| [lib/e2ee/x3dh.ts](../../lib/e2ee/x3dh.ts) | X3DH key agreement (session establishment) |
| [lib/e2ee/double-ratchet.ts](../../lib/e2ee/double-ratchet.ts) | Double Ratchet (1:1 DMs, forward secrecy) |
| [lib/e2ee/megolm.ts](../../lib/e2ee/megolm.ts) | Megolm (group channels, one-sender-many-receivers) |
| [lib/e2ee/entity-comments.ts](../../lib/e2ee/entity-comments.ts) | Entity-as-Channel Megolm for entity comments |
| [lib/e2ee/session-store.ts](../../lib/e2ee/session-store.ts) | IndexedDB persistence (KEK-encrypted) |
| [lib/e2ee/attachment.ts](../../lib/e2ee/attachment.ts) | Per-file AES-256 key for attachments |
| [lib/e2ee/index.ts](../../lib/e2ee/index.ts) | Public API — all E2EE operations |
| [hooks/useE2EE.ts](../../hooks/useE2EE.ts) | React context provider + hook |

### Algorithm Choices

| Use Case | Algorithm | Reason |
|----------|-----------|--------|
| Key agreement (session init) | X3DH (Extended Triple Diffie-Hellman) | Signal-compatible, forward secrecy from first message |
| 1:1 DM encryption | Double Ratchet (DR) | Per-message keys, forward secrecy, out-of-order support |
| Group/channel messages | Megolm | Efficient multi-recipient, single outbound session |
| Entity comments | Megolm (entity-as-channel) | Same session per entity, all members share inbound |
| Attachments | AES-256-GCM per-file key | Simple, no ratchet needed for files |
| Key derivation | PBKDF2-SHA256, 600,000 iterations | PIN hardening (higher iterations than System II) |
| KDF ratchet step | HKDF-SHA256 | Signal-compatible key expansion |
| Chain step | HMAC-SHA256 | Signal-compatible chain advancement |

### Identity Key Setup (First-Time)

```
User enters PIN
    │
    ├── Fetch pepper from /api/e2ee/pepper (server-side random, per-user)
    │
    ├── Generate ECDH P-256 identity key pair
    │
    ├── Derive KEK: PBKDF2(PIN, salt+pepper, 600k iters) → AES-256-GCM key
    │
    ├── Wrap private key: AES-GCM(PKCS8(privKey), KEK, randomIV)
    │   Format: Base64(IV || wrappedKey)
    │
    ├── Generate signed pre-key + 10 one-time pre-keys
    │
    └── POST /api/e2ee/identity: { publicKey, wrappedPrivateKey, salt, signedPreKey, oneTimePreKeys }
```

### Session Unlock Flow

```
User enters PIN
    │
    ├── Parallel fetch: /api/e2ee/identity + /api/e2ee/pepper
    │
    ├── Derive KEK from PIN + salt + pepper (PBKDF2, 600k iters)
    │
    ├── Unwrap private key: AES-GCM decrypt with KEK
    │
    ├── Import public key (ECDH P-256 SPKI)
    │
    ├── Store identity key pair in module-level vars (_identityKeyPair, _kekRaw, _userId)
    │
    └── Store private key in IndexedDB encrypted with KEK
```

In-memory state (`_kekRaw`, `_identityKeyPair`, `_userId`) cleared on `lock()`.

### X3DH Session Establishment (1:1 DMs)

The Extended Triple Diffie-Hellman protocol establishes a shared secret between two parties who may be offline at different times.

```
Alice initiates to Bob:
─────────────────────────────────────────────────────────
Fetch Bob's PreKeyBundle: { identityKey, signedPreKey, oneTimePreKey }

Alice generates ephemeral key pair (EK_a)

DH1 = ECDH(IK_a_priv, SPK_b)    // Identity auth
DH2 = ECDH(EK_a_priv, IK_b)    // Key agreement
DH3 = ECDH(EK_a_priv, SPK_b)   // Forward secrecy
DH4 = ECDH(EK_a_priv, OPK_b)   // One-time pre-key (if available)

SharedSecret = HKDF(DH1 || DH2 || DH3 [|| DH4], salt=0x00..., info="OikionX3DH", 32)

Alice stores: InitialMessage { identityKey: IK_a_pub, ephemeralKey: EK_a_pub, oneTimePreKeyId }

Bob responds (when online):
─────────────────────────────────────────────────────────
Mirrors Alice's computation → derives same SharedSecret
Initializes Double Ratchet as receiver
```

### Double Ratchet (1:1 DMs)

Provides forward secrecy (compromise of current state doesn't expose past messages) and break-in recovery (future messages re-establish security after compromise).

```
State: { rootKey, sendChainKey, recvChainKey, sendDHKeyPair, recvDHPubKey, ... }

Send a message:
  chainStep(sendChainKey) → { newChainKey, messageKey }
  AES-GCM(plaintext, messageKey) → ciphertext
  Header = { dhPublicKey: sendDHKeyPair.public, prevChainLen, msgNum }

Receive a message:
  if new DH key in header → DH ratchet (new key pair, new chain keys from HKDF)
  chainStep(recvChainKey) → { newChainKey, messageKey }
  AES-GCM decrypt(ciphertext, messageKey)

Out-of-order: skippedKeys Map caches up to MAX_SKIP=1000 message keys
```

Each encrypt/decrypt advances the ratchet and persists updated state to IndexedDB (KEK-encrypted).

### Megolm (Group Channels)

One sender, many receivers. The sender holds an outbound session; each receiver imports an inbound session copy.

```
Outbound (sender):
  ratchetKey = random 32 bytes
  msgKey = HMAC(ratchetKey, messageIndex as Uint32)
  AES-GCM(plaintext, msgKey[0:32]) → { ciphertext, iv, messageIndex }
  ratchetKey = SHA-256(ratchetKey)  // advance
  messageIndex++

Inbound (receiver):
  Fast-forward SHA-256 chain from startingIndex to target messageIndex
  msgKey = HMAC(chainKey_at_index, messageIndex as Uint32)
  AES-GCM decrypt

Rotation: after maxMessages=100, outbound triggers needsRotation()
  → caller must create new session + redistribute to all members
```

### Entity-as-Channel Pattern

Each entity (Client, Property, Mandate, Task) is treated as a Megolm group. All org members who have E2EE unlocked share an inbound session for that entity.

```
First comment on an entity:
  encryptEntityComment() returns { ok: false, needsInit: true }
  → caller calls initEntitySession() → creates MegolmOutbound
  → POST /api/e2ee/entity-sessions: { sessionId, sessionExport, entityType, entityId }
  → server stores EntitySession + EntitySessionShare for each member
  → each member imports inbound via importEntitySession()

Subsequent comments:
  encryptEntityComment() → { ok: true, content: "iv:ciphertext", entitySessionId, messageIndex }
  → stored in DB comment.content
  decryptEntityComment(sessionId, messageIndex, encryptedContent)
```

### IndexedDB Session Storage

Sessions survive page refreshes via IndexedDB (database: `oikion-e2ee`, version 1).

| Store | Key Format | Content |
|-------|-----------|---------|
| `identity` | `identity:<userId>` | Serialized private key |
| `ratchet-sessions` | `ratchet:<conversationId>` | Serialized Double Ratchet state |
| `megolm-outbound` | `megolm-out:<targetId>` | Serialized MegolmOutbound |
| `megolm-inbound` | `megolm-in:<sessionId>` | Serialized MegolmInbound |

All IndexedDB entries are **AES-GCM encrypted with the KEK** before storage (`encryptForStorage()`). The KEK is derived from PIN + pepper; without the PIN, IndexedDB contents are opaque.

### Session Backup

#### Problem

IndexedDB is ephemeral. A browser data clear, a new device, or private browsing loses all Double Ratchet and Megolm sessions permanently — the user cannot decrypt past messages and must re-establish all sessions from scratch.

#### Solution

Server-side encrypted backups using dual-layer encryption. Sessions are backed up automatically after each write and restored automatically on PIN unlock.

#### Encryption Layers

```
Layer 1 (inner) — ECIES, client-side
  Key: user's E2EE identity public key (ECDH P-256)
  Only the holder of the corresponding identity private key can decrypt.
  The server cannot read session plaintext.

Layer 2 (outer) — Per-org DEK wrap, server-side
  Key: org DEK (AES-256-GCM, from System I key hierarchy)
  Standard envelope encryption; protects backup data at rest in DB.
  A DEK breach alone is insufficient — ECIES ciphertext still requires the identity key.
```

The combination means: server compromise without the user's identity key yields only opaque ECIES blobs; client compromise without the server yields only DEK-wrapped data.

#### Data Flow (Upload)

```
Session write (ratchet step, megolm advance)
    │
    ├── SessionBackupManager.markDirty(sessionId, type)
    │
    ├── 5-second debounce (batches rapid successive writes)
    │
    ├── For each dirty session:
    │     serialise → JSON → ECIES encrypt (identity public key)
    │     → { encryptedData: base64 }
    │
    ├── POST /api/e2ee/session-backups  { backups: [...] }
    │
    └── Server: DEK unwrap of any existing, DEK wrap of new ciphertext → upsert E2eeSessionBackup
```

#### Restore Flow (Download)

```
PIN unlock (after identity key pair derived)
    │
    ├── SessionBackupManager.restoreAll()
    │
    ├── GET /api/e2ee/session-backups
    │
    ├── Server: DEK unwrap → returns ECIES-encrypted blobs
    │
    ├── For each backup:
    │     ECIES decrypt (identity private key) → JSON → deserialise
    │     → import into IndexedDB (overwrites if local version < server version)
    │
    └── Version conflict resolution:
          server.version > local.version  → use server backup
          server.version ≤ local.version  → keep local (already up to date)
```

#### Page Unload

Sessions may be dirty when the user navigates away. `sendBeacon` is used for best-effort upload on `beforeunload`:

```typescript
navigator.sendBeacon("/api/e2ee/session-backups", JSON.stringify({ backups: pendingBatch }));
```

`sendBeacon` has no retry and no response callback — it is best-effort only. Sessions will be re-uploaded on next unlock if the beacon was dropped.

#### What Is NOT Backed Up

| Item | Reason |
|------|--------|
| OTP pre-keys | One-time use — consumed on receipt, cannot be reused |
| Identity key pair | Already server-stored as DEK-wrapped `wrappedPrivateKey` in `E2EEIdentity` |
| KEK | Derived on-the-fly from PIN + pepper; never stored |

#### Database Model

```prisma
model E2eeSessionBackup {
  id             String   @id @default(cuid())
  userId         String
  organizationId String
  sessionId      String                    // matches IndexedDB key
  sessionType    E2eeSessionType           // RATCHET | MEGOLM_OUTBOUND | MEGOLM_INBOUND
  encryptedData  String   @db.Text        // ECIES ciphertext, DEK-wrapped at rest
  version        Int      @default(1)     // incremented on each upload
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@unique([userId, organizationId, sessionId])
  @@index([userId, organizationId])
}
```

#### Key Files

| File | Role |
|------|------|
| `lib/e2ee/session-backup.ts` | `SessionBackupManager` — markDirty, debounced flush, restoreAll, sendBeacon |
| `app/api/e2ee/session-backups/route.ts` | POST (upsert batch), GET (list), DELETE (single) |

#### UI Integration

| Component | Change |
|-----------|--------|
| `E2EESessionButton` | Shows syncing spinner while backup flush is in-flight |
| `PinEntryDialog` | Progress indicator during `restoreAll()` on unlock |
| Settings page (E2EE section) | Backup status: last sync time, session count, manual "Sync now" trigger |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/e2ee/identity` | GET/POST | Fetch or register identity key |
| `/api/e2ee/pepper` | GET | Fetch per-user server-side pepper |
| `/api/e2ee/prekeys` | GET/POST | One-time pre-key management |
| `/api/e2ee/prekeys/count` | GET | Count remaining one-time pre-keys |
| `/api/e2ee/prekey-bundle/[userId]` | GET | Fetch another user's pre-key bundle |
| `/api/e2ee/direct-sessions` | GET/POST | Create/list DM sessions |
| `/api/e2ee/direct-sessions/[id]` | GET | Fetch specific session |
| `/api/e2ee/group-sessions` | GET/POST | Create/list group sessions |
| `/api/e2ee/group-sessions/[id]/share` | GET | Fetch session share for current user |
| `/api/e2ee/group-sessions/[id]/add-members` | POST | Add new members to session |
| `/api/e2ee/group-sessions/[id]/rotate` | POST | Rotate group session |
| `/api/e2ee/group-sessions/active` | GET | List active sessions |
| `/api/e2ee/entity-sessions` | GET/POST | Create/list entity sessions |
| `/api/e2ee/entity-sessions/[id]/shares` | GET | Fetch entity session shares |
| `/api/e2ee/entity-sessions/[id]/rotate` | POST | Rotate entity session |
| `/api/e2ee/entity-sessions/org-members` | GET | List org members for session init |

### One-Time Pre-Key Replenishment

The `E2EEProvider` automatically replenishes one-time pre-keys when count drops below 5:

```typescript
// hooks/useE2EE.ts
if (count < MIN_PREKEY_COUNT) {  // 5
  const newKeys = await e2ee.generatePreKeys(PREKEY_REPLENISH_COUNT);  // 10
  await fetch("/api/e2ee/prekeys", { method: "POST", body: JSON.stringify({ preKeys: newKeys }) });
}
```

### Attachment Encryption

Each file gets a unique AES-256 key:

```
encryptAttachment(file: Blob):
  key = random 32 bytes (AES-256)
  iv = random 12 bytes
  AES-GCM(fileBytes, key, iv) → encryptedBlob
  Returns: { encryptedBlob, fileKey: base64(key), iv: base64(iv) }
```

The `fileKey` and `iv` are stored alongside the message that references the attachment (or as separate metadata). Only users who can decrypt the message can read `fileKey` and subsequently decrypt the file.

---

## UI Components

| Component | Purpose |
|-----------|---------|
| [components/e2ee/PinEntryDialog.tsx](../../components/e2ee/PinEntryDialog.tsx) | PIN entry dialog for unlock |
| [components/layout/E2EESessionButton.tsx](../../components/layout/E2EESessionButton.tsx) | Header button showing lock state |
| [components/encryption/E2EEAnnouncementBanner.tsx](../../components/encryption/E2EEAnnouncementBanner.tsx) | Dismissible info banner |
| [components/encryption/IdleTimeoutWarning.tsx](../../components/encryption/IdleTimeoutWarning.tsx) | Countdown before auto-lock |

### E2EESessionButton States

| State | Icon | Color | Action on click |
|-------|------|-------|-----------------|
| Not set up | `ShieldAlert` | Warning orange | Open `PinSetupDialog` |
| Set up, locked | `Lock` | Muted | Open `PinEntryDialog` |
| Unlocked | `LockOpen` | Success green | (show status or lock) |

---

## Database Models

```prisma
// Per-org server-side DEK storage
model OrgEncryptionKey {
  organizationId String
  encryptedDek   String    @db.Text  // iv:authTag:hex(DEK) encrypted with master key
  keyVersion     Int       @default(1)
  isActive       Boolean   @default(true)
  @@unique([organizationId, keyVersion])
}

// Platform-wide DEK for non-org data
model PlatformEncryptionKey {
  encryptedDek String    @db.Text
  keyVersion   Int       @default(1)
  isActive     Boolean   @default(true)
  @@unique([keyVersion])
}

// Org-level E2EE enablement status (System II)
model OrganizationEncryptionStatus {
  organizationId String   @id
  isEnabled      Boolean  @default(false)
  keyVersion     Int
  enabledAt      DateTime?
  enabledById    String?
}

// Per-user wrapped OMK (System II)
model UserEncryptionKey {
  organizationId String
  userId         String
  wrappedKey     String    // Base64 AES-GCM(OMK, KEK)
  salt           String    // Base64 PBKDF2 salt
  keyVersion     Int
  grantedById    String?
}
```

---

## Test Coverage

| Test File | System Covered |
|-----------|----------------|
| [tests/lib/encryption.test.ts](../../tests/lib/encryption.test.ts) | System I — `isEncrypted`, round-trip, idempotency |
| [tests/lib/model-encryption-comments.test.ts](../../tests/lib/model-encryption-comments.test.ts) | System I — model-level encrypt/decrypt |
| [tests/lib/platform-key-management.test.ts](../../tests/lib/platform-key-management.test.ts) | System I — platform DEK lifecycle |
| [tests/lib/encryption-mode-guard.test.ts](../../tests/lib/encryption-mode-guard.test.ts) | System I — idempotency guards |
| _(none)_ | System II — EncryptionProvider, field handlers |
| _(none)_ | System III — X3DH, Double Ratchet, Megolm |

---

## Security Design Principles

1. **Server never sees plaintext private keys** — identity keys are wrapped client-side before upload
2. **Per-org key isolation** — compromise of one org's DEK does not expose other orgs
3. **IdempotencyCypher guards** — `isEncrypted()` prevents double-encryption corruption
4. **KEK-encrypted IndexedDB** — sessions at rest are useless without the PIN
5. **Pepper prevents offline rainbow tables** — server-side random bytes combined with PBKDF2 salt
6. **In-memory lock** — clearing `_kekRaw` and `_identityKeyPair` removes access without wiping storage
7. **Fallback decryption** — pre-DEK-migration data decrypts via master key (transitional)
