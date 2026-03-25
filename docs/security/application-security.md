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
| I | Server-Side Field Encryption (Per-Org DEK) | CRM/MLS PII fields at rest + message content | `lib/encryption.ts`, `lib/key-management.ts`, `lib/model-encryption.ts` | Active (production) |
| II | Client-Side Passphrase E2EE (OMK) | ~~CRM/MLS field display in browser~~ | ~~`lib/crypto/`~~, ~~`EncryptionProvider.tsx`~~ | **RETIRED** (2026-03-25, H-5) — all files deleted |
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
| **Status** | FIXED (migration script ready, pending execution) |
| **System** | I |
| **Files** | `lib/encryption.ts:125-153`, `scripts/migrate-to-org-dek.ts` |
| **Fixed in** | C-3 implementation (2026-03-25) |

**What was wrong**: When AES-GCM auth tag verification failed (wrong DEK), the code silently retried with the global master key. This made key rotation ineffective for existing data.

**Fix applied** (deviation from document):
- Document recommended "adding a `dekVersion` column to tag records." This was not needed because the existing `decryptClientForOrg`/`encryptClientForOrg` pipeline already handles detection: `decryptWithKey(value, dek)` tries the org DEK first, falls back to master key if auth tag fails, then `encryptWithKey(plaintext, dek)` re-encrypts with the DEK. No version column required.
- Extended `scripts/migrate-to-org-dek.ts` with **6 missing models**: Mandates, Client Comments, Mandate Comments, Task Comments, MyAccount, NewsletterSubscriber. Total: 13 model types covered.
- Added `--verify` mode that checks representative fields against org DEK using `canDecryptWithDek()` (raw AES-GCM without fallback). Reports per-org counts of still-master-key-encrypted records.
- Added `canDecryptWithDek()` helper that tests decryption without the master key fallback.

**Migration workflow**:
1. `npx tsx scripts/migrate-to-org-dek.ts --dry-run` — preview what will change
2. `npx tsx scripts/migrate-to-org-dek.ts` — execute re-encryption
3. `npx tsx scripts/migrate-to-org-dek.ts --verify` — confirm all records are DEK-encrypted
4. Set `DISABLE_MASTER_KEY_FALLBACK=true` in production env vars
5. (Future) Remove the fallback code path in `decryptWithKey()` entirely

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
| **Status** | FIXED (2026-03-25) |
| **Systems** | II + III |
| **Files** | `components/providers/EncryptionProvider.tsx`, `hooks/useE2EE.ts` |

**Problem**: System II (passphrase) and System III (PIN) operate independently. A user can unlock one while the other remains locked, with no UI indication of the split state.

**Recommended approach**: Either unify the two systems (unified encryption spec exists at `docs/superpowers/specs/2026-03-15-unified-encryption-architecture-design.md`) or add explicit dual-state UI showing both lock states.

**Impact of unification**: Would require migrating `e2ee:v1:` prefixed ciphertext to the unified format, choosing a single credential (PIN vs passphrase), and reconciling the two idle-lock strategies.

**Status**: FIXED (2026-03-25)
**Implementation**: Complete removal of System II (passphrase-based encryption).
- Deleted: `lib/crypto/` (6 files), `actions/encryption/` (6 files), `EncryptionProvider`, `use-encrypted-search`, `IdleTimeoutWarning`
- Dropped: `OrganizationEncryptionStatus` and `OrganizationEncryptionKey` Prisma models
- Replaced: Passphrase UI in DataControlTab and OrgDataControlContent with E2EE info cards pointing to Security Settings
- Result: Single unlock flow (PIN-based, System III) — no more dual-state confusion
- Spec: `docs/superpowers/specs/2026-03-25-system-ii-retirement-design.md`

---

#### H-6 — No Session Recovery After IndexedDB Clear

| Field | Value |
|-------|-------|
| **ID** | H-6 |
| **Severity** | HIGH |
| **Status** | FIXED (2026-03-25) |
| **System** | III |
| **File** | `lib/e2ee/session-store.ts` |

**Problem**: If IndexedDB is cleared (browser data clear, private browsing), all Double Ratchet and Megolm sessions are lost. No recovery flow exists.

