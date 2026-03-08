# Messaging E2EE Design

**Date:** 2026-03-08
**Status:** Approved
**Scope:** End-to-end encryption for all messaging (DMs, groups, channels)

## Decisions

| Decision | Choice |
|----------|--------|
| Protocols | Signal (X3DH + Double Ratchet) for 1:1 DMs, Megolm-style group ratchet for groups + channels |
| Implementation | Pure TypeScript using Web Crypto API (`SubtleCrypto`) — no WASM |
| Key anchoring | 4-8 digit PIN + server-side pepper, multi-device via PBKDF2 |
| Scope | All conversations: DMs, group conversations, channels |
| Search | Client-side only (decrypt in browser, search locally) |
| Attachments | E2EE (encrypt in browser before upload, decrypt after download) |
| History for new members | Key re-sharing (share prior Megolm session starting keys) |
| Migration | Full cutover — no gradual transition |
| Conversation simplification | Three types only: DMs, Groups, Channels. Remove entity-linked conversations |

## 1. Identity & Key Management

### PIN + Pepper Key Derivation

```
User enters 4-8 digit PIN
  → Client calls GET /api/e2ee/pepper (authenticated, returns per-user 256-bit pepper)
  → KEK = PBKDF2(PIN, salt + pepper, 100k iterations, SHA-256)
  → Unwrap identity private key with KEK
  → E2EE session active
```

- **PIN** (4-8 digits): only the user knows it
- **Salt** (random, stored in `UserIdentityKey`): prevents rainbow tables
- **Pepper** (random 256-bit, stored in `UserE2eePepper`): adds entropy, only returned via authenticated API

### Identity Keys

Each user generates a long-lived ECDH P-256 identity key pair on E2EE setup:

- **Public key** → stored plaintext in DB (`UserIdentityKey.publicKey`)
- **Private key** → AES-256-GCM wrapped with KEK → stored in DB (`UserIdentityKey.wrappedPrivateKey`)

### Pre-Keys (for 1:1 X3DH)

- **1 Signed Pre-Key** — medium-term ECDH key, signed with identity key, rotated monthly
- **20 One-Time Pre-Keys** — ephemeral ECDH keys, replenished when < 5 remain

### Key Hierarchy

```
User PIN + Server Pepper
  └── KEK (PBKDF2-derived, 256-bit)
        └── wraps Identity Private Key (ECDH P-256)
              ├── Signs Pre-Keys (for X3DH in 1:1 DMs)
              ├── Participates in Double Ratchet (1:1 DMs)
              └── Participates in Megolm sessions (groups/channels)
```

## 2. Protocol Architecture

### 1:1 DMs — X3DH + Double Ratchet

**Session establishment (X3DH):**

1. Alice fetches Bob's pre-key bundle from server
2. Verifies signed pre-key signature against Bob's identity key
3. Generates ephemeral key pair
4. Computes shared secret: `SK = HKDF(DH(IKa,SPKb) || DH(EKa,IKb) || DH(EKa,SPKb) || DH(EKa,OPKb))`
5. Initializes Double Ratchet with SK
6. First message includes: `{ IKa_pub, EKa_pub, OPKb_id, ciphertext }`

**Double Ratchet (ongoing messages):**

- **Symmetric ratchet** — HMAC-based KDF chain. Each message gets a unique key. Used keys are deleted → forward secrecy
- **DH ratchet** — Periodic new ECDH key pair in message header → post-compromise security
- **Message format**: `{ dhPublicKey, previousChainLength, messageNumber, ciphertext }`
- **Ciphertext**: AES-256-GCM with derived message key

**Ratchet state** stored in IndexedDB (encrypted with KEK):

```typescript
interface DoubleRatchetSession {
  conversationId: string;
  rootKey: Uint8Array;
  sendChainKey: Uint8Array;
  recvChainKey: Uint8Array;
  sendDHKeyPair: CryptoKeyPair;
  recvDHPublicKey: CryptoKey;
  sendMessageNumber: number;
  recvMessageNumber: number;
  previousSendChainLength: number;
  skippedKeys: Map<string, Uint8Array>; // Out-of-order message handling
}
```

### Groups & Channels — Megolm-style Group Ratchet

**Outbound session creation:**

1. Creator generates: `sessionId` (UUID), `ratchetKey` (random 256-bit), `messageIndex = 0`
2. For each participant: encrypt session payload with `ECDH(creatorIdentityKey, participantIdentityKey)`
3. Store encrypted shares on server (`GroupSessionShare`)

**Message encryption:**

