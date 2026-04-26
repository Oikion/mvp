# ADR-004: Unified Encryption Architecture

**Status:** Implemented
**Date:** 2026-03-15

---

# Unified Encryption Architecture — Design Specification

**Date:** 2026-03-15
**Status:** Approved
**Scope:** Encryption unification, E2EE entity comments, file encryption, Layer 2 retirement, audit logging

---

## 1. Overview

### Problem Statement

The current encryption system has three independent layers with overlapping responsibilities, inconsistent UX (PIN vs passphrase vs transparent), a dormant Layer 2 system that was never activated, and gaps in coverage (unencrypted feedback comments, broken entity search on encrypted fields, unencrypted file contents, missing audit trails).

### Goals

1. **Maximum protection for comments and messages** — true E2EE where Oikion cannot read content
2. **Searchable, fast PII** — server-side encryption with audit logging (Layer 1)
3. **Single unlock experience** — one PIN, one identity key, one mental model
4. **Org-level security choice** — E2EE or Standard, decided at org creation
5. **Clean cross-org interactions** — entity sharing, messaging, and matching work correctly across security boundaries
6. **Recovery system** — admin recovery codes for PIN resets without Oikion involvement
7. **File content encryption** — encrypted at rest in both modes
8. **Retire dormant code** — remove Layer 2 (passphrase/OMK system)
9. **Fix pre-existing gaps** — AgentContactSubmission encryption, FeedbackComment encryption, entity search

### Non-Goals

- E2EE for PII fields (breaks server-side search)
- SocialPostComment encryption (deferred to future Network redesign)
- Email PII minimization (separate initiative)
- Calendar sync integration
- Searchable encryption / blind indexing for PII

---

## 2. Encryption Methods

### Layer 1: Server-Side Encryption (Both Modes)

Takes plaintext and turns it into ciphertext using AES-256-GCM with per-org Data Encryption Keys (DEKs). The keys are held server-side.

1. Each org generates a unique DEK upon creation
2. Every authenticated user who accesses the org can access (decrypt) its private data
3. The org CANNOT share its key with other orgs to enable full PII entity sharing
4. Matchmaking (Bilateral Agreements and Polis) works with non-PII data (municipality, size, price)
5. Layer 1 is transparent to users — no PIN, no passphrase, no extra steps
6. Oikion holds all org DEKs — if the database is breached, the data is unreadable without the keys. However, Oikion can technically access the data during normal operation.

### E2EE: End-to-End Encryption (E2EE Mode Orgs Only)

Keys live exclusively in the user's browser — not on Oikion's servers. Even Oikion cannot read E2EE-protected data. Data is encrypted before it leaves the user's device and can only be decrypted by other authorized users on their devices.

1. E2EE is enabled per-organization by the org owner at creation time — this is a permanent security decision
2. Every user in an E2EE org sets a personal PIN (4-8 digits) during onboarding — this PIN unlocks their private encryption identity, which never leaves their browser
3. Each entity (client, property, mandate, task) acts as its own encrypted "channel." Anyone with access to the entity holds a copy of the channel's key, encrypted specifically for them
4. When a user posts a comment or sends a message, it is encrypted in their browser before reaching the server — the server only ever sees ciphertext
5. When a new team member joins or is granted access to an entity, the channel key is securely shared to them — they can read all existing comments (history is preserved)
6. When access is revoked, the channel key is rotated — the departed user can no longer decrypt future comments
7. Cross-org entity sharing works naturally for E2EE-to-E2EE orgs. If the recipient org does not use E2EE, they see entity data but not encrypted comments
8. File attachments on entities are encrypted per-file before upload — only users with entity access can decrypt the file contents
9. Org admins receive a set of single-use recovery codes (similar to MFA backup codes) — these allow the admin to reset a user's PIN without Oikion's involvement
10. If the sole admin loses both their PIN and all recovery codes, E2EE data is irrecoverable — this is the fundamental trade-off of true end-to-end encryption

### Key Difference

- **Layer 1:** "Our database is locked — only Oikion holds the master key"
- **E2EE:** "Each conversation is locked — only the participants hold the keys. Oikion cannot open the lock, even if asked."

---

## 3. System Architecture

### The Two Modes

Every organization operates in one of two encryption modes, chosen at creation and immutable:

| | Standard Mode (default) | E2EE Mode (opt-in) |
|---|---|---|
| Entity PII fields | Layer 1 + audit logging | Layer 1 + audit logging |
| Entity comments (Client, Property, Mandate, Task) | Layer 1 | E2EE (Megolm, entity-as-channel) |
| Messages (DM) | Layer 1 | E2EE (X3DH + Double Ratchet) |
| Messages (Group/Channel) | Layer 1 | E2EE (Megolm) |
| File attachments | Layer 1 | E2EE (per-file ephemeral key) |
| Feedback comments | Layer 1 (platform-wide DEK) | Layer 1 (platform-wide DEK) |
| User experience | Password only | Password + PIN (set during onboarding) |
| Data policy default | AGENCY or AGENT | AGENCY (recommended; AGENT with warning) |
| Oikion can read | Everything | Entity PII only |