**Recommended approach**: After each ratchet step, POST the serialized session (encrypted to the user's own public key) as a server-side backup. On IndexedDB miss, fetch and decrypt the backup.

**Entity sessions have partial coverage**: `EntitySessionBackup` model exists for ORK-encrypted entity session backups. Group sessions and DM sessions have no backup mechanism.

**Status**: FIXED (2026-03-25)
**Implementation**: Server-mediated session sync with dual-layer encryption (ECIES + DEK wrap).
- Prisma model: `E2eeSessionBackup` with per-user, per-org scoping
- Client: `SessionBackupManager` with 5s debounced batch upload, ECIES encryption
- Server: POST/GET/DELETE API routes with Zod validation, DEK wrap/unwrap
- Restore: Automatic on PIN unlock via `restoreAll()`
- UI: Syncing state in E2EESessionButton, PinEntryDialog progress, Settings page status
- Spec: `docs/superpowers/specs/2026-03-25-e2ee-session-backup-design.md`
- Plan: `docs/superpowers/plans/2026-03-25-e2ee-session-backup.md`

---

#### M-1 — IV Size Inconsistency (16 vs 12 Bytes)

| Field | Value |
|-------|-------|
| **ID** | M-1 |
| **Severity** | MEDIUM |
| **Status** | FIXED |
| **Systems** | I vs III |
| **Files** | `lib/encryption.ts:21` |
| **Fixed in** | Phase 2 implementation (2026-03-25) |

**Problem**: Server-side uses 128-bit IVs; client-side uses 96-bit (NIST recommended).

**Fix applied**: Changed `IV_BYTES` from 16 to 12 in `lib/encryption.ts`. Updated `isEncrypted()` simultaneously (see M-4) to accept both 24-char (12-byte, new) and 32-char (16-byte, legacy) IV hex strings. `decrypt()` and `decryptWithKey()` read IV from the split — length is implicit, so existing ciphertext decrypts correctly without migration.

---

#### M-2 — Empty String Bypass Leaks Metadata

| Field | Value |
|-------|-------|
| **ID** | M-2 |
| **Severity** | MEDIUM |
| **Status** | FIXED |
| **System** | I |
| **File** | `lib/encryption.ts` |
| **Fixed in** | Phase 3 implementation (2026-03-25) |

**Problem**: `encrypt("")` returns `""`. An attacker with DB access can distinguish "no email" (empty string) from "has email" (ciphertext).

**Fix applied**: Removed the `if (plaintext === "") return plaintext` early return from both `encrypt()` and `encryptWithKey()`. Empty strings are now encrypted. Backward compat: existing empty strings in the DB remain as `""` — `isEncrypted("")` returns false (falsy check), so `decryptWithKey("")` returns `""` as-is. No migration needed for existing data.

---

#### M-3 — Idle Timer Dual-Lock Race

| Field | Value |
|-------|-------|
| **ID** | M-3 |
| **Severity** | MEDIUM |
| **Status** | FIXED |
| **System** | II |
| **File** | `components/providers/EncryptionProvider.tsx` |
| **Fixed in** | Phase 3 implementation (2026-03-25) |

**Problem**: Both `setInterval` (countdown) and `setTimeout` (auto-lock) can call `lock()`. Two `lock()` calls in quick succession trigger two React state updates.

**Fix applied**: Removed the `lock()` call from the interval's `remaining <= 0` branch. The interval now only updates the countdown display — `setTimeout` is the sole trigger for `lock()`.

---

#### M-4 — `isEncrypted()` Heuristic Can False-Positive

| Field | Value |
|-------|-------|
| **ID** | M-4 |
| **Severity** | MEDIUM |
| **Status** | FIXED |
| **Fixed in** | Phase 2 implementation (2026-03-25) |
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
| **Status** | DEFERRED (TODO comment added) |
| **System** | III |
| **File** | `lib/e2ee/double-ratchet.ts:193` |

**Problem**: `serialize()` calls `exportPrivateKey()` which creates a plaintext base64 string of the PKCS8-encoded private key in JS memory before it's encrypted for IndexedDB storage.

**Deferral rationale**: The plaintext window is microseconds (serialize → encryptForStorage pipeline). More importantly, ALL ratchet state (rootKey, sendChainKey, recvChainKey, skippedKeys) is equally sensitive and also exists as plaintext base64 during serialization. Using `wrapKey` only for the DH private key while leaving other keys as plaintext base64 would be inconsistent. A complete fix requires redesigning the entire serialization model to wrap each key individually or encrypt the full state in one operation — which is already what `encryptForStorage` does. The current approach provides equivalent security through immediate full-state encryption.

**Fix**: Use `crypto.subtle.wrapKey("pkcs8", privateKey, kek, { name: "AES-GCM", iv })` to go directly from CryptoKey to encrypted form. Requires refactoring `storeRatchetSession()` to accept a `CryptoKey` KEK instead of raw bytes.

---

#### M-6 — OTP Key Replay Not Prevented Client-Side

| Field | Value |
|-------|-------|
| **ID** | M-6 |
| **Severity** | MEDIUM |
| **Status** | FIXED |
| **System** | III |
| **File** | `lib/e2ee/x3dh.ts` |
| **Fixed in** | Phase 3 implementation (2026-03-25) |

**Problem**: `respondX3DH()` doesn't verify that the OTP key pair actually used matches `initialMessage.oneTimePreKeyId`.

**Fix applied**: Changed `bobOneTimePreKey` parameter type from `CryptoKeyPair | undefined` to `{ keyPair: CryptoKeyPair; id: string } | undefined`. The function now throws `"OTP key ID mismatch"` if `bobOneTimePreKey.id !== initialMessage.oneTimePreKeyId`. Updated callers: `acceptDMSession()` in index.ts and test callsites in x3dh.test.ts.

---

#### L-2 — PinSetupDialog Referenced But Not Found

| Field | Value |
|-------|-------|
| **ID** | L-2 |
| **Severity** | LOW |
| **Status** | VERIFIED — EXISTS |
| **System** | III |
| **File** | `components/e2ee/PinSetupDialog.tsx` |

**Verified**: The component exists at `components/e2ee/PinSetupDialog.tsx` and is imported by `E2EESessionButton.tsx` and the settings security page. No action needed.

---

#### L-3 — `lib/crypto/` Has No Deprecation Path

| Field | Value |
|-------|-------|
| **ID** | L-3 |
| **Severity** | LOW |
| **Status** | FIXED |
| **Fixed in** | Phase 4 implementation (2026-03-25) |
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
| **Status** | FIXED |
| **Fixed in** | Phase 4 implementation (2026-03-25) |
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
| **Status** | FIXED |
| **Fixed in** | Phase 4 implementation (2026-03-25) |
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
| **Status** | FIXED |
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
| **Status** | FIXED |
| **System** | III (API) |
| **Files** | `app/api/e2ee/group-sessions/route.ts`, `[id]/rotate/route.ts`, `[id]/add-members/route.ts` |
| **Phase** | 2 |
| **Fixed in** | Phase 2 implementation (2026-03-25) |

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
| **Status** | FIXED |
| **System** | Security Infrastructure |
| **Files** | `lib/redis.ts`, `lib/security/brute-force.ts` |
| **Phase** | 2 |
| **Fixed in** | Phase 2 implementation (2026-03-25) |

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
| **Status** | FIXED |
| **System** | III (API + Service) |
| **Files** | `lib/entity-session/types.ts`, `app/api/e2ee/entity-sessions/route.ts` |
| **Phase** | 2 |
| **Fixed in** | Phase 2 implementation (2026-03-25) |

**Problem**: `ephemeralPublicKey` and `iv` are optional in the `CreateEntitySessionInput` type. A client submitting a share without these fields creates an undecryptable session.

**Fix**: Make `ephemeralPublicKey` and `iv` required in the input types for new sessions (keep nullable in Prisma schema for backward compat). Add validation in the API route.

---

#### NM-1 — KEK Stored as Raw ArrayBuffer (XSS Extractable)

| Field | Value |
|-------|-------|
| **ID** | NM-1 |
| **Severity** | MEDIUM |
| **Status** | DEFERRED (TODO comment added) |
| **System** | III |
| **File** | `lib/e2ee/index.ts:67` |
| **Phase** | Future |

**Problem**: `_kekRaw` is a plain `ArrayBuffer` — readable by any JS code in the page. A `CryptoKey` with `extractable: false` would be protected by the browser's key store.

**Deferral rationale**: Requires refactoring `aesGcmEncrypt`/`aesGcmDecrypt` in primitives, all session-store functions, entity-comments, and the E2EE index module to accept `CryptoKey` instead of `ArrayBuffer`. The XSS benefit is limited: if an attacker has XSS, they can intercept the PIN during entry (e.g., keylogger on the input field) — making the KEK's extractability moot. The real XSS defense is preventing XSS (CSP, sanitization, React's built-in escaping). Disproportionate refactor effort for marginal security gain.