1. `msgKey = HMAC-SHA256(ratchetKey, messageIndex)`
2. `ciphertext = AES-256-GCM(plaintext, msgKey)`
3. `messageIndex++`
4. `ratchetKey = SHA-256(ratchetKey)` — forward ratchet (can't derive past keys)

**Session rotation:**

- Every 100 messages or 24 hours (whichever first)
- On member removal: immediate rotation (excluded member doesn't get new key)

**New member history access:**

- Existing member shares prior session starting keys to the new member
- New member can fast-forward ratchet to any message index by applying SHA-256 N times

### Attachment Encryption

Per-file standalone key (not tied to ratchet):

1. `fileKey = crypto.getRandomValues(32 bytes)`
2. `encryptedFile = AES-256-GCM(file, fileKey)`
3. Upload encrypted blob to storage → get URL
4. `fileKey` travels inside the E2EE message payload (encrypted by ratchet)
5. Recipient decrypts message → extracts `fileKey` → downloads + decrypts file

## 3. Data Model

### New Tables

```prisma
model UserIdentityKey {
  id                String   @id @default(uuid())
  userId            String   @unique
  publicKey         String   // Base64 ECDH P-256 public key
  wrappedPrivateKey String   // AES-256-GCM(privateKey, KEK)
  salt              String   // PBKDF2 salt (hex)
  pbkdfIterations   Int      @default(100000)
  keyVersion        Int      @default(1)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  user              Users    @relation(fields: [userId], references: [id], onDelete: Cascade)
  preKeys           UserPreKey[]
}

model UserE2eePepper {
  id        String   @id @default(uuid())
  userId    String   @unique
  pepper    String   // 256-bit random value (hex), server-side only
  createdAt DateTime @default(now())
  user      Users    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserPreKey {
  id          String     @id @default(uuid())
  userId      String
  keyType     PreKeyType // SIGNED | ONE_TIME
  publicKey   String     // Base64 ECDH P-256
  signature   String?    // Identity key signature (SIGNED only)
  isConsumed  Boolean    @default(false)
  expiresAt   DateTime?
  createdAt   DateTime   @default(now())
  user        Users           @relation(fields: [userId], references: [id], onDelete: Cascade)
  identityKey UserIdentityKey @relation(fields: [userId], references: [userId], onDelete: Cascade)
  @@index([userId, keyType, isConsumed])
}

enum PreKeyType {
  SIGNED
  ONE_TIME
}

model GroupSession {
  id              String        @id @default(uuid())
  conversationId  String?
  channelId       String?
  creatorUserId   String
  sessionIndex    Int
  messageCount    Int           @default(0)
  maxMessages     Int           @default(100)
  rotatedAt       DateTime?
  isActive        Boolean       @default(true)
  createdAt       DateTime      @default(now())
  conversation    Conversation? @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  channel         Channel?      @relation(fields: [channelId], references: [id], onDelete: Cascade)
  shares          GroupSessionShare[]
  @@index([conversationId, isActive])
  @@index([channelId, isActive])
}

model GroupSessionShare {
  id               String       @id @default(uuid())
  groupSessionId   String
  userId           String
  encryptedSession String       // AES-GCM(sessionPayload, ECDH shared secret)
  startingIndex    Int          @default(0)
  createdAt        DateTime     @default(now())
  session          GroupSession @relation(fields: [groupSessionId], references: [id], onDelete: Cascade)
  @@unique([groupSessionId, userId])
}

model DirectSession {
  id              String       @id @default(uuid())
  conversationId  String       @unique
  initiatorUserId String
  responderUserId String
  initialMessage  String       // Base64 X3DH initial message (opaque to server)
  isEstablished   Boolean      @default(false)
  createdAt       DateTime     @default(now())
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}
```

### Modified Tables

**Message** — add E2EE fields:
- `sessionId: String?` — GroupSession.id (groups/channels) or null (1:1)
- `messageIndex: Int?` — Ratchet index for ordering/dedup
- `dhPublicKey: String?` — Double Ratchet DH key (1:1 only)
- `previousChainLen: Int?` — Double Ratchet chain length (1:1 only)

**Conversation** — add:
- `isE2ee: Boolean @default(true)`
- Remove: `entityType`, `entityId`, `scope`, `orgMemberships`

**Channel** — add:
- `isE2ee: Boolean @default(true)`
- Add: `groupSessions` relation

### Tables to Remove
- `ConversationKeyShare` — replaced by `GroupSessionShare`

## 4. Server API

Server is a "dumb relay" — stores/delivers ciphertext and key material it cannot decrypt.

### Identity & Keys
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/e2ee/identity` | Upload identity key + wrapped private key + salt |
| GET | `/api/e2ee/identity/:userId` | Get user's public identity key |
| PUT | `/api/e2ee/identity` | Rotate identity key (PIN change) |
| GET | `/api/e2ee/pepper` | Get user's pepper (authenticated only) |
| POST | `/api/e2ee/prekeys` | Upload batch of pre-keys |
| GET | `/api/e2ee/prekey-bundle/:userId` | Get pre-key bundle for X3DH (consumes one OTP) |
| GET | `/api/e2ee/prekeys/count` | Check remaining one-time pre-keys |

### Sessions
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/e2ee/direct-sessions` | Store X3DH initial message |
| GET | `/api/e2ee/direct-sessions/:conversationId` | Fetch initial message to complete X3DH |
| POST | `/api/e2ee/group-sessions` | Create session + shares for all participants |
| GET | `/api/e2ee/group-sessions/:id/share` | Get my encrypted session share |
| GET | `/api/e2ee/group-sessions/active` | Get active session for conversation/channel |
| POST | `/api/e2ee/group-sessions/:id/rotate` | Rotate session |
| POST | `/api/e2ee/group-sessions/:id/add-members` | Add shares for new participants |

### Messages (modified existing)
| Method | Path | Change |
|--------|------|--------|
| POST | `/api/messaging/messages` | Accepts `{ ciphertext, sessionId, messageIndex, dhPublicKey? }` |
| GET | `/api/messaging/messages` | Returns ciphertext — client decrypts |
| DELETE | `/api/messaging/messages/:id` | Tombstone only (`isDeleted = true`) |

### Attachments (modified existing)
| Method | Path | Change |
|--------|------|--------|
| POST | `/api/messaging/attachments` | Accepts pre-encrypted blob |
| GET | `/api/messaging/attachments/:id` | Returns encrypted blob as-is |

## 5. Client-Side Library

### File Structure

```
lib/e2ee/
  ├── index.ts              # Public API + lazy init
  ├── identity.ts           # Key pair generation, PIN wrapping/unwrapping
  ├── x3dh.ts               # X3DH key agreement
  ├── double-ratchet.ts     # Double Ratchet implementation
  ├── megolm.ts             # Megolm outbound/inbound sessions
  ├── attachment.ts         # File encrypt/decrypt (AES-256-GCM)
  ├── session-store.ts      # IndexedDB persistence (KEK-encrypted)
  ├── primitives.ts         # SubtleCrypto wrappers (ECDH, AES-GCM, HKDF, HMAC)
  └── types.ts              # TypeScript interfaces
```

All files are `"use client"` — never imported server-side.

### IndexedDB Structure

Database: `oikion-e2ee`, all values KEK-encrypted:
- `identity` — cached private key
- `dm-sessions` — keyed by conversationId → DoubleRatchetSession
- `group-sessions` — keyed by sessionId → MegolmInboundSession
- `outbound-sessions` — keyed by conversationId/channelId → MegolmOutboundSession

### React Hook: `useE2EE()`

```typescript
function useE2EE() {
  return {
    isSetUp: boolean,
    isUnlocked: boolean,
    unlock(pin: string): Promise<void>,
    lock(): void,
    encryptDM(conversationId, plaintext): EncryptedPayload,
    decryptDM(conversationId, payload): string,
    encryptGroup(targetId, plaintext): EncryptedPayload,
    decryptGroup(sessionId, messageIndex, ciphertext): string,
    encryptFile(file: File): { encryptedBlob, fileKey },
    decryptFile(encryptedBlob, fileKey): File,
    createGroupSession(targetId, participantKeys[]),
    rotateGroupSession(targetId),
    addMemberToSession(targetId, userPublicKey),
  }
}
```

## 6. UX

### E2EE Setup (Security Settings)

- Toggle "Enable PIN" in Security Settings
- Enter 4-8 digit PIN
- Generates identity key, wraps with PIN + pepper-derived KEK
- Uploads keys + generates pre-keys

### Session Unlock

- "Refresh session" button in header (next to layout icon)
- Opens PIN entry dialog
- Derives KEK, unwraps identity key, loads sessions from IndexedDB
- Optional "Remember for 8 hours" checkbox (stores KEK in `sessionStorage`)

### Message Display

- E2EE messages show a lock icon
- Failed decryption shows "[Unable to decrypt]" with option to re-enter PIN

## 7. Migration (Full Cutover)

1. Deploy schema changes (new E2EE tables)
2. Disable messaging temporarily (feature flag)
3. Migration script per org:
   a. Decrypt all existing messages using org DEK (server-side)
   b. Re-encrypt using bootstrap Megolm session per conversation/channel
   c. Store session shares for all participants
4. Remove server-side `encryptMessageForOrg` calls from messaging actions
5. On first login post-migration: mandatory E2EE PIN setup (onboarding gate)
6. Client fetches bootstrap session shares, unwraps with identity key
7. Re-enable messaging
8. Keep org-DEK backup until all members confirm history access

## 8. Security Properties

| Property | 1:1 DMs | Groups/Channels |
|----------|---------|-----------------|
| Confidentiality | Server never sees plaintext | Server never sees plaintext |
| Forward secrecy | Per-message (DH ratchet) | Per-session (rotation every 100 msgs / 24h) |
| Post-compromise | Yes (DH ratchet heals) | On next session rotation |
| Attachment security | File key inside E2EE message | File key inside E2EE message |
| PIN brute-force | Mitigated by server pepper (256-bit) | Same |
| Multi-device | PIN + pepper → same KEK on any device | Same |