### What Uses What

| Data Type | Layer 1 (Server-side) | E2EE (Client-side) | Notes |
|---|---|---|---|
| Entity PII fields (names, emails, phones, tax IDs) | Always | Never | Must remain searchable server-side |
| Entity comments (Client, Property, Mandate, Task) | Standard orgs | E2EE orgs | Org setting determines which |
| Direct messages | Standard orgs | E2EE orgs | Same PIN unlocks both comments and messages |
| Group/channel messages | Standard orgs | E2EE orgs | Same PIN unlocks both comments and messages |
| File attachments | Standard orgs | E2EE orgs | Encrypted before upload in E2EE orgs |
| Feedback comments (support tickets) | Always | Never | Oikion must be able to read support conversations |
| AgentContactSubmission | Always | Never | Public form data, server-side encryption |
| Public data (agent profiles, public listings) | Never | Never | Intentionally public — visibility controls only |

### What Gets Retired

- **Layer 2 (dormant OMK/passphrase system)** — `lib/crypto/` directory, `EncryptionProvider`, `actions/encryption/`, admin/profile data control passphrase UI
- **Per-user messaging E2EE opt-in** — replaced by org-level toggle

### What Gets Added

- Org `encryptionMode` field on `OrganizationSettings` (set at creation, immutable)
- Entity Megolm sessions — one per entity, managed like group message sessions
- Org Recovery Key (ORK) + recovery codes per E2EE org
- PIN reset flow — admin-initiated, email-based
- Audit logging — all Layer 1 PII decryption events tracked
- File content encryption — client-side before upload (E2EE), server-side (Standard)
- Platform-wide DEK for FeedbackComment encryption
- AgentContactSubmission encryption fix

---

## 4. Cryptographic Design