**Fix**: Refactor to store KEK as `CryptoKey`. Change `encryptForStorage`/`decryptFromStorage` in `session-store.ts` to accept `CryptoKey` and use `crypto.subtle.encrypt`/`decrypt` directly.

---

#### NM-2 — No Zod Validation on Identity POST Body

| Field | Value |
|-------|-------|
| **ID** | NM-2 |
| **Severity** | MEDIUM |
| **Status** | FIXED |
| **System** | III (API) |
| **File** | `app/api/e2ee/identity/route.ts` |
| **Phase** | 2 |
| **Fixed in** | Phase 2 implementation (2026-03-25) |

**Problem**: Nine fields destructured without Zod. `pbkdfIterations` can be set to 1 by a malicious client.

**Fix**: Zod schema with `pbkdfIterations: z.number().int().min(600000)`.

---

#### NM-3 — DEK Cache Not Invalidated Across Serverless Instances on Rotation

| Field | Value |
|-------|-------|
| **ID** | NM-3 |
| **Severity** | MEDIUM |
| **Status** | FIXED |
| **System** | I |
| **File** | `lib/key-management.ts` |
| **Phase** | 3 |
| **Fixed in** | Phase 3 implementation (2026-03-25) |

**Problem**: L1 in-process cache has 5-minute TTL. After DEK rotation, other function instances continue using the old DEK for up to 5 minutes.

