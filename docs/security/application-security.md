# Application Security — Master Reference

> **Created**: 2026-03-25
> **Scope**: All encryption systems, E2EE, API security, and application-wide security posture
> **Status**: Active — this document drives all security implementation work
> **Related**: [e2ee-architecture.md](./e2ee-architecture.md), [e2ee-security-review.md](./e2ee-security-review.md)

This document is the single source of truth for all security findings, their status, fix plans, and cross-cutting rules. Every security-related conversation MUST reference this document and update it when findings are resolved.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Finding Registry](#2-finding-registry)
3. [Implementation Phases](#3-implementation-phases)
4. [Cross-System Interaction Rules](#4-cross-system-interaction-rules)
5. [Security Invariants (Non-Negotiable Rules)](#5-security-invariants)
6. [File Reference Map](#6-file-reference-map)
7. [Verification Checklist](#7-verification-checklist)
8. [Change Log](#8-change-log)

---

## 1. Architecture Overview

### Three Parallel Encryption Systems

| System | Name | Scope | Key Files | Status |
|--------|------|-------|-----------|--------|
| I | Server-Side Field Encryption (Per-Org DEK) | CRM/MLS PII fields at rest | `lib/encryption.ts`, `lib/key-management.ts`, `lib/model-encryption.ts` | Active (production) |
| II | Client-Side Passphrase E2EE (OMK) | CRM/MLS field display in browser | `lib/crypto/`, `components/providers/EncryptionProvider.tsx` | Active — scheduled for retirement |
| III | Advanced Messaging E2EE (Signal Protocol) | DMs, group channels, entity comments | `lib/e2ee/` (7 source files, ~1,400 LOC) | Active (messaging subsystem) |

### System I — Server-Side Field Encryption

```
SECRETS_ENCRYPTION_KEY (env var, 32 bytes / 64 hex)
         │
         │  AES-256-GCM wraps
         ▼
OrgEncryptionKey.encryptedDek  (PostgreSQL)
         │
         │  decrypt → raw 32-byte Buffer
         ▼
Per-Org DEK (cached: L1 in-process 5min, L2 Redis 10min, L3 PostgreSQL)
         │
         │  AES-256-GCM encrypts
         ▼
Field ciphertext: "<iv_hex_32>:<authTag_hex_32>:<ciphertext_hex>"
```

**Encrypted models**: Clients (26 string + 1 JSON), Properties (1 string + 1 JSON), Mandates (2 string + 1 JSON), CalendarEvents (6), Documents (2), Messages/Comments (1), MyAccount (8), NewsletterSubscriber (3), AgentContactSubmission (3 string + 1 JSON).

### System II — Client-Side Passphrase E2EE

```
User passphrase (browser only)
         │  PBKDF2-SHA256 (100k iterations, per-user salt)
         ▼
KEK → unwraps → OMK (useRef, never in React state)
         │  AES-GCM
         ▼
Ciphertext: "e2ee:v1:<base64(iv + ciphertext)>"
```

### System III — Signal Protocol E2EE

```
User PIN + server pepper
         │  PBKDF2-SHA256 (600k iterations, salt + pepper)
         ▼
KEK → unwraps identity key pair (ECDH P-256) + signing key pair (Ed25519)
         │
         ├── X3DH session establishment (DMs)
         ├── Double Ratchet (1:1 forward secrecy)
         ├── Megolm (group/channel, one-sender-many-receivers)
         └── Entity-as-Channel (entity comments via Megolm)

Session state: IndexedDB (KEK-encrypted via AES-GCM)
Session export sharing: ECIES (ephemeral ECDH → HKDF → AES-256-GCM per recipient)
```

### Brute Force Protection

- Redis-backed attempt counters (`lib/security/brute-force.ts`)
- PIN: 5 attempts per 15-minute window
- Pepper endpoint rate-limited before serving pepper
- `cacheIncr` re-throws on Redis failure (fail-closed for writes)
- **ISSUE**: `cacheGet` fails open on Redis error — see finding NH-3

---

## 2. Finding Registry

### Severity Legend

| Level | Meaning | SLA |
|-------|---------|-----|
| **CRITICAL** | Breaks a core cryptographic guarantee; actively exploitable | Fix before any deployment |
| **HIGH** | Significant security weakness or data loss risk | Fix before public availability |
| **MEDIUM** | Weakens security posture or creates subtle bugs | Fix in hardening sprint |
| **LOW** | Code quality / cleanup items that create future risk | Fix opportunistically |

### Status Legend

| Status | Meaning |
|--------|---------|
| `FIXED` | Code change merged and verified |
| `PARTIALLY FIXED` | Some mitigation in place, full fix pending |
| `OPEN` | No fix implemented |
| `IN PROGRESS` | Fix actively being worked on |

---

### Original Findings (from e2ee-security-review.md, 2026-03-24)

#### C-1 — X3DH Signed Pre-Key Signature Never Verified

| Field | Value |
|-------|-------|
| **ID** | C-1 |
| **Severity** | CRITICAL |
| **Status** | FIXED |
| **System** | III |
| **File** | `lib/e2ee/x3dh.ts:82-92` |
| **Fixed in** | `feature/e2ee-security-corrections` branch |

**What was wrong**: `respondX3DH()` accepted the signed pre-key signature without ever verifying it. Any key bundle the server returned — including a fake one — would be accepted.

**Fix applied**: `initiateX3DH()` now verifies the Ed25519 signature with `verifyWithEd25519()` before proceeding with DH computations. Falls back gracefully for legacy users (no `signingPublicKey` in bundle).

**Tests**: `tests/e2ee/x3dh.test.ts` — "accepts a valid SPK signature", "throws when SPK signature is invalid (MITM attack)", "completes handshake without signingPublicKey (legacy user)".

---

#### C-2 — X3DH Signing Uses Wrong Primitive (HMAC, Not Ed25519)

| Field | Value |
|-------|-------|
| **ID** | C-2 |
| **Severity** | CRITICAL |
| **Status** | FIXED |
| **System** | III |
| **File** | `lib/e2ee/x3dh.ts:46-57`, `lib/e2ee/primitives.ts:92-109` |
| **Fixed in** | `feature/e2ee-security-corrections` branch |

**What was wrong**: `generateSignedPreKey()` exported the identity private key as raw bytes and used them as an HMAC key — not a digital signature. HMAC requires the verifier to hold the same secret.

**Fix applied**: Replaced HMAC with proper Ed25519 signing via `signWithEd25519()`. Identity setup now generates a separate Ed25519 signing key pair alongside the ECDH identity key pair. The signing key is wrapped with the PIN-derived KEK and stored on the server.

**Schema change**: `UserIdentityKey` model gained `signingPublicKey`, `wrappedSigningPrivateKey`, `signingSalt` fields (nullable for backward compatibility).

---

#### C-3 — `decryptWithKey()` Silent Master Key Fallback

| Field | Value |
|-------|-------|
| **ID** | C-3 |
| **Severity** | CRITICAL |
| **Status** | PARTIALLY FIXED |
| **System** | I |
| **File** | `lib/encryption.ts:125-153` |

**What was wrong**: When AES-GCM auth tag verification failed (wrong DEK), the code silently retried with the global master key. This made key rotation ineffective for existing data.

**Current state**: The fallback now logs `console.warn("[encryption] DEK decryption failed, falling back to master key")` and can be disabled via `DISABLE_MASTER_KEY_FALLBACK=true` env var.

**Remaining work**:
1. Create a background re-encryption migration script that re-encrypts all pre-DEK-migration data under the current org DEK
2. After migration completes for all orgs, enable `DISABLE_MASTER_KEY_FALLBACK=true` in production
3. Remove the fallback code path entirely

**Dependencies**: Requires tracking which records are pre-migration (no version field exists on encrypted data). Consider adding a `dekVersion` column or using the `OrgEncryptionKey.keyVersion` to tag records.

---

#### H-1 — Zero Test Coverage for System III

| Field | Value |
|-------|-------|
| **ID** | H-1 |
| **Severity** | HIGH |
| **Status** | FIXED |
| **System** | III |

**Fix applied**: 8 test files now exist under `tests/e2ee/`:
- `x3dh.test.ts` — handshake, signature verification, legacy fallback, MITM detection
- `megolm.test.ts` — round-trip, ratchet, fast-forward, out-of-order, rotation, serialization
- `double-ratchet.test.ts` — (verify scope)
- `entity-comments.test.ts` — encrypt/decrypt cycle
- `session-store.test.ts` — IndexedDB read/write
- `primitives.test.ts` — crypto primitives
- `attachment.test.ts` — file encrypt/decrypt
- `types.test.ts` — type guards

---

#### H-2 — Megolm Cannot Decrypt Out-of-Order Messages

| Field | Value |
|-------|-------|
| **ID** | H-2 |
| **Severity** | HIGH |
| **Status** | FIXED |
| **System** | III |
| **File** | `lib/e2ee/megolm.ts:130-166` |

**Fix applied**: `MegolmInbound.decrypt()` now fast-forwards while caching intermediate message keys in a `skippedKeys` map (bounded by `MAX_SKIP_MEGOLM = 100`). Cached keys are consumed on use (single-decrypt guarantee). Serialization/deserialization preserves skipped keys.

**Tests**: `tests/e2ee/megolm.test.ts` — "decrypts out-of-order messages using skipped-key cache", "throws when decrypting a past message that was not cached", "serializes and deserializes inbound session with skipped keys".

---

#### H-3 — No PIN Attempt Rate Limiting

| Field | Value |
|-------|-------|
| **ID** | H-3 |
| **Severity** | HIGH |
| **Status** | FIXED |
| **System** | III |
| **Files** | `app/api/e2ee/pepper/route.ts:19-25`, `lib/security/brute-force.ts`, `app/api/e2ee/unlock-attempt/route.ts` |

**Fix applied**:
- Pepper endpoint calls `checkAttempt("pin", userId)` before returning pepper — 5 attempts per 15 minutes
- Client reports failed attempts via POST `/api/e2ee/unlock-attempt` → `recordFailedAttempt("pin", userId)`
- Success outcomes are intentionally ignored — counter expires naturally via TTL
- `cacheIncr` re-throws on Redis failure (fail-closed for counter increments)

**Remaining concern**: See NH-3 (cacheGet fails open).

---

#### H-4 — Megolm Session Export Uploads Plaintext Ratchet Key

| Field | Value |
|-------|-------|
| **ID** | H-4 |
| **Severity** | HIGH |
| **Status** | FIXED |
| **System** | III |
| **File** | `lib/e2ee/index.ts:296-384` |

**Fix applied**: ECIES encryption implemented. `eciesEncryptSessionExport()` generates an ephemeral ECDH key pair per recipient, derives an encryption key via HKDF, and AES-GCM encrypts the session export. The server stores per-recipient encrypted blobs (`encryptedSessionExport`, `ephemeralPublicKey`, `iv` fields on `GroupSessionShare` and `EntitySessionShare`).

Decryption via `decryptSessionExportFromShare()` uses the recipient's identity private key + the ephemeral public key to reverse the ECIES.

**Schema changes**: `GroupSessionShare` and `EntitySessionShare` gained `ephemeralPublicKey` and `iv` columns (nullable for backward compat).

---

#### H-5 — Two Separate Unlock Flows With No UX Coordination

| Field | Value |
|-------|-------|
| **ID** | H-5 |
| **Severity** | HIGH |
| **Status** | OPEN |
| **Systems** | II + III |
| **Files** | `components/providers/EncryptionProvider.tsx`, `hooks/useE2EE.ts` |

**Problem**: System II (passphrase) and System III (PIN) operate independently. A user can unlock one while the other remains locked, with no UI indication of the split state.

**Recommended approach**: Either unify the two systems (unified encryption spec exists at `docs/superpowers/specs/2026-03-15-unified-encryption-architecture-design.md`) or add explicit dual-state UI showing both lock states.

**Impact of unification**: Would require migrating `e2ee:v1:` prefixed ciphertext to the unified format, choosing a single credential (PIN vs passphrase), and reconciling the two idle-lock strategies.

---

#### H-6 — No Session Recovery After IndexedDB Clear

| Field | Value |
|-------|-------|
| **ID** | H-6 |
| **Severity** | HIGH |
| **Status** | OPEN |
| **System** | III |
| **File** | `lib/e2ee/session-store.ts` |

**Problem**: If IndexedDB is cleared (browser data clear, private browsing), all Double Ratchet and Megolm sessions are lost. No recovery flow exists.

**Recommended approach**: After each ratchet step, POST the serialized session (encrypted to the user's own public key) as a server-side backup. On IndexedDB miss, fetch and decrypt the backup.

**Entity sessions have partial coverage**: `EntitySessionBackup` model exists for ORK-encrypted entity session backups. Group sessions and DM sessions have no backup mechanism.

---

#### M-1 — IV Size Inconsistency (16 vs 12 Bytes)

| Field | Value |
|-------|-------|
| **ID** | M-1 |
| **Severity** | MEDIUM |
| **Status** | OPEN |
| **Systems** | I vs III |
| **Files** | `lib/encryption.ts:21` (16 bytes), `lib/e2ee/primitives.ts:5` (12 bytes) |

**Problem**: Server-side uses 128-bit IVs; client-side uses 96-bit (NIST recommended). Not currently broken but creates format detection issues if cross-system detection is ever needed.

**Fix**: Change `lib/encryption.ts` `IV_BYTES` from 16 to 12. This is a **breaking change** for existing ciphertext — `isEncrypted()` checks `parts[0].length === 32` (16-byte IV = 32 hex chars). After change, new ciphertext has 24-char IV. Requires updating `isEncrypted()` to accept both, and eventually re-encrypting old data.

**What-if I change it**: All existing ciphertext in the DB has 32-char IVs. New ciphertext would have 24-char IVs. `isEncrypted()` must be updated to `(parts[0].length === 32 || parts[0].length === 24)`. `decryptWithKey()` and `decrypt()` already read the IV from the split — length is implicit. So the change is safe as long as `isEncrypted()` is updated simultaneously.

---

#### M-2 — Empty String Bypass Leaks Metadata

| Field | Value |
|-------|-------|
| **ID** | M-2 |
| **Severity** | MEDIUM |
| **Status** | OPEN |
| **System** | I |
| **File** | `lib/encryption.ts:46` |

**Problem**: `encrypt("")` returns `""`. An attacker with DB access can distinguish "no email" (empty string) from "has email" (ciphertext).

**Fix**: Encrypt empty strings. Use `null` for "field not set" (Prisma supports nullable strings) and encrypt `""` when intentionally empty.

**What-if**: Changing this requires verifying no code checks `field === ""` after decryption to mean "not set". All read paths should use `field == null` for "not set" checks.

---

#### M-3 — Idle Timer Dual-Lock Race

| Field | Value |
|-------|-------|
| **ID** | M-3 |
| **Severity** | MEDIUM |
| **Status** | OPEN |
| **System** | II |
| **File** | `components/providers/EncryptionProvider.tsx:123-136` |

**Problem**: Both `setInterval` (countdown) and `setTimeout` (auto-lock) can call `lock()`. Two `lock()` calls in quick succession trigger two React state updates.

**Fix**: Remove the `lock()` call from the interval's `remaining <= 0` branch. Let only the `setTimeout` trigger the actual lock. The interval should stop at `0` without calling `lock()`.

---

#### M-4 — `isEncrypted()` Heuristic Can False-Positive

| Field | Value |
|-------|-------|
| **ID** | M-4 |
| **Severity** | MEDIUM |
| **Status** | OPEN |
| **System** | I |
| **File** | `lib/encryption.ts:90-95` |

**Problem**: Any string matching `<32 chars>:<32 chars>:<anything>` is treated as encrypted. No hex validation on parts[0] and parts[1].

**Fix (two options)**:
1. **Quick**: Add hex regex validation: `/^[0-9a-f]{32}$/.test(parts[0]) && /^[0-9a-f]{32}$/.test(parts[1])`
2. **Robust**: Add a sentinel prefix to all ciphertext (e.g., `enc:v1:iv:auth:ct`). Requires migration of all existing ciphertext.

**Recommended**: Option 1 first, option 2 as part of the M-1 IV migration.

---

#### M-5 — DH Private Key Serialized to Plaintext JSON Momentarily

| Field | Value |
|-------|-------|
| **ID** | M-5 |
| **Severity** | MEDIUM |
| **Status** | OPEN |
| **System** | III |
| **File** | `lib/e2ee/double-ratchet.ts:193` |

**Problem**: `serialize()` calls `exportPrivateKey()` which creates a plaintext base64 string of the PKCS8-encoded private key in JS memory before it's encrypted for IndexedDB storage.

**Fix**: Use `crypto.subtle.wrapKey("pkcs8", privateKey, kek, { name: "AES-GCM", iv })` to go directly from CryptoKey to encrypted form. Requires refactoring `storeRatchetSession()` to accept a `CryptoKey` KEK instead of raw bytes.

---

#### M-6 — OTP Key Replay Not Prevented Client-Side

| Field | Value |
|-------|-------|
| **ID** | M-6 |
| **Severity** | MEDIUM |
| **Status** | OPEN |
| **System** | III |
| **File** | `lib/e2ee/x3dh.ts:163-165` |

**Problem**: `respondX3DH()` doesn't verify that the OTP key pair actually used matches `initialMessage.oneTimePreKeyId`.

**Fix**: Add parameter for `bobOneTimePreKeyId: string | undefined` and verify it matches `initialMessage.oneTimePreKeyId` before computing DH4.

---

#### L-2 — PinSetupDialog Referenced But Not Found

| Field | Value |
|-------|-------|
| **ID** | L-2 |
| **Severity** | LOW |
| **Status** | NEEDS VERIFICATION |
| **System** | III |
| **File** | `components/layout/E2EESessionButton.tsx` |

**Action**: Locate or create. May have been created since the original review.

---

#### L-3 — `lib/crypto/` Has No Deprecation Path

| Field | Value |
|-------|-------|
| **ID** | L-3 |
| **Severity** | LOW |
| **Status** | OPEN |
| **Systems** | II |
| **Files** | `lib/crypto/`, `components/providers/EncryptionProvider.tsx` |

**Problem**: No deprecation comments, no migration path, no feature flag. Developers may continue building on System II.

**Fix**: Add `@deprecated` JSDoc to all `lib/crypto/` exports. Add a comment to `EncryptionProvider.tsx` header. Create a migration tracking issue.

---

#### L-4 — Megolm `maxMessages = 100` Creates Frequent Rotations

| Field | Value |
|-------|-------|
| **ID** | L-4 |
| **Severity** | LOW |
| **Status** | OPEN |
| **System** | III |
| **File** | `lib/e2ee/megolm.ts:13` |

**Fix**: Increase `DEFAULT_MAX_MESSAGES` to 1000. Signal uses significantly higher values.

**What-if**: Increasing the max means fewer rotations but a longer window of exposure if a session key is compromised. 1000 is a reasonable balance for a business chat tool (not a high-value intelligence target).

---

#### L-5 — `bufferToBase64()` GC Pressure on Large Files

| Field | Value |
|-------|-------|
| **ID** | L-5 |
| **Severity** | LOW |
| **Status** | OPEN |
| **System** | III |
| **File** | `lib/e2ee/primitives.ts:231-237` |

**Fix**: Replace with chunked `String.fromCharCode.apply()` or `TextDecoder("latin1")`.

---

### New Findings (2026-03-25 Deep Audit)

#### NC-1 — Pre-Key Bundle Endpoint Lacks Organization Scoping

| Field | Value |
|-------|-------|
| **ID** | NC-1 |
| **Severity** | CRITICAL |
| **Status** | FIXED |
| **System** | III (API) |
| **File** | `app/api/e2ee/prekey-bundle/[userId]/route.ts` |
| **Phase** | 1 |
| **Fixed in** | Phase 1 implementation (2026-03-25) |

**Problem**: Any authenticated user can fetch any other user's pre-key bundle regardless of organization. The endpoint accepts `userId` as a path parameter with no org membership check. Additionally, it **consumes** one-time pre-keys (marks as `isConsumed: true`), enabling a resource exhaustion attack.

**Risk**: Cross-org bundle theft + OTP key exhaustion.

**Fix applied** (deviation from document recommendation):
- Document recommended `getCurrentOrgId()` + `orgMembers.users.some((u) => u.id === targetUserId)`. However, E2EE identity keys use **Clerk user IDs** (from `auth()`), not DB user IDs. Using `u.id` (DB UUID) would never match.
- Actual implementation: `const { userId, orgId } = await auth()` to get both user and org from a single auth call, then `orgMembers.clerkUserIds.includes(targetUserId)` to check membership against the correct ID type.
- Also requires `orgId` in the auth check (`!requesterId || !orgId`) to reject users without an active org context.

---

#### NC-2 — Group Session Routes Lack Organization Scoping

| Field | Value |
|-------|-------|
| **ID** | NC-2 |
| **Severity** | CRITICAL |
| **Status** | OPEN |
| **System** | III (API) |
| **Files** | `app/api/e2ee/group-sessions/route.ts`, `app/api/e2ee/group-sessions/[id]/share/route.ts`, `app/api/e2ee/group-sessions/[id]/rotate/route.ts`, `app/api/e2ee/group-sessions/[id]/add-members/route.ts` |
| **Phase** | 1 |
| **Fixed in** | Phase 1 implementation (2026-03-25) |

**Problem**: All four group session endpoints authenticate the user but never verify organization membership. An authenticated attacker can: (1) fetch any user's group session share, (2) inject shares into foreign group sessions, (3) rotate any group session (DoS).

**Fix applied** (deviation from document recommendation):
- Document recommended adding `orgId` column to `GroupSession` (Option 1 — schema change + migration).
- Actual implementation used **Option 2 — join-based org resolution** through existing `Conversation`/`Channel` relations. Rationale: (a) avoids a Prisma migration + backfill, reducing Phase 1 deployment risk; (b) keeps data normalized (org lives in Conversation/Channel only); (c) `Channel.organizationId` is always present, `Conversation.organizationId` is nullable for SHARED scope (handled by `??` fallback).
- Each route now includes `{ conversation: { select: { organizationId: true } }, channel: { select: { organizationId: true } } }` and verifies `sessionOrgId === orgId` from `auth()`.
- POST and rotate routes additionally verify all share `userId` values are org members via `getOrgMembersFromDb()` + `clerkUserIds` set check.
- Add-members route verifies session is active AND belongs to caller's org AND all new member IDs are org members.

---

#### NC-3 — Weak PIN Allows Offline Brute-Force After Data Exfiltration

| Field | Value |
|-------|-------|
| **ID** | NC-3 |
| **Severity** | CRITICAL |
| **Status** | FIXED |
| **System** | III |
| **Files** | `lib/e2ee/index.ts` (setup), `app/api/e2ee/identity/route.ts` (POST + PUT) |
| **Phase** | 1 |
| **Fixed in** | Phase 1 implementation (2026-03-25) |

**Problem**: No minimum PIN length is enforced at setup. A 4-digit PIN with 600k PBKDF2 iterations can be brute-forced in ~17 minutes on a GPU if the attacker exfiltrates the `wrappedPrivateKey`, `salt`, and `pepper`.

**Fix applied** (deviation from document recommendation):
- Document said "enforce minimum PIN length at the API level." However, the PIN itself is **never sent to the server** — only `wrappedPrivateKey`, `salt`, and `pbkdfIterations` are transmitted. The server cannot enforce PIN length.
- Actual two-layer implementation:
  1. **Client-side** (`lib/e2ee/index.ts`): `setupIdentity()` now throws if `pin.length < MIN_PIN_LENGTH` (exported constant = 6). This is the only place that can enforce PIN length.
  2. **Server-side** (`app/api/e2ee/identity/route.ts`): Both POST and PUT routes now reject `pbkdfIterations < 600_000`. This prevents a malicious client from weakening the key derivation. The fallback default was also changed from `100000` to `600_000`.

**What-if analysis**: 6-digit PIN at 600k iterations ≈ 28 hours on GPU. 8 digits ≈ 115 days. Future consideration: upgrade to alphanumeric passphrase requirement for orgs handling high-sensitivity data.

---

#### NH-1 — OTP Key Consumption Is Not Atomic (TOCTOU Race)

| Field | Value |
|-------|-------|
| **ID** | NH-1 |
| **Severity** | HIGH |
| **Status** | FIXED |
| **System** | III (API) |
| **File** | `app/api/e2ee/prekey-bundle/[userId]/route.ts:57-88` |
| **Phase** | 1 |
| **Fixed in** | Phase 1 implementation (2026-03-25) |

**Problem**: `findFirst` and `update` are separate operations. Two concurrent requests can both find the same unconsumed OTP key and both mark it as consumed.

**Fix applied** (deviation from document recommendation):
- Document recommended `$transaction(async (tx) => { findFirst + update })`. However, under PostgreSQL's default READ COMMITTED isolation, an interactive transaction's `findFirst` does NOT take a row lock — two transactions can both read the same unconsumed key and both `update` it.
- Actual implementation uses a **retry loop with conditional `updateMany`**:
  1. `findFirst` a candidate OTP key (with `skip: attempt` to avoid re-picking contested keys)
  2. `updateMany({ where: { id: candidate.id, isConsumed: false }, data: { isConsumed: true } })` — this is atomic at the DB level
  3. If `count > 0`, consumption succeeded. If `count === 0`, another request consumed it first — retry with the next key.
  4. Maximum 3 retries (`OTP_MAX_RETRIES`), then fall back to no OTP key (DH3-only X3DH).
- This approach is correct without requiring SERIALIZABLE isolation or `SELECT ... FOR UPDATE`.

---

#### NH-2 — Group Session POST Lacks Zod Input Validation

| Field | Value |
|-------|-------|
| **ID** | NH-2 |
| **Severity** | HIGH |
| **Status** | OPEN |
| **System** | III (API) |
| **File** | `app/api/e2ee/group-sessions/route.ts:15-22` |
| **Phase** | 2 |

**Problem**: No Zod validation on request body. Shares array is unvalidated. Violates project convention (`app/api/CLAUDE.md`).

**Fix**: Define Zod schema:
```typescript
const GroupSessionShareSchema = z.object({
  userId: z.string().min(1),
  ephemeralPublicKey: z.string().min(1),
  encryptedSessionExport: z.string().min(1).max(65536),
  iv: z.string().min(1),
  startingIndex: z.number().int().min(0),
}).strict();

const CreateGroupSessionSchema = z.object({
  conversationId: z.string().optional(),
  channelId: z.string().optional(),
  shares: z.array(GroupSessionShareSchema).min(1).max(100),
}).strict().refine(d => d.conversationId || d.channelId, {
  message: "Must provide conversationId or channelId"
});
```

Apply same pattern to rotate and add-members routes.

---

#### NH-3 — `cacheGet` Fails Open for Brute Force Protection

| Field | Value |
|-------|-------|
| **ID** | NH-3 |
| **Severity** | HIGH |
| **Status** | OPEN |
| **System** | Security Infrastructure |
| **Files** | `lib/redis.ts:86-89`, `lib/security/brute-force.ts:40-46` |
| **Phase** | 2 |

**Problem**: `cacheGet` catches all errors and returns `null`. `checkAttempt` treats `null` as "no attempts recorded" → allows the request. If Redis has a transient error, brute force protection is silently disabled.

**Fix**: Create a `cacheGetStrict()` variant that re-throws errors:
```typescript
export async function cacheGetStrict<T>(key: string): Promise<T | null> {
  const client = getRedisInstance();
  if (!client) throw new Error("Redis unavailable");
  return (await client.get<T>(key)) ?? null;
  // No try/catch — caller handles errors
}
```

Update `checkAttempt` to use `cacheGetStrict` and catch at the function level to fail closed:
```typescript
try {
  current = await cacheGetStrict<number>(key);
} catch {
  console.error(`[BRUTE_FORCE] Redis error for key ${key}, failing closed`);
  return { allowed: false, remaining: 0, retryAfter: 60 };
}
```

**What-if**: This does NOT change the behavior of `cacheGet` used elsewhere (DEK caching, permission caching) — those correctly fail open (graceful degradation). Only the security-critical brute force path changes.

---

#### NH-4 — Entity Session Shares Missing ECIES Field Validation

| Field | Value |
|-------|-------|
| **ID** | NH-4 |
| **Severity** | HIGH |
| **Status** | OPEN |
| **System** | III (API + Service) |
| **Files** | `lib/entity-session/types.ts:13-15`, `lib/entity-session/entity-session-service.ts:51-60` |
| **Phase** | 2 |

**Problem**: `ephemeralPublicKey` and `iv` are optional in the `CreateEntitySessionInput` type. A client submitting a share without these fields creates an undecryptable session.

**Fix**: Make `ephemeralPublicKey` and `iv` required in the input types for new sessions (keep nullable in Prisma schema for backward compat). Add validation in the API route.

---

#### NM-1 — KEK Stored as Raw ArrayBuffer (XSS Extractable)

| Field | Value |
|-------|-------|
| **ID** | NM-1 |
| **Severity** | MEDIUM |
| **Status** | OPEN |
| **System** | III |
| **File** | `lib/e2ee/index.ts:64` |
| **Phase** | 3 |

**Problem**: `_kekRaw` is a plain `ArrayBuffer` — readable by any JS code in the page. A `CryptoKey` with `extractable: false` would be protected by the browser's key store.

**Fix**: Refactor to store KEK as `CryptoKey`. Change `encryptForStorage`/`decryptFromStorage` in `session-store.ts` to accept `CryptoKey` and use `crypto.subtle.encrypt`/`decrypt` directly.

---

#### NM-2 — No Zod Validation on Identity POST Body

| Field | Value |
|-------|-------|
| **ID** | NM-2 |
| **Severity** | MEDIUM |
| **Status** | OPEN |
| **System** | III (API) |
| **File** | `app/api/e2ee/identity/route.ts:18-21` |
| **Phase** | 2 |

**Problem**: Nine fields destructured without Zod. `pbkdfIterations` can be set to 1 by a malicious client.

**Fix**: Zod schema with `pbkdfIterations: z.number().int().min(600000)`.

---

#### NM-3 — DEK Cache Not Invalidated Across Serverless Instances on Rotation

| Field | Value |
|-------|-------|
| **ID** | NM-3 |
| **Severity** | MEDIUM |
| **Status** | OPEN |
| **System** | I |
| **File** | `lib/key-management.ts:55-58` |
| **Phase** | 3 |

**Problem**: L1 in-process cache has 5-minute TTL. After DEK rotation, other function instances continue using the old DEK for up to 5 minutes.

**Fix**: Redis pubsub notification on rotation, or reduce TTL to 30 seconds (tradeoff: more DB reads).

---

#### NM-4 — Entity Comments `initEntitySession` Returns Plaintext Session Export

| Field | Value |
|-------|-------|
| **ID** | NM-4 |
| **Severity** | MEDIUM |
| **Status** | OPEN |
| **System** | III |
| **File** | `lib/e2ee/entity-comments.ts:173-191` |
| **Phase** | 4 |

**Problem**: The function returns the raw session export including plaintext `ratchetKey`. The calling UI code is responsible for ECIES-encrypting before POSTing. No enforcement at the API boundary.

**Fix**: Move ECIES encryption into `initEntitySession()` itself, requiring participant public keys as input.

---

#### NM-5 — `unlock()` Derives KEK Twice (Performance)

| Field | Value |
|-------|-------|
| **ID** | NM-5 |
| **Severity** | MEDIUM |
| **Status** | OPEN |
| **System** | III |
| **File** | `lib/e2ee/index.ts:163-173` |
| **Phase** | 3 |

**Problem**: `unwrapPrivateKey` derives KEK internally (PBKDF2 600k iterations), then `unlock()` calls `deriveKEKFromPIN()` again. Doubles unlock time.

**Fix**: Derive KEK once, pass to both `unwrapPrivateKey` and the raw export.

---

#### NL-1 — Ed25519 Support Check Creates Throwaway Key Pair

| Field | Value |
|-------|-------|
| **ID** | NL-1 |
| **Severity** | LOW |
| **Status** | OPEN |
| **System** | III |
| **File** | `hooks/useE2EE.ts:79-80` |
| **Phase** | 4 |

---

#### NL-2 — OTP Key Private Keys Discarded After Generation

| Field | Value |
|-------|-------|
| **ID** | NL-2 |
| **Severity** | LOW |
| **Status** | OPEN |
| **System** | III |
| **File** | `lib/e2ee/index.ts:513-519` |
| **Phase** | 2 |

**Problem**: `generatePreKeys()` generates key pairs but only returns public keys. Private keys are discarded. OTP keys generated through replenishment are unusable — X3DH falls back to DH3-only (weaker forward secrecy).

**Fix**: Store OTP private keys in IndexedDB (encrypted with KEK), keyed by the OTP key ID. On `respondX3DH`, look up the private key by `initialMessage.oneTimePreKeyId`.

---

#### NL-3 — IndexedDB Write Per Message (Performance)

| Field | Value |
|-------|-------|
| **ID** | NL-3 |
| **Severity** | LOW |
| **Status** | OPEN |
| **System** | III |
| **File** | `lib/e2ee/session-store.ts` |
| **Phase** | 4 |

Observation only — debouncing IndexedDB writes would reduce overhead but risks state loss.

---

## 3. Implementation Phases

### Phase 1 — Critical (Before Any Deployment)

**Goal**: Eliminate cross-org vulnerabilities and cryptographic weakness.

| Task | Finding | Effort | Files Changed | Status |
|------|---------|--------|---------------|--------|
| 1.1 | NC-1: Add org scoping to prekey-bundle | Small | `app/api/e2ee/prekey-bundle/[userId]/route.ts` | DONE |
| 1.2 | NC-2: Add org scoping to group session routes | Medium | `app/api/e2ee/group-sessions/route.ts`, `[id]/share/route.ts`, `[id]/rotate/route.ts`, `[id]/add-members/route.ts` (join-based, no migration) | DONE |
| 1.3 | NC-3: Enforce minimum PIN length (6+ chars) + pbkdfIterations floor | Small | `lib/e2ee/index.ts` (client-side PIN check), `app/api/e2ee/identity/route.ts` (server-side iterations floor on POST + PUT) | DONE |
| 1.4 | NH-1: Make OTP consumption atomic | Small | `app/api/e2ee/prekey-bundle/[userId]/route.ts` (conditional updateMany with retry loop) | DONE |

**Completed**: 2026-03-25
**Verification**: All 55 E2EE tests pass (8 test files). Manual cross-org test pending deployment.

### Phase 2 — High (Before Public Availability)

**Goal**: Input validation, brute force integrity, protocol correctness.

| Task | Finding | Effort | Files to Change |
|------|---------|--------|-----------------|
| 2.1 | NH-2: Zod validation on group session routes | Small | All 4 group session route files |
| 2.2 | NH-3: Fix cacheGet fail-open for brute force | Small | `lib/redis.ts`, `lib/security/brute-force.ts` |
| 2.3 | NH-4: Require ECIES fields in entity session shares | Small | `lib/entity-session/types.ts`, entity-sessions route |
| 2.4 | NM-2: Zod on identity POST with pbkdfIterations min | Small | `app/api/e2ee/identity/route.ts` |
| 2.5 | NL-2: Store OTP private keys in IndexedDB | Medium | `lib/e2ee/index.ts`, `lib/e2ee/session-store.ts` |
| 2.6 | M-1: Standardize IV to 12 bytes | Small | `lib/encryption.ts` |
| 2.7 | M-4: Add hex validation to `isEncrypted()` | Small | `lib/encryption.ts` |

**Estimated effort**: 1 day
**Verification**: Run all tests + lint

### Phase 3 — Medium (Hardening Sprint)

**Goal**: Defense in depth, performance, resilience.

| Task | Finding | Effort | Files to Change |
|------|---------|--------|-----------------|
| 3.1 | NM-1: Store KEK as CryptoKey | Medium | `lib/e2ee/index.ts`, `lib/e2ee/session-store.ts` |
| 3.2 | NM-3: DEK cache invalidation strategy | Medium | `lib/key-management.ts`, `lib/redis.ts` |
| 3.3 | NM-5: Deduplicate PBKDF2 in unlock | Small | `lib/e2ee/index.ts`, `lib/e2ee/primitives.ts` |
| 3.4 | M-2: Encrypt empty strings | Small | `lib/encryption.ts` |
| 3.5 | M-3: Fix dual-lock race | Small | `components/providers/EncryptionProvider.tsx` |
| 3.6 | M-5: Use wrapKey for DH private key | Medium | `lib/e2ee/double-ratchet.ts` |
| 3.7 | M-6: Verify OTP key ID in respondX3DH | Small | `lib/e2ee/x3dh.ts` |

**Estimated effort**: 1.5 days

### Phase 4 — Low (Cleanup + Architecture)

**Goal**: Technical debt, long-term correctness.

| Task | Finding | Effort | Files to Change |
|------|---------|--------|-----------------|
| 4.1 | H-5: Unified unlock UX | Large | Multiple providers, UI components |
| 4.2 | H-6: Server-side session backup | Large | `lib/e2ee/`, new API routes |
| 4.3 | L-3: Deprecate lib/crypto/ | Medium | `lib/crypto/`, `EncryptionProvider.tsx` |
| 4.4 | L-4: Raise maxMessages to 1000 | Small | `lib/e2ee/megolm.ts` |
| 4.5 | L-5: Fix bufferToBase64 performance | Small | `lib/e2ee/primitives.ts` |
| 4.6 | NM-4: Move ECIES into initEntitySession | Medium | `lib/e2ee/entity-comments.ts` |
| 4.7 | C-3: Re-encryption migration script | Large | New script, model changes |

**Estimated effort**: 3-4 days

---

## 4. Cross-System Interaction Rules

These rules apply whenever code touches more than one encryption system.

### Ciphertext Format Detection

| System | Format | Detection |
|--------|--------|-----------|
| I (Server) | `<32 hex>:<32 hex>:<hex>` | `isEncrypted()` in `lib/encryption.ts` |
| II (Passphrase) | `e2ee:v1:<base64>` | `isFieldEncrypted()` in `lib/crypto/encryption.ts` — checks `e2ee:v1:` prefix |
| III (E2EE) | `<base64>:<base64>` (iv:ciphertext) | No detection function — format known in context |

**Rule**: Never apply System I's `decrypt()` or `decryptWithKey()` to System II or III ciphertext. The format prefixes are distinct enough to prevent accidental cross-decryption, but this is by coincidence, not design. When implementing M-4 (sentinel prefix), all three formats should be made unambiguously distinguishable.

### Data Flow Boundaries

- **System I** operates in Node.js server actions and API routes only. Key material (`SECRETS_ENCRYPTION_KEY`, org DEKs) never reaches the browser.
- **System II** operates in the browser only (`"use client"` modules). The OMK is derived client-side; the server stores only the wrapped key.
- **System III** operates in the browser only (`"use client"` modules). Identity keys are wrapped client-side; the server stores only wrapped keys and public keys.
- **System I ↔ System III overlap**: Entity comment `content` is stored in the DB as System III ciphertext (`iv:ciphertext`). System I's field encryption does NOT apply to these fields — the `content` column stores opaque E2EE ciphertext. If System I's `encryptMessageForOrg` is called on a comment that's already System III encrypted, `isEncrypted()` will return false (wrong format) and the comment will be double-encrypted. **This path must be guarded against.**

### Lock State Independence

- System II lock (`EncryptionProvider.lock()`) clears `omk.current`
- System III lock (`e2ee.lock()`) clears `_kekRaw`, `_identityKeyPair`, `_signingKeyPair`
- Neither system's lock affects the other
- UI must show both states if both systems are active in an org

---

## 5. Security Invariants

These are non-negotiable rules that every security conversation and implementation MUST follow.

### Tenant Isolation

1. **Every database query involving tenant data MUST filter by `organizationId`** — including E2EE routes (currently violated by NC-1, NC-2).
2. **Never accept `organizationId` from the client** — always derive from `getCurrentOrgId()` or `auth().orgId`.
3. **E2EE key bundles, session shares, and group sessions are org-scoped resources** — treat them with the same isolation as CRM/MLS data.

### Cryptographic Correctness

4. **Never use HMAC where a digital signature is required** — HMAC requires shared secrets; signatures use public/private key pairs.
5. **Never store plaintext key material on the server** — all private keys and session keys must be wrapped/encrypted before upload.
6. **ECIES is mandatory for all session export sharing** — no plaintext ratchet keys in transit or at rest on the server.
7. **AES-GCM IVs must be unique per encryption operation** — reusing an IV with the same key catastrophically breaks GCM's authentication guarantee.
8. **PBKDF2 iterations must be ≥ 600,000** — enforced at both client setup and server validation.

### Defense in Depth

9. **All API request bodies must be Zod-validated** — no direct destructuring of `req.json()` without schema validation.
10. **Brute force protection must fail closed** — if Redis is unavailable, deny the attempt.
11. **Rate limiting is insufficient without minimum credential strength** — rate limits protect online attacks; PIN/passphrase strength protects offline attacks.

### Key Management

12. **DEK rotation must invalidate all caches** — both L1 (in-process) and L2 (Redis).
13. **Master key fallback is transitional** — it must eventually be removed after re-encryption migration completes.
14. **The server must never see plaintext E2EE private keys** — System III identity keys, signing keys, and session keys are wrapped client-side.

### Error Handling

15. **Cryptographic errors must not be silently swallowed** — a failed AES-GCM auth tag check means wrong key or tampered data, never "try another key silently".
16. **Error messages must not expose cryptographic details** — return generic messages to clients, log specifics server-side.

---

## 6. File Reference Map

### System I — Server-Side Field Encryption

| File | Purpose | Security-Critical |
|------|---------|-------------------|
| `lib/encryption.ts` | AES-256-GCM primitives, `isEncrypted()` | Yes — IV size (M-1), empty string bypass (M-2), false-positive (M-4), fallback (C-3) |
| `lib/key-management.ts` | Per-org DEK lifecycle, 3-tier caching | Yes — cache invalidation (NM-3) |
| `lib/model-encryption.ts` | Typed encrypt/decrypt per model | No — delegates to `encryption.ts` |
| `lib/platform-key-management.ts` | Platform-wide DEK | Low risk — same pattern as org DEK |

### System II — Client-Side Passphrase E2EE

| File | Purpose | Security-Critical |
|------|---------|-------------------|
| `lib/crypto/constants.ts` | Algorithm constants | No |
| `lib/crypto/key-derivation.ts` | PBKDF2 passphrase → KEK | No |
| `lib/crypto/key-wrapping.ts` | OMK wrapping/unwrapping | No |
| `lib/crypto/encryption.ts` | Field/JSON encrypt via OMK | No |
| `lib/crypto/field-handlers.ts` | Model-specific field ops | No |
| `components/providers/EncryptionProvider.tsx` | React context, idle auto-lock | Yes — dual-lock race (M-3) |

### System III — Advanced Messaging E2EE

| File | Purpose | Security-Critical |
|------|---------|-------------------|
| `lib/e2ee/primitives.ts` | WebCrypto primitives | Yes — foundation for all System III crypto |
| `lib/e2ee/x3dh.ts` | X3DH key agreement | Yes — SPK verification (C-1, C-2 fixed), OTP verification (M-6) |
| `lib/e2ee/double-ratchet.ts` | Double Ratchet | Yes — private key serialization (M-5) |
| `lib/e2ee/megolm.ts` | Megolm group encryption | Medium — max messages (L-4), out-of-order (H-2 fixed) |
| `lib/e2ee/entity-comments.ts` | Entity-as-channel pattern | Medium — plaintext export (NM-4) |
| `lib/e2ee/session-store.ts` | IndexedDB persistence | Yes — all sessions encrypted at rest |
| `lib/e2ee/attachment.ts` | Per-file AES-256 | Low risk |
| `lib/e2ee/index.ts` | Public API, ECIES | Yes — KEK storage (NM-1), unlock perf (NM-5), OTP keys (NL-2) |
| `lib/e2ee/types.ts` | TypeScript interfaces | No |

### API Routes

| Route | Security Issues |
|-------|----------------|
| `app/api/e2ee/identity/route.ts` | NC-3 FIXED (pbkdfIterations floor on POST + PUT), no Zod (NM-2 — Phase 2) |
| `app/api/e2ee/pepper/route.ts` | Rate limiting works (H-3 fixed) |
| `app/api/e2ee/prekey-bundle/[userId]/route.ts` | NC-1 FIXED (org scoping), NH-1 FIXED (atomic OTP) |
| `app/api/e2ee/group-sessions/route.ts` | NC-2 FIXED (org scoping + member check), no Zod (NH-2 — Phase 2) |
| `app/api/e2ee/group-sessions/[id]/share/route.ts` | NC-2 FIXED (org scoping via join) |
| `app/api/e2ee/group-sessions/[id]/rotate/route.ts` | NC-2 FIXED (org scoping + member check) |
| `app/api/e2ee/group-sessions/[id]/add-members/route.ts` | NC-2 FIXED (org scoping + member check) |
| `app/api/e2ee/entity-sessions/route.ts` | **Good** — org scoping, UUID validation, blob size limits |
| `app/api/e2ee/entity-sessions/[sessionId]/shares/route.ts` | **Good** — org scoping, caller share verification, member check |
| `app/api/e2ee/unlock-attempt/route.ts` | Good — success ignored (TTL-based reset) |

### Security Infrastructure

| File | Purpose | Security Issues |
|------|---------|-----------------|
| `lib/security/brute-force.ts` | Rate limiting | cacheGet fails open (NH-3) |
| `lib/redis.ts` | Redis client + helpers | cacheGet error handling (NH-3) |
| `lib/permissions/service.ts` | Permission checking | Not directly encryption-related |
| `proxy.ts` | Middleware — auth, rate limiting | Not modified in this audit |

---

## 7. Verification Checklist

Use this checklist after completing each phase to confirm all fixes are correct.

### After Phase 1

- [ ] **NC-1**: Request prekey-bundle for a user in a different org → expect 404
- [ ] **NC-1**: Request prekey-bundle for a user in the same org → expect 200 with bundle
- [ ] **NC-2**: POST group session with shares containing cross-org userId → expect 403
- [ ] **NC-2**: GET group session share for session in different org → expect 404
- [ ] **NC-2**: POST rotate for session in different org → expect 404
- [ ] **NC-2**: POST add-members with cross-org userId → expect 403
- [ ] **NC-3**: Setup identity with 4-digit PIN → expect 400
- [ ] **NC-3**: Setup identity with 6-digit PIN → expect 200
- [ ] **NH-1**: Two concurrent prekey-bundle requests → each gets a different OTP key
- [ ] All existing E2EE tests pass (`pnpm vitest run tests/e2ee/`)
- [ ] X3DH handshake completes end-to-end (manual or integration test)

### After Phase 2

- [ ] **NH-2**: POST group session with invalid share schema → expect 400
- [ ] **NH-3**: Simulate Redis failure during PIN unlock → expect 429 (blocked)
- [ ] **NH-4**: POST entity session share without ephemeralPublicKey → expect 400
- [ ] **NM-2**: POST identity with pbkdfIterations=1 → expect 400
- [ ] **NL-2**: After OTP replenishment, respondX3DH with OTP key → succeeds
- [ ] **M-1**: New ciphertext uses 12-byte IV (24 hex chars in part[0])
- [ ] **M-1**: Old ciphertext (16-byte IV) still decrypts correctly
- [ ] **M-4**: `isEncrypted("not:hex:data")` → false (hex validation)

### After Phase 3

- [ ] **NM-1**: `_kekRaw` is a CryptoKey, not ArrayBuffer
- [ ] **NM-5**: Unlock time reduced by ~50%
- [ ] **M-2**: `encrypt("")` returns ciphertext (not empty string)
- [ ] **M-3**: Only one `lock()` call fires on idle timeout
- [ ] **M-5**: No `exportPrivateKey` call in Double Ratchet serialize
- [ ] **M-6**: respondX3DH with wrong OTP key ID → throws

### After Phase 4

- [ ] **L-3**: All `lib/crypto/` exports have `@deprecated` JSDoc
- [ ] **L-4**: `DEFAULT_MAX_MESSAGES` = 1000
- [ ] **C-3**: All pre-migration data re-encrypted, `DISABLE_MASTER_KEY_FALLBACK=true` works

---

## 8. Change Log

| Date | Phase | Finding(s) | Action | Author |
|------|-------|------------|--------|--------|
| 2026-03-25 | 1 | NC-1, NC-2, NC-3, NH-1 | **Phase 1 implemented**: org scoping on prekey-bundle (join via `clerkUserIds`), org scoping on all 4 group session routes (join-based via Conversation/Channel relations, no migration), PIN length >= 6 client-side + `pbkdfIterations >= 600k` server-side on POST+PUT, atomic OTP consumption via conditional `updateMany` with retry loop. 3 deviations from document recommendations documented inline. All 55 E2EE tests pass. | Claude (implementation) |
| 2026-03-25 | — | All | Document created from deep audit | Claude (audit) |
| 2026-03-24 | — | C-1, C-2, H-1–H-4, L-1, L-6 | Fixes implemented in `feature/e2ee-security-corrections` | Claude (previous session) |

---

*This document is versioned alongside the codebase. Update the Change Log when any finding status changes.*