### Key Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│ USER LEVEL (one per user, global across all orgs)               │
│                                                                 │
│ PIN (4-8 digits) + Server Pepper (32 random bytes)              │
│   └── PBKDF2-SHA256 (100k iterations) → KEK                    │
│         └── wraps ECDH P-256 Identity Key Pair                  │
│               ├── Public key: stored server-side (visible)      │
│               └── Private key: wrapped, stored server-side      │
│                   (unwrapped only in browser with KEK)          │
└─────────────────────────────────────────────────────────────────┘
         │
         │ Identity key decrypts session shares
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ENTITY LEVEL (one Megolm session per entity)                    │
│                                                                 │
│ Entity Megolm Session Key (random 32 bytes)                     │
│   ├── Encrypts comments via Megolm ratchet                     │
│   ├── Encrypts file attachment ephemeral keys                  │
│   └── Shared to each authorized user by encrypting             │
│       with their Identity Public Key (ECDH)                     │
│                                                                 │
│ Each user holds: EntitySessionShare                             │
│   = Megolm session export encrypted for their public key        │
└─────────────────────────────────────────────────────────────────┘
         │
         │ Session key also backed up for recovery
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ORG RECOVERY LEVEL (one per E2EE org)                           │
│                                                                 │
│ Org Recovery Key (ORK) — random 32 bytes                        │
│   ├── Encrypts backup copies of ALL entity session keys         │
│   ├── Wrapped by admin's KEK (PIN-derived)                     │
│   └── Also derivable from any single Recovery Code              │
│                                                                 │
│ Recovery Codes (8 single-use, alphanumeric)                     │
│   └── Each code: PBKDF2(code, salt) → wrapping key → wraps ORK │
│       Used once → consumed → auto-regenerate when < 3 remain    │
└─────────────────────────────────────────────────────────────────┘
         │
         │ Separate from E2EE
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SERVER-SIDE ENCRYPTION (Layer 1, both org modes)                │
│                                                                 │
│ SECRETS_ENCRYPTION_KEY (env var, 32-byte master KEK)            │
│   └── wraps per-org DEK (random 32 bytes)                      │
│         └── encrypts PII fields at rest                        │
│                                                                 │
│ PLATFORM_ENCRYPTION_KEY (env var, new)                          │
│   └── encrypts FeedbackComment content                         │
│   └── encrypts AgentContactSubmission fields                   │
└─────────────────────────────────────────────────────────────────┘
```

### Entity-as-Channel Model

Each entity (Client, Property, Mandate, Task) in an E2EE org has its own Megolm session — conceptually identical to how Matrix/Element handles encrypted rooms.

**Creating an entity (E2EE org):**

1. User creates entity
2. Browser generates new Megolm outbound session (random 32-byte ratchet key)
3. Browser creates `EntitySession` record (entity type, entity ID, session ID)
4. Browser encrypts session export with creator's identity public key → `EntitySessionShare`
5. Browser encrypts session export with ORK → `EntitySessionBackup`
6. If other users have access (e.g., assigned agent), their shares are created immediately

**Posting a comment (E2EE org):**

1. Browser loads entity's Megolm session from IndexedDB (or fetches share → decrypts with identity key → caches)
2. `megolm.encrypt(plaintext)` → ciphertext + message index
3. POST ciphertext to server → stored in `[Entity]Comment.content`
4. Server publishes ciphertext to Ably channel
5. Other browsers receive ciphertext → decrypt with same Megolm session → display

**Granting access:**

1. Granting user's browser holds entity's Megolm session (must be online and PIN-unlocked)
2. Fetches recipient's identity public key
3. Encrypts session export for recipient → new `EntitySessionShare` with `startingIndex` set to current Megolm message index
4. Updates ORK backup
5. Recipient can decrypt all comments from `startingIndex` onward. Earlier comments (under prior session or before share) are not decryptable by the new user — this is intentional forward secrecy.

**Batch granting (new team member joining org):**

1. New user sets up PIN → identity key pair created
2. Admin's (or any existing member's) browser detects new user with no entity session shares
3. For each entity the new user should access (based on role/assignment): existing member encrypts current session export for new user's public key → batch upload of `EntitySessionShare` records
4. Handled as a background client-side task with progress indicator for large orgs

**Revoking access:**

1. Entity's Megolm session is rotated (new ratchet key, new `EntitySession` row with `version + 1`, previous session marked `isActive: false`)
2. New session shared to all remaining authorized users
3. New ORK backup created for new session
4. Departed user's old session copies become useless for future content

**Solo org (single user):**

- Entity creation, commenting, and file encryption all work normally — the sole user holds all session keys
- ORK backup exists as the safety net
- If the sole user forgets their PIN and has lost all recovery codes: E2EE data is irrecoverable (accepted trade-off, documented in Section 2 point 10)

### Session Rotation Triggers

| Trigger | Action |
|---|---|
| User removed from entity access | Rotate session |
| User departs org | Rotate all entity sessions they had access to |
| 100 messages on a session (Megolm default) | Rotate session |
| Admin manual rotation | Rotate session |

### DM and Group Message Keys (E2EE Orgs)

Unchanged from current implementation:

- **DMs:** X3DH key agreement → Double Ratchet (per-conversation)
- **Groups:** Megolm sessions (per-channel)

Only change: no longer opt-in per user. If org is E2EE, all messaging uses E2EE.

### PIN Reset Flow

The PIN reset is a two-phase asynchronous process:

**Phase 1 — Admin authorizes reset (admin must be online):**

1. Admin clicks "Reset PIN" for User X
2. Admin enters a recovery code (single-use, consumed after validation)
3. `PBKDF2(code, salt)` → unwraps ORK → held in admin's browser memory
4. Server generates temporary reset token → emails User X
5. Server marks User X as `pendingKeyReset: true`

**Phase 2 — User completes reset + session re-share:**

6. User X clicks email link → enters new PIN → generates new Identity Key Pair
7. Server stores new public key, increments `UserIdentityKey.keyVersion`
8. Server marks User X as `pendingKeyReset: false`, `pendingSessionReshare: true`

**Phase 3 — Session re-sharing (asynchronous):**

9. Re-share is triggered by ANY of these paths (whichever happens first):
   - **Admin still online from Phase 1:** Admin's browser still holds ORK → decrypts all entity session backups for User X's entities → re-encrypts as `EntitySessionShare` for User X's new public key → uploads. Done immediately.
   - **Admin returns later:** Admin visits dashboard → sees "User X needs session re-share" banner → enters PIN to unlock → loads ORK from admin-wrapped copy → performs re-share.
   - **Peer re-share:** Any org member who shares entities with User X visits the app → their client detects `pendingSessionReshare` flag → for each shared entity, decrypts their own session copy → re-encrypts for User X's new public key → uploads share. Only shares for entities the peer has access to — multiple peers collectively cover all entities.
10. Once all entity sessions have been re-shared, `pendingSessionReshare` cleared.

**During re-share gap:** User X can access the app but sees "Restoring access to encrypted comments..." on entities awaiting re-share. Entity PII data (Layer 1) is immediately accessible.

**Peer re-share eligibility:** Any org member with `AGENT` role or above who holds an active `EntitySessionShare` for the entity. The re-share is authorized by the server verifying that the peer is a current org member with entity access — the original admin recovery code authorization (Phase 1) is the gate that allowed the reset to proceed.

**Exclusive-access entities (no peers):** If User X was the only user with access to an entity (e.g., sole assigned agent), no peer can re-share. In this case, the ORK backup path is used: admin (or any admin-role user) loads the ORK → decrypts the `EntitySessionBackup` → creates a new `EntitySessionShare` for User X's new public key. The `pendingSessionReshare` flag is only cleared when ALL of User X's entity sessions have been re-shared — the server tracks this by comparing User X's entity access list against their `EntitySessionShare` records.

### Recovery Code Lifecycle

1. Generated at E2EE org setup — 8 codes, shown once to admin (print/save)
2. Each code: `PBKDF2(code, salt)` → wrapping key that wraps the ORK
3. On use: code hash matched via bcrypt → wrapped ORK unwrapped → code marked consumed
4. When remaining unused codes < 3: admin sees warning banner on next dashboard visit → "Your recovery codes are running low. Generate new codes now." → admin enters PIN → ORK loaded → new codes generated client-side → wrapped copies stored server-side. This is a client-side trigger, not automatic server-side generation.
5. Admin can manually "Regenerate all recovery codes" (requires PIN or existing code)
6. Old unused codes remain valid until explicitly regenerated or consumed

---

## 5. Data Flows

### Comment Lifecycle (E2EE Org)

```
User types comment
  → Browser loads EntitySession from IndexedDB
  → megolm.encrypt(plaintext) → { ciphertext, messageIndex }
  → POST /api/[entity]/[id]/comments { content: ciphertext, sessionId, messageIndex }
  → Server stores ciphertext in DB
  → Server publishes ciphertext to Ably entity channel
  → Other browsers: receive → decrypt via Megolm → display