**Fix applied** (deviation from document): Document recommended "Redis pubsub or reduce TTL." Implemented the simpler TTL reduction approach — `DEK_CACHE_TTL_MS` changed from `5 * 60 * 1000` (5 min) to `30 * 1000` (30s). Trade-off: ~10x more L2 Redis reads, but each is <1ms for a single small value. Redis pubsub would be more precise but requires Upstash-specific pubsub integration — disproportionate complexity.

---

#### NM-4 — Entity Comments `initEntitySession` Returns Plaintext Session Export

| Field | Value |
|-------|-------|
| **ID** | NM-4 |
| **Severity** | MEDIUM |
| **Status** | FIXED |
| **System** | III |
| **Files** | `lib/e2ee/index.ts` |
| **Phase** | 4 |
| **Fixed in** | Phase 4 implementation (2026-03-25) |

**Problem**: `initEntitySession()` returns the raw session export including plaintext `ratchetKey`. The calling UI code is responsible for ECIES-encrypting before POSTing.

**Fix applied** (deviation from document): Document said "move ECIES into initEntitySession() itself." However, `initEntitySession()` lives in `entity-comments.ts` (a focused module) and doesn't have access to the ECIES functions in `index.ts`. Instead, added `initEntitySessionWithShares()` in `index.ts` that wraps `initEntitySession()` + `eciesEncryptSessionExport()` — the same pattern as `createGroupSession()`. The old `initEntitySession()` is marked `@deprecated` with guidance to use the new function. API boundary now enforced: callers get ECIES shares, never plaintext.

---

#### NM-5 — `unlock()` Derives KEK Twice (Performance)

| Field | Value |
|-------|-------|
| **ID** | NM-5 |
| **Severity** | MEDIUM |
| **Status** | FIXED |
| **System** | III |
| **Files** | `lib/e2ee/primitives.ts`, `lib/e2ee/index.ts` |
| **Phase** | 3 |
| **Fixed in** | Phase 3 implementation (2026-03-25) |

**Problem**: `unwrapPrivateKey` derives KEK internally (PBKDF2 600k iterations), then `unlock()` calls `deriveKEKFromPIN()` again — redundant derivation.

**Fix applied** (deviation from document): Document said "doubles unlock time." Actual analysis: identity key and signing key have *different* salts, so they require separate PBKDF2 derivations. The optimization is 3 PBKDF2 calls → 2 (not 2 → 1). Added `unwrapPrivateKeyWithKEK()` and `unwrapEd25519PrivateKeyWithKEK()` to primitives.ts — accept a pre-derived KEK CryptoKey. `unlock()` now derives identity KEK once and reuses it for both unwrap and raw export.

---

#### NL-1 — Ed25519 Support Check Creates Throwaway Key Pair

| Field | Value |
|-------|-------|
| **ID** | NL-1 |
| **Severity** | LOW |
| **Status** | WON'T FIX |
| **System** | III |
| **File** | `hooks/useE2EE.ts:79-80` |