```

### Comment Lifecycle (Standard Org)

```
User types comment
  → POST /api/[entity]/[id]/comments { content: plaintext }
  → Server: encryptMessageForOrg({ content }, orgId) → Layer 1 ciphertext
  → Server stores Layer 1 ciphertext in DB
  → Server publishes Layer 1 ciphertext to Ably (NOT plaintext — avoids Ably holding cleartext in 72hr message history)
  → Other browsers: receive ciphertext via Ably → fetch decrypted version from API (or decrypt client-side if DEK is available)
```

**Note:** Publishing Layer 1 ciphertext (not plaintext) to Ably ensures that Ably's message retention (up to 72 hours) does not hold cleartext comment content. The browser uses the Ably event as a trigger to fetch the decrypted comment from the API.

### File Attachment Lifecycle (E2EE Org)

```
Upload:
  → Browser generates ephemeral 32-byte file key
  → Browser AES-256-GCM encrypts file content with ephemeral key
  → Upload encrypted bytes to S3/Blob → receive URL
  → Browser loads EntitySession
  → megolm.encrypt(JSON.stringify({ fileKey, fileName, fileType })) → encrypted metadata
  → POST /api/documents { url, encryptedMetadata, sessionId }
  → DB stores URL (encrypted bytes) + encrypted metadata

Download:
  → Browser fetches encrypted metadata → Megolm decrypt → extract ephemeral key
  → Browser fetches encrypted bytes from URL → AES-GCM decrypt → display/download
```

### File Attachment Lifecycle (Standard Org)

```
Upload:
  → Server receives file bytes
  → Server generates ephemeral key → AES-256-GCM encrypts file → uploads to S3/Blob
  → Server encrypts ephemeral key with org DEK → stores in DB

Download:
  → Server decrypts ephemeral key with DEK → decrypts file → streams to user
```

### Notification Flow (Both Modes)

```
Comment created (either mode)
  → Server knows: WHO commented, on WHICH entity, WHEN
  → Server does NOT include comment body (E2EE: can't; Standard: chooses not to)
  → Notification: "Nikos commented on client Παπαδόπουλος"
     (commenter from Clerk, entity name from Layer 1 PII — server can decrypt)
  → In-app notification: metadata only, deep link to entity
  → Email via Resend: metadata only, deep link to entity
```

### Data Export Flow (Hybrid)

```
User requests export
  → Server exports all Layer 1 data (PII, Standard-mode comments)
  → Server returns partial export + manifest of E2EE entities needing client decryption
  → Browser (user must be PIN-unlocked):
    → Fetches E2EE comment ciphertext per entity
    → Decrypts each via EntitySession
    → Appends plaintext to export
    → Assembles final export file locally
  → Download complete (never re-uploaded to server)
```

### Audit Logging (Layer 1 PII — Both Modes)

Every server-side PII decryption event is logged:

```
{
  timestamp,
  userId,
  organizationId,
  entityType: "Client",
  entityId,
  action: "DECRYPT",      // DECRYPT | EXPORT | WEBHOOK_SEND | API_RESPONSE
  fields: ["client_name", "primary_email"],
  source: "GET /api/crm/clients/[id]",
  ipAddress
}
```

**Audited events:**
- Every server-side PII decryption (read path)
- Data exports
- External API responses containing PII
- Webhook payloads containing PII

**Not audited (can't be — E2EE):**
- E2EE comment reads (decryption in browser)
- E2EE file downloads (decryption in browser)

**Storage:** Append-only `AuditLog` table. No updates or deletes permitted.

### Entity Search (Fix)

PII search is a pre-existing issue — `entity-search.ts` uses PostgreSQL `CONTAINS` on encrypted ciphertext fields, which never matches.

**Fix:** Server loads org entities → batch decrypt with DEK → in-memory filter → return results. For orgs with >500 entities, implement paginated streaming decryption. Each decryption creates an audit log entry.

This fix is identical for both modes — PII is always Layer 1, always server-searchable after decryption.

---

## 6. Cross-Boundary Interactions

### Cross-Org Entity Sharing

**Rule:** The owning org's encryption mode determines comment visibility.

```
                          Recipient Org
                    ┌──────────┬──────────┐
                    │  E2EE    │ Standard │
         ┌──────────┼──────────┼──────────┤
Owning   │  E2EE    │ Full     │ Data     │
Org      │          │ access   │ only ⚠️  │
         ├──────────┼──────────┼──────────┤
         │ Standard │ Full     │ Full     │
         │          │ access   │ access   │
         └──────────┴──────────┴──────────┘
```

**E2EE → E2EE:**
- Sharing user's browser encrypts entity Megolm session for recipient's identity public key (sharing user must be online and PIN-unlocked at the moment of sharing)
- If sharing user is offline: server creates `SharedEntity` record immediately (entity data accessible via Layer 1), but `EntitySessionShare` for comments is created next time the sharing user's browser detects the pending share
- Recipient decrypts comments with their identity key
- Full read + write access to comments

**E2EE → Standard:**
- Entity PII data shared via Layer 1 (server re-encrypts with recipient org's DEK)
- Comments NOT shared — recipient sees: *"This entity has encrypted comments visible only to [Owning Org] members"*
- Recipient can add their own comments (Layer 1, their org is Standard)
- Owning org sees both: their E2EE comments + external Layer 1 comments

**Standard → E2EE:**
- Server decrypts with owning org's DEK, serves to recipient
- Recipient's E2EE org status does not upgrade the owning org's data

**Standard → Standard:**
- Server decrypts with owning org's DEK, serves to recipient
- Current behavior + audit logging

### Cross-Org Messaging

**Rule:** Org mode determines encryption. Mixed-mode DMs fall back to Layer 1.

| Sender Org | Recipient Org | Encryption |
|---|---|---|
| E2EE | E2EE | X3DH + Double Ratchet (full E2EE) |
| E2EE | Standard | Layer 1 (recipient has no identity key) |
| Standard | E2EE | Layer 1 |
| Standard | Standard | Layer 1 |

- UI indicator distinguishes security level: locked icon (E2EE) vs shielded icon (Layer 1)
- E2EE org user's client detects recipient has no public key → sends via Layer 1 path

**Group/Channel messages** follow the owning org's mode.

### Cross-Org Matching (Polis)

**No changes.** Matching uses non-PII entity fields (transaction type, property type, municipality, size, price, bedrooms). These are Layer 1 in both modes. Match results store IDs + scores only, never PII or comments. Privacy filter at read time controls visibility (anonymized → agency-identified → full).

### Webhook & External API Payloads

**Entity PII (both modes):** Server decrypts PII, includes in payload, creates audit log entry.

**Entity comments (E2EE orgs):** Webhook events (`comment.created`, `comment.deleted`) include metadata only (entity ID, commenter, timestamp). Comment body never included. External API comment endpoints return ciphertext or `403` with `e2ee_encrypted` flag.

**Entity comments (Standard orgs):** Webhook events include decrypted comment body. Audit log entry for each.

---

## 7. Data Ownership & Agent Departure

### E2EE + Data Policy Interaction

E2EE orgs default to AGENCY mode. AGENT mode is permitted with a warning.

**AGENCY mode (recommended for E2EE):**

- Entity records stay with org
- Entity comments (E2EE) stay with org
- File attachments (E2EE) stay with org
- `assigned_to` fields set to NULL
- All entity sessions the departed user had access to are rotated

**AGENT mode (with warning):**

- Entity records (Layer 1 PII): server decrypts with org DEK → re-encrypts with personal workspace DEK → migrates
- Entity comments (E2EE): **stay with org** — server cannot decrypt
- File attachments (E2EE): **stay with org** — server holds only ciphertext
- Agent's personal workspace receives clean entity records without organizational discussion history
- All entity sessions rotated (same as AGENCY)

**Admin warning when enabling AGENT mode on E2EE org:**

> "Your organization uses End-to-End Encryption. With Agent-owned data policy, departing agents will receive their entity records (client details, property data) but NOT encrypted comments or file contents. These remain with the organization. Only entity record fields will migrate to the agent's personal workspace."

---

## 8. Migration & Cleanup

### Existing Comment Migration (Layer 1 → E2EE)

Applies only to orgs that enable E2EE with pre-existing Layer 1 comments. Expected to be low-volume (most existing comments are demo data).

**Progressive migration (default):**

1. User opens entity in E2EE org
2. Browser checks: does this entity have an `EntitySession`?
3. If no → migration triggered:
   - Browser fetches all comments (server decrypts Layer 1, returns plaintext)
   - Browser generates new Megolm session
   - Browser encrypts each comment with Megolm → sends batch to server
   - Server replaces Layer 1 ciphertext with E2EE ciphertext
   - Server creates EntitySession + shares + backup
   - Server deletes Layer 1 versions
4. Entity is now fully E2EE

**Admin bulk migration (optional):**

- Admin opens Encryption Settings → "Migrate existing data"
- Admin must be PIN-unlocked
- Browser iterates all org entities, performs progressive migration
- Progress bar, can be interrupted and resumed
- Tracks completion via `EntitySession` existence

**Migration window security note:** During migration, the server decrypts Layer 1 comments and transmits plaintext to the browser over HTTPS. This is a one-time transitional exposure per entity — the same trust level as normal Layer 1 read operations. For orgs with many entities, this means the server processes potentially thousands of comments in plaintext during the migration window. The system is NOT end-to-end encrypted during migration. Admins should be advised to use the bulk migration path during off-hours for large orgs. After migration completes for an entity, the server never sees that entity's comment plaintext again.

### Layer 2 Retirement

**Files to remove:**

| Path | Purpose | Replacement |
|---|---|---|
| `lib/crypto/constants.ts` | E2EE prefix constants | Reuse or inline in unified system |
| `lib/crypto/key-derivation.ts` | Passphrase → KEK | PIN-based derivation in `lib/e2ee/primitives.ts` |
| `lib/crypto/key-wrapping.ts` | OMK wrap/unwrap | Identity key wrap/unwrap in `lib/e2ee/` |
| `lib/crypto/encryption.ts` | Field encrypt/decrypt | Megolm handles field encryption |
| `lib/crypto/field-handlers.ts` | Per-model client-side handlers | Entity-as-channel replaces |
| `lib/crypto/index.ts` | Barrel export | Remove |
| `components/providers/EncryptionProvider.tsx` | Passphrase context | `E2EEProvider` handles everything |
| `hooks/use-encrypted-search.ts` | Client-side search | PII stays Layer 1 (server-searchable) |
| `actions/encryption/*.ts` | Passphrase setup, grant, revoke | Replaced by org toggle + PIN + EntitySessionShare |

**Prisma models to remove:**

| Model | Replacement |
|---|---|
| `OrganizationEncryptionStatus` | `encryptionMode` field on `OrganizationSettings` |
| `OrganizationEncryptionKey` (per-user wrapped OMK) | `EntitySessionShare` + identity key system |

**UI to remove/replace:**

| Component | Replacement |
|---|---|
| Admin Data Control passphrase section | E2EE org settings (mode indicator, recovery codes, PIN reset) |
| Profile Data Control passphrase section | Removed — PIN unlock is global via header button |
| Layer 2 `IdleTimeoutWarning` / `IdleTimeoutBanner` | Keep only E2EE idle timeout (already exists) |

### Pre-Existing Fixes

**1. AgentContactSubmission encryption (bug fix):**

Call existing `encryptAgentContactForOrg()` / `decryptAgentContactForOrg()` in the contact form API route. Functions exist in `lib/model-encryption.ts`, just not called.

**2. FeedbackComment encryption (new):**

New `PLATFORM_ENCRYPTION_KEY` env var → platform-wide DEK. New `encryptFeedbackForPlatform()` / `decryptFeedbackForPlatform()` in `model-encryption.ts`. Wire into feedback comment API routes.

**3. Entity search fix:**

Replace `Prisma WHERE field CONTAINS query` (broken on ciphertext) with: server batch decrypts entities → in-memory filter → return results. Paginated streaming for large datasets. Audit log each decryption.

---

## 9. New & Modified Prisma Models

### Modified Existing Models

```prisma
// OrganizationSettings — add encryptionMode field
// encryptionMode  EncryptionMode  @default(STANDARD)
// Immutability enforced at application layer: middleware guard rejects
// any update to encryptionMode after org creation.

enum EncryptionMode {
  STANDARD    // Layer 1 only
  E2EE        // Full end-to-end encryption
}

// UserIdentityKey — add pendingSessionReshare flag
// pendingSessionReshare  Boolean  @default(false)
// Set to true during PIN reset flow, cleared when all entity sessions re-shared.

// Comment tables — add E2EE metadata columns (nullable for Standard orgs)
// ClientComment:       add entitySessionId String?   messageIndex Int?
// PropertyComment:     add entitySessionId String?   messageIndex Int?
// MandateComment:      add entitySessionId String?   messageIndex Int?
// crm_Accounts_Tasks_Comments: add entitySessionId String?   messageIndex Int?
//
// entitySessionId references EntitySession.megolmSessionId (the Megolm session identifier)
// messageIndex is the Megolm ratchet index for this comment (needed for decryption)
// Both null for Standard org comments (Layer 1 encryption, no Megolm session)
```

### New Models

```prisma
model EntitySession {
  id               String   @id @default(uuid())
  entityType       String   // "CONTACT" | "PROPERTY" | "REQUEST" | "TASK"
  entityId         String
  megolmSessionId  String   @unique  // Megolm session identifier (distinct from row id)
  version          Int      @default(1)
  isActive         Boolean  @default(true)  // false after rotation
  createdAt        DateTime @default(now())
  rotatedAt        DateTime?
  orgId            String

  shares           EntitySessionShare[]
  backups          EntitySessionBackup[]

  @@unique([entityType, entityId, version])
  @@index([entityType, entityId, isActive])  // Fast lookup for active session
  @@index([orgId])

  // No FK to entity tables (polymorphic). Cleanup handled by application-layer
  // cascade: when an entity is deleted, a cleanup job deletes all EntitySession
  // rows matching (entityType, entityId). This is wired into the existing
  // delete API routes for each entity type.
}

model EntitySessionShare {
  id                String   @id @default(uuid())
  entitySessionId   String   // FK to EntitySession.id (NOT megolmSessionId)
  userId            String
  encryptedSession  String   // Megolm export encrypted for user's identity public key
  startingIndex     Int      @default(0)  // Megolm messageIndex at time of share
  createdAt         DateTime @default(now())

  entitySession     EntitySession @relation(fields: [entitySessionId], references: [id], onDelete: Cascade)

  @@unique([entitySessionId, userId])
  @@index([userId])
}

model EntitySessionBackup {
  id                String   @id @default(uuid())
  entitySessionId   String   @unique  // FK to EntitySession.id
  encryptedSession  String   // Megolm export encrypted with ORK
  createdAt         DateTime @default(now())

  entitySession     EntitySession @relation(fields: [entitySessionId], references: [id], onDelete: Cascade)

  // Retention: backups for ALL session versions are kept (not just active).
  // When an entity has versions 1, 2, 3 — all three backups exist.
  // During admin recovery or data export, the admin traverses all versions
  // (ordered by EntitySession.version ASC) to decrypt the full comment history.
  // Each comment's entitySessionId identifies which session version encrypted it.
}

model OrgRecoveryKey {
  id              String   @id @default(uuid())
  orgId           String   @unique
  wrappedOrk      String   // ORK encrypted with admin's PIN-derived KEK
  wrappedByUserId String   // Admin userId who holds the KEK-wrapped copy
  salt            String   // Salt used for admin's KEK derivation of ORK wrap
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  codes           RecoveryCode[]

  // When admin changes PIN: wrappedOrk is re-wrapped with new KEK.
  // Admin role transfer protocol: when admin role transfers to a new user,
  // the outgoing admin (while still PIN-unlocked) unwraps the ORK with their
  // KEK, re-wraps with the new admin's KEK (derived from new admin's PIN),
  // and updates wrappedOrk + wrappedByUserId. If outgoing admin is unavailable,
  // a recovery code can be used to unwrap the ORK and re-wrap for the new admin.
}

model RecoveryCode {
  id            String    @id @default(uuid())
  recoveryKeyId String
  codeHash      String    // bcrypt hash (code shown once to admin)
  wrappedOrk    String    // ORK encrypted with PBKDF2(code, salt)
  salt          String
  used          Boolean   @default(false)
  usedAt        DateTime?
  createdAt     DateTime  @default(now())

  recoveryKey   OrgRecoveryKey @relation(fields: [recoveryKeyId], references: [id], onDelete: Cascade)

  @@index([recoveryKeyId])
}

model PiiAccessLog {
  id             String   @id @default(uuid())
  timestamp      DateTime @default(now())
  userId         String
  organizationId String
  entityType     String
  entityId       String
  action         String   // DECRYPT | EXPORT | WEBHOOK_SEND | API_RESPONSE
  fields         String[]
  source         String   // Route or action path
  ipAddress      String?

  @@index([organizationId, timestamp])
  @@index([userId, timestamp])
  @@index([entityType, entityId])

  // Append-only: application layer enforces no UPDATE or DELETE.
  // Renamed from AuditLog to avoid confusion with existing AdminAuditLog.
}
```

### IndexedDB Session Store Changes

The existing `oikion-e2ee` IndexedDB database stores sessions keyed by `targetId`. To prevent namespace collisions between channel sessions and entity sessions, use prefixed keys:

- Channel Megolm sessions: `channel:<channelId>` (existing, rename from bare ID)
- Entity Megolm sessions: `entity:<entityType>:<entityId>` (new)
- DM Ratchet sessions: `dm:<conversationId>` (existing, rename from bare ID)

The `useE2EE` hook gains new methods: `encryptEntityComment(entityType, entityId, plaintext)` and `decryptEntityComment(entityType, entityId, ciphertext, messageIndex)`.

### Idle Timeout Policy

The unified PIN unlock uses a single idle timeout (5 minutes, matching current messaging E2EE behavior). The timeout is global — it applies to both messaging and entity comment decryption. Activity on any E2EE surface (viewing messages, viewing entity comments, typing) resets the timer. When locked, the user sees a lock icon in the header and must re-enter their PIN to access any E2EE content.

### Bulk Import Considerations

When importing entities in bulk (e.g., CSV import of 500 clients) in an E2EE org:

- **Lazy session initialization:** Entity Megolm sessions are NOT created during import. Import creates entity records (Layer 1 PII encryption handled server-side as normal). The `EntitySession` is created on first access — when a user opens the entity or posts the first comment.
- This avoids the performance problem of generating thousands of Megolm sessions + shares + backups during a single import operation.
- The trade-off: imported entities have no E2EE session until first accessed. Since they also have no comments at import time, this is acceptable — there's nothing to encrypt yet.

### PLATFORM_ENCRYPTION_KEY Rotation

The `PLATFORM_ENCRYPTION_KEY` for FeedbackComment and AgentContactSubmission follows the same pattern as `SECRETS_ENCRYPTION_KEY`: the env var is the master KEK, and a versioned platform DEK is stored in a new `PlatformEncryptionKey` table (same structure as `OrgEncryptionKey` but without orgId). Rotation generates a new version; old versions remain for decrypting historical data. Re-encryption of existing data is a background migration, same as org DEK rotation.

---

## 10. Deferred / Out of Scope

| Item | Reason | When |
|---|---|---|
| SocialPostComment encryption | Network/Feed is a cross-org LinkedIn-like system needing its own design | Future Network redesign |
| Email PII minimization | 20+ templates need audit, separate initiative | Separate conversation |
| Blind indexing for PII search | Layer 1 + audit logging is sufficient; blind indexing adds complexity for marginal gain | If compliance requires |
| Calendar sync E2EE | No calendar sync integration exists yet | When calendar sync is built |
| TaskComment E2EE activation | Task system not user-accessible currently | Include schema/model work now; activate when Tasks launches |

**Note on TaskComment:** The Prisma model, session management, and encryption infrastructure will be built alongside Client/Property/Mandate comments. The UI wiring is deferred until the Tasks system becomes user-accessible, but the crypto foundation will be ready.

---

## 11. Implementation Priorities

### Phase 1: Foundation
- `EncryptionMode` enum + org settings field (with immutability guard)
- `EntitySession`, `EntitySessionShare`, `EntitySessionBackup` models
- `OrgRecoveryKey`, `RecoveryCode` models
- `PiiAccessLog` model
- Platform-wide DEK setup (`PLATFORM_ENCRYPTION_KEY` + `PlatformEncryptionKey` table)
- Org creation flow updated with encryption mode choice
- Comment table schema additions (`entitySessionId`, `messageIndex` nullable columns)

### Phase 2: Entity-as-Channel
- Entity Megolm session creation on entity create
- Session sharing on access grant
- Session rotation on access revocation
- Comment encrypt/decrypt paths for E2EE orgs
- IndexedDB session storage (extend existing `oikion-e2ee` database)

### Phase 3: Unified Unlock
- Merge per-user messaging E2EE opt-in into org-level toggle
- Single PIN unlock for comments + messages
- Layer 2 retirement (remove all dormant code)
- E2EE onboarding flow for E2EE org users

### Phase 4: File Encryption + Fixes
- Client-side file encryption (E2EE orgs)
- Server-side file encryption (Standard orgs)
- AgentContactSubmission encryption fix
- FeedbackComment encryption
- Entity search fix

### Phase 5: Recovery + Audit
- ORK generation and recovery code system
- PIN reset flow (admin-initiated, email-based)
- Audit logging on all Layer 1 decryption paths
- Hybrid data export flow

### Phase 6: Cross-Boundary Polish
- Cross-org sharing with E2EE session distribution
- Mixed-mode DM fallback (E2EE ↔ Standard)
- Comment migration (progressive + bulk)
- AGENT mode departure handling for E2EE orgs