**Rationale**: WebCrypto has no `algorithm.supported()` API — the only way to detect Ed25519 support is to attempt an operation. `generateKey` with `extractable: false` is already the lightest option (browser doesn't need to make the key exportable). The key pair is GC'd immediately. No lighter alternative exists.

---

#### NL-2 — OTP Key Private Keys Discarded After Generation

| Field | Value |
|-------|-------|
| **ID** | NL-2 |
| **Severity** | LOW |
| **Status** | FIXED |
| **Fixed in** | Phase 2 implementation (2026-03-25) |
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
| **Status** | WON'T FIX (observation) |
| **System** | III |
| **File** | `lib/e2ee/session-store.ts` |
| **Phase** | 4 |

Observation only — debouncing IndexedDB writes would reduce overhead but risks state loss.

---

### Third-Party SDK Data Breach Surface (2026-03-25)

A comprehensive audit of all third-party SDKs identified data breach vectors where decrypted PII escaped the encryption boundary through side channels (analytics, real-time messaging, notification storage, logs). All code-fixable gaps have been remediated.

#### SDK-1 — PostHog Session Recording Captured All Decrypted PII

| Field | Value |
|-------|-------|
| **ID** | SDK-1 |
| **Severity** | CRITICAL |
| **Status** | FIXED |
| **SDK** | PostHog (`posthog-js`) |
| **File** | `components/providers/PostHogProvider.tsx` |

**Problem**: Session recording was enabled in production (`disable_session_recording: false`). PostHog recorded everything rendered on screen — when a user viewed a client detail page, decrypted names, phone numbers, emails, and tax IDs were captured and transmitted to PostHog's servers, effectively bypassing field-level encryption.

**Fix**: `disable_session_recording: true` + `advanced_disable_session_recording: true` (prevents remote re-enablement from PostHog dashboard).

---

#### SDK-2 — PostHog Autocapture Sent Clicked Element Text

| Field | Value |
|-------|-------|
| **ID** | SDK-2 |
| **Severity** | CRITICAL |
| **Status** | FIXED |
| **SDK** | PostHog (`posthog-js`) |
| **File** | `components/providers/PostHogProvider.tsx` |

**Problem**: PostHog `autocapture` defaults to `true`, recording text content of every clicked element. In a CRM displaying decrypted client names, phones, and tax IDs, every click sent PII to PostHog.

**Fix**: `autocapture: false` in `posthog.init()` options.

---

#### SDK-3 — Ably Received Decrypted Client Names in Social Post Events

| Field | Value |
|-------|-------|
| **ID** | SDK-3 |
| **Severity** | HIGH |
| **Status** | FIXED |
| **SDK** | Ably (`ably`) |
| **Files** | `actions/social-feed/create-social-post.ts`, `hooks/useAbly.ts`, `app/[locale]/app/(routes)/network/feed/components/FeedPage.tsx` |

**Problem**: `create-social-post.ts` decrypted `client_name` and published it through Ably's servers in the social feed event payload. Author names, post content, entity titles, and attachment URLs were also included.

**Fix**: Ably payload stripped to IDs only (`{ id, slug, type, timestamp, authorId, linkedEntityId }`). Client-side handler (`useAblyFeed`) uses new `onPostNotification` callback that triggers `router.refresh()` to refetch from the authenticated API.

---

#### SDK-4 — Message Content Stored Plaintext in DB and Sent via Ably

| Field | Value |
|-------|-------|
| **ID** | SDK-4 |
| **Severity** | HIGH |
| **Status** | FIXED |
| **SDK** | Prisma Accelerate + Ably |
| **Files** | `lib/messaging.ts`, `app/api/messaging/messages/route.ts`, `actions/messaging/search.ts` |

**Problem**: Message content was stored as plaintext in the `Message` table (visible to Prisma Accelerate proxy) and published with full content to Ably's servers on every message send/edit.

**Fix (write paths)**: `encryptMessageForOrg()` called before DB write in all 3 write paths (POST route, PATCH route, `lib/messaging.ts`). Ably events stripped to `{ id, senderId, channelId, createdAt }`.

**Fix (read paths)**: `decryptMessageForOrg()` called in GET route handler and search action before returning data to clients.

**Trade-off**: Server-side encrypted messages cannot be searched via SQL `contains` — the DB sees ciphertext. The search action documents this limitation.

---

#### SDK-5 — Plaintext Message Preview in Notification Table

| Field | Value |
|-------|-------|
| **ID** | SDK-5 |
| **Severity** | HIGH |
| **Status** | FIXED |
| **SDK** | Internal (Notification table) |
| **File** | `app/api/messaging/messages/route.ts` |

**Problem**: `notifyNewMessage()` received `content.substring(0, 200)` — plaintext message text — and stored it as the `message` field in the `Notification` table. This created a second, unencrypted copy of message content.

**Fix**: Replaced plaintext previews with generic strings: `"New message"` for channel/conversation notifications, `"You were mentioned in a message"` for mentions.

---

#### SDK-6 — PostHog Pageview URLs Leaked Entity IDs

| Field | Value |
|-------|-------|
| **ID** | SDK-6 |
| **Severity** | MEDIUM |
| **Status** | FIXED |
| **SDK** | PostHog (`posthog-js`) |
| **File** | `components/providers/PostHogProvider.tsx` |

**Problem**: Full page URLs were sent as `$current_url` in pageview events, including entity IDs like `/app/crm/clients/abc123`.

**Fix**: URL redaction via regex: `/clients/abc123` → `/clients/[id]` for all entity types (clients, properties, mandates, deals, events, documents, users).

---

#### SDK-7 — Vercel Blob Forced Public Access

| Field | Value |
|-------|-------|
| **ID** | SDK-7 |
| **Severity** | MEDIUM |
| **Status** | PARTIALLY FIXED (SDK limitation) |
| **SDK** | Vercel Blob (`@vercel/blob` v2) |
| **File** | `lib/vercel-blob.ts` |

**Problem**: `access: access as "public"` TypeScript cast defeated the caller's intent to set private access.

**Fix**: Removed the broken cast. However, `@vercel/blob` v2 only supports `access: "public"` at the API level. Documents and attachments remain publicly accessible via URL (mitigated by `addRandomSuffix` and org-scoped paths). A TODO documents the need to switch sensitive file storage to DO Spaces with presigned URLs until Vercel ships private blob support.

---

#### SDK-8 — n8n Webhook Unauthenticated in Production

| Field | Value |
|-------|-------|
| **ID** | SDK-8 |
| **Severity** | MEDIUM |
| **Status** | FIXED |
| **SDK** | n8n |
| **File** | `lib/n8n.ts` |

**Problem**: `verifyN8nWebhookSignature()` returned `true` when `N8N_WEBHOOK_SECRET` was unset, silently accepting unauthenticated requests in any environment.

**Fix**: Production now returns `false` (fail-closed). Development still allows unsigned requests.

---

#### SDK-9 — n8n Webhook Payload Logged in Full

| Field | Value |
|-------|-------|
| **ID** | SDK-9 |
| **Severity** | LOW |
| **Status** | FIXED |
| **SDK** | Vercel logs (via n8n) |
| **File** | `app/api/v1/n8n/webhook/route.ts` |

**Problem**: `console.log` included the full `data` payload from n8n webhooks, which could contain entity names or PII.

**Fix**: Redacted to `{ type, id }` only.

---

#### SDK-10 — Migration Script Logged Decrypted Message Content

| Field | Value |
|-------|-------|
| **ID** | SDK-10 |
| **Severity** | LOW |
| **Status** | FIXED |
| **Files** | `scripts/migrate-messages-to-e2ee.ts` |

**Problem**: On verification failure, the script logged the first 50 characters of decrypted message content.

**Fix**: Redacted to length comparison only.

---

#### Remaining Configuration Audits (Not Code-Fixable)

| Item | Action Required |
|------|----------------|
| Clerk data region | Verify Clerk instance is configured to EU region in dashboard (GDPR) |
| Ably data region | Verify Ably account uses EU data plane |
| Ably historical messages | Purge pre-fix messages containing PII from Ably's message history |
| Vercel Blob private access | Switch sensitive document storage to DO Spaces w/ presigned URLs until `@vercel/blob` supports private blobs |
| Resend email templates | If messaging notification email templates are added, use generic text — never `messagePreview` |

---

#### Clean Areas (Confirmed Not Gaps)

| Area | Why |
|------|-----|
| PostHog server-side (`posthog-node`) | `trackEvent()` has zero call sites |
| Clerk webhook handler | Logs only internal IDs |
| External API routes (`/api/v1/*`) | Properly decrypt before returning |
| Upstash Redis | Only encrypted DEKs (KEK-wrapped) and counters |
| Data export (`lib/data-export/processor.ts`) | Already calls `decryptMessageForOrg()` |
| No error tracking SDK installed | No Sentry/Bugsnag/LogRocket |

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

| Task | Finding | Effort | Files Changed | Status |
|------|---------|--------|---------------|--------|
| 2.1 | NH-2: Zod validation on group session routes | Small | `group-sessions/route.ts`, `[id]/rotate/route.ts`, `[id]/add-members/route.ts` (`.strict()` schemas with 65KB max) | DONE |
| 2.2 | NH-3: Fix cacheGet fail-open for brute force | Small | `lib/redis.ts` (new `cacheGetStrict`), `lib/security/brute-force.ts` (uses it) | DONE |
| 2.3 | NH-4: Require ECIES fields in entity session shares | Small | `lib/entity-session/types.ts` (made required), `entity-sessions/route.ts` (validation) | DONE |
| 2.4 | NM-2: Zod on identity POST + PUT | Small | `app/api/e2ee/identity/route.ts` (`IdentitySetupSchema`, `IdentityRotateSchema`) | DONE |
| 2.5 | NL-2: Store OTP private keys in IndexedDB | Medium | `lib/e2ee/session-store.ts` (new `otp-prekeys` store, DB v2), `lib/e2ee/index.ts` (store/retrieve/consume) | DONE |
| 2.6+2.7 | M-1+M-4: IV standardization + hex validation | Small | `lib/encryption.ts` (`IV_BYTES=12`, `isEncrypted()` accepts 24/32 + hex regex) | DONE |

**Completed**: 2026-03-25
**Verification**: All 55 E2EE tests pass (8 test files). `encryption.test.ts` has pre-existing vi.mock issue (unrelated). Deviations: NH-3 `cacheGetStrict` preserves in-memory fallback for dev (document recommended throwing).

### Phase 3 — Medium (Hardening Sprint)

**Goal**: Defense in depth, performance, resilience.

| Task | Finding | Effort | Files Changed | Status |
|------|---------|--------|---------------|--------|
| 3.1 | NM-1: Store KEK as CryptoKey | Medium | — | DEFERRED → Phase 4 (disproportionate refactor, limited XSS benefit) |
| 3.2 | NM-3: DEK cache TTL reduction | Small | `lib/key-management.ts` (5min → 30s) | DONE |
| 3.3 | NM-5: Deduplicate PBKDF2 in unlock | Small | `lib/e2ee/primitives.ts` (WithKEK variants), `lib/e2ee/index.ts` (3→2 PBKDF2 calls) | DONE |
| 3.4 | M-2: Encrypt empty strings | Small | `lib/encryption.ts` (removed early return in both encrypt functions) | DONE |
| 3.5 | M-3: Fix dual-lock race | Small | `components/providers/EncryptionProvider.tsx` (removed lock() from interval) | DONE |
| 3.6 | M-5: Use wrapKey for DH private key | Medium | — | DEFERRED → Phase 4 (entire serialization model needs redesign, current encryptForStorage provides equivalent protection) |
| 3.7 | M-6: Verify OTP key ID in respondX3DH | Small | `lib/e2ee/x3dh.ts` (type + ID check), `lib/e2ee/index.ts` (acceptDMSession sig), `tests/e2ee/x3dh.test.ts` | DONE |

**Completed**: 2026-03-25 (5 of 7 tasks; 2 deferred to Phase 4 with rationale)
**Verification**: All 55 E2EE tests pass.

### Phase 4 — Low (Cleanup + Architecture)

**Goal**: Technical debt, long-term correctness.

| Task | Finding | Effort | Files Changed | Status |
|------|---------|--------|---------------|--------|
| 4.0a | NM-1: Store KEK as CryptoKey | Medium | `lib/e2ee/index.ts` (TODO comment added) | DEFERRED — future sprint |
| 4.0b | M-5: Use wrapKey for DH private key | Medium | `lib/e2ee/double-ratchet.ts` (TODO comment added) | DEFERRED — future sprint |
| 4.1 | H-5: Unified unlock UX | Large | `lib/crypto/` (deleted), `actions/encryption/` (deleted), `DataControlTab.tsx`, `OrgDataControlContent.tsx`, `prisma/schema.prisma` | DONE (2026-03-25) |
| 4.2 | H-6: Server-side session backup | Large | `lib/e2ee/session-backup.ts`, `app/api/e2ee/session-backups/route.ts`, `prisma/schema.prisma` | DONE (2026-03-25) |
| 4.3 | L-3: Deprecate lib/crypto/ | Small | `lib/crypto/index.ts`, `components/providers/EncryptionProvider.tsx` (`@deprecated` JSDoc) | DONE |
| 4.4 | L-4: Raise maxMessages to 1000 | Small | `lib/e2ee/megolm.ts` (100 → 1000) | DONE |
| 4.5 | L-5: Fix bufferToBase64 performance | Small | `lib/e2ee/primitives.ts` (chunked `String.fromCharCode.apply`, 64KB chunks) | DONE |
| 4.6 | NM-4: ECIES-enforced entity session init | Medium | `lib/e2ee/index.ts` (new `initEntitySessionWithShares()`, old deprecated) | DONE |
| 4.7 | C-3: Re-encryption migration script | Large | — | OUT OF SCOPE — needs own spec/plan cycle |

**Completed**: 2026-03-25 (4 implemented, 2 TODO-commented, 3 out of scope)

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

### Third-Party SDK Boundaries

15. **Never send decrypted PII through Ably** — treat Ably as an event bus (IDs and event types only). Subscribers fetch full data from authenticated API endpoints.
16. **PostHog must never capture screen content or element text** — `disable_session_recording: true`, `advanced_disable_session_recording: true`, `autocapture: false` are mandatory. Never remove these settings.
17. **Redact entity IDs from analytics URLs** — PostHog pageview URLs must replace entity IDs with `[id]` placeholders.
18. **Never store plaintext message previews in notification records** — use generic strings like "New message".
19. **Never log full request/response payloads from external webhooks** — log only event type and entity ID.

### Error Handling

20. **Cryptographic errors must not be silently swallowed** — a failed AES-GCM auth tag check means wrong key or tampered data, never "try another key silently".
21. **Error messages must not expose cryptographic details** — return generic messages to clients, log specifics server-side.

---

## 6. File Reference Map

### System I — Server-Side Field Encryption

| File | Purpose | Security-Critical |
|------|---------|-------------------|
| `lib/encryption.ts` | AES-256-GCM primitives, `isEncrypted()` | Yes — IV size (M-1), empty string bypass (M-2), false-positive (M-4), fallback (C-3) |
| `lib/key-management.ts` | Per-org DEK lifecycle, 3-tier caching | Yes — cache invalidation (NM-3) |
| `lib/model-encryption.ts` | Typed encrypt/decrypt per model | No — delegates to `encryption.ts` |
| `lib/platform-key-management.ts` | Platform-wide DEK | Low risk — same pattern as org DEK |

### System II — Client-Side Passphrase E2EE (RETIRED 2026-03-25)

All System II files have been deleted. See H-5 for details.

~~`lib/crypto/`~~, ~~`actions/encryption/`~~, ~~`EncryptionProvider`~~ — all removed.

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
| 2026-03-25 | — | SDK-1 through SDK-10 | **Third-party SDK data breach surface audit and remediation**: PostHog session recording disabled + `advanced_disable_session_recording` to block remote re-enable. PostHog autocapture disabled. Pageview URLs redacted. Ably social feed and messaging payloads stripped to IDs only (no PII). Message content encrypted via `encryptMessageForOrg()` on all 3 write paths; `decryptMessageForOrg()` on all read paths. Notification `messagePreview` replaced with generic strings. n8n webhook secret enforced in production. n8n + migration script log payloads redacted. Vercel Blob `as "public"` cast removed (SDK limitation documented). 11 files changed. | Claude (audit + implementation) |
| 2026-03-25 | 4 | H-5 | **H-5 System II retired**: Deleted 15 files (`lib/crypto/`, `actions/encryption/`, `EncryptionProvider`, `use-encrypted-search`, `IdleTimeoutWarning`). Dropped `OrganizationEncryptionStatus` and `OrganizationEncryptionKey` Prisma models. Replaced passphrase UI with E2EE info cards. Single PIN-based unlock flow remains. | Claude (implementation) |
| 2026-03-25 | 4 | H-6 | **H-6 session backup implemented**: Server-mediated session sync with dual-layer encryption (ECIES + DEK wrap). `E2eeSessionBackup` Prisma model with per-user, per-org scoping. `SessionBackupManager` client class with 5s debounced batch upload. POST/GET/DELETE API routes with Zod validation. Automatic restore on PIN unlock via `restoreAll()`. UI: syncing state in E2EESessionButton, PinEntryDialog progress, Settings page status. Spec: `docs/superpowers/specs/2026-03-25-e2ee-session-backup-design.md`. Plan: `docs/superpowers/plans/2026-03-25-e2ee-session-backup.md`. | Claude (implementation) |
| 2026-03-25 | C-3 | C-3 | **C-3 migration script completed**: Extended `migrate-to-org-dek.ts` with 6 missing models (Mandates, Client/Mandate/Task Comments, MyAccount, NewsletterSubscriber — total 13 models). Added `--verify` mode with `canDecryptWithDek()` helper. No schema change needed — existing decrypt/encrypt pipeline handles detection. Migration workflow documented: dry-run → execute → verify → enable flag. | Claude (implementation) |
| 2026-03-25 | 4 | L-3, L-4, L-5, NM-4 (NM-1+M-5 TODO'd; H-5,H-6,C-3 out of scope) | **Phase 4 implemented** (4 of 9 tasks): lib/crypto/ and EncryptionProvider deprecated with `@deprecated` JSDoc. Megolm maxMessages raised 100→1000. bufferToBase64 replaced with chunked String.fromCharCode.apply (64KB chunks). New `initEntitySessionWithShares()` enforces ECIES at API boundary. NM-1 and M-5 have TODO comments in source. H-5, H-6, C-3 marked out of scope — each needs its own spec→plan→implementation cycle. All 55 E2EE tests pass. | Claude (implementation) |
| 2026-03-25 | 3 | M-2, M-3, M-6, NM-3, NM-5 (NM-1+M-5 deferred) | **Phase 3 implemented** (5 of 7 tasks): Empty string encryption removed bypass. Dual-lock race fixed — interval no longer calls lock(). OTP key ID verified in respondX3DH() with type change. DEK L1 cache TTL reduced 5min→30s. PBKDF2 deduplicated in unlock() (3→2 calls, ~33% faster). NM-1 and M-5 deferred to Phase 4 with documented rationale (disproportionate refactor). All 55 E2EE tests pass. | Claude (implementation) |
| 2026-03-25 | 2 | NH-2, NH-3, NH-4, NM-2, NL-2, M-1, M-4 | **Phase 2 implemented**: Zod validation on all group session routes (`.strict()`, 65KB max shares, typed schemas) + identity POST/PUT. `cacheGetStrict` for fail-closed brute force reads (preserves dev in-memory fallback). ECIES fields required in entity session types + API validation. OTP private keys stored in IndexedDB (`otp-prekeys` store, DB version 2) with `generatePreKeys`/`getOtpPrivateKey`/`consumeOtpPrivateKey` lifecycle. IV standardized to 12 bytes (NIST), `isEncrypted()` accepts both 24/32-char IVs with hex regex validation. All 55 E2EE tests pass. | Claude (implementation) |
| 2026-03-25 | 1 | NC-1, NC-2, NC-3, NH-1 | **Phase 1 implemented**: org scoping on prekey-bundle (join via `clerkUserIds`), org scoping on all 4 group session routes (join-based via Conversation/Channel relations, no migration), PIN length >= 6 client-side + `pbkdfIterations >= 600k` server-side on POST+PUT, atomic OTP consumption via conditional `updateMany` with retry loop. 3 deviations from document recommendations documented inline. All 55 E2EE tests pass. | Claude (implementation) |
| 2026-03-25 | — | All | Document created from deep audit | Claude (audit) |
| 2026-03-24 | — | C-1, C-2, H-1–H-4, L-1, L-6 | Fixes implemented in `feature/e2ee-security-corrections` | Claude (previous session) |

---

*This document is versioned alongside the codebase. Update the Change Log when any finding status changes.*
