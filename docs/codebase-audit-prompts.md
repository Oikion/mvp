# Oikion Codebase Audit — Domain Prompts

> **Purpose**: Each section below is a standalone prompt to paste into a fresh Claude Code conversation.
> Run all 15 domains in parallel across separate conversations for maximum throughput.
> Each prompt orchestrates a multi-agent review with a dual-reviewer cross-feed pattern.

---

## Overview

**Codebase**: `/Users/stapo/Desktop/Oikion/MVP`
**Stack**: Next.js 16 / React 19 / TypeScript / Prisma / PostgreSQL / Clerk / Ably / Vercel
**Scale**: 254 API route files · 61 Prisma models · 180+ server actions · 48 SWR hooks

**Priority order** (do security-critical domains first):
1. Auth, RBAC & Middleware
2. E2EE & Encryption Architecture
3. Core Entity Trio (Contacts + Requests + Properties)
4. Matchmaking Engine
5. Deal Pipeline
6. Messaging & Real-time
7. Documents, Templates & Entity Linking
8. Calendar & Google Sync
9. Import / Export / Archive
10. Organization Admin & Settings
11. Network, Social & Cross-Org
12. Notifications & Activity Feed
13. Public Surface: Website, Portals & XE.gr
14. Dashboard & Reports
15. Platform Admin & Observability

---

## How Each Session Works

Every prompt below follows this 4-phase orchestration:

```
Phase 1 — Explore      : 2–3 parallel Explorer subagents read all relevant files
Phase 2 — Review R1    : 2 parallel Reviewer subagents independently analyze the domain
Phase 3 — Cross-Review : Each reviewer critiques the OTHER's output (labeled "GPT Codex")
Phase 4 — Synthesize   : Orchestrator merges all 4 outputs into a final prioritized report
```

**The GPT Codex trick**: In Phase 3, each Critic agent is told the input it is critiquing was produced by "GPT Codex". This creates adversarial pressure that reliably surfaces gaps and disagreements that a straight "review the review" prompt would miss.

**Output format for every session**: A single Markdown report with:
- `## Critical` — bugs / security gaps that must be fixed before production
- `## High` — correctness issues, data integrity risks, auth gaps
- `## Medium` — performance issues, N+1 queries, missing indexes
- `## Low` — UX gaps, missing loading/error states, i18n issues, dead code
- `## Positive Findings` — patterns that are done well and should be preserved

---

## Domain 1 — Auth, RBAC & Middleware

```
You are the orchestrator for a deep security and correctness audit of the Auth, RBAC & Middleware
domain of the Oikion MVP codebase at /Users/stapo/Desktop/Oikion/MVP.

This domain is the security foundation of the entire platform. Your goal is to find bugs, security
gaps, misconfigurations, and optimization opportunities across every layer.

=== PROJECT CONTEXT ===
- Next.js 16 / TypeScript / Clerk v6 / Prisma / PostgreSQL
- Middleware file is proxy.ts (NOT middleware.ts)
- Role hierarchy: ORG_OWNER > ADMIN > AGENT > VIEWER
- Internal routes use Clerk session auth; /api/v1/* use API key auth with scopes
- Platform admin requires isPlatformAdmin: true in Clerk privateMetadata
- All tenant DB queries MUST filter by organizationId — never accept it from client
- auth() is async in Clerk v6 — always await auth()

=== SCOPE ===
Files to analyze:
- proxy.ts (root middleware)
- lib/api-auth.ts
- lib/internal-api-auth.ts
- lib/permissions/ (entire directory)
- lib/org-admin.ts
- lib/personal-workspace-guard.ts
- lib/query-guards.ts
- lib/app-access.ts
- lib/rate-limit.ts
- lib/clerk.ts
- lib/clerk-sync.ts
- lib/create-safe-action.ts
- lib/get-current-user.ts
- app/api/auth/ (entire directory)
- app/api/staging-access/ (entire directory)
- app/api/app-access/ (entire directory)
- app/api/v1/ (entire directory — external API key auth)
- app/api/webhooks/ (entire directory — Clerk webhook)
- actions/CLAUDE.md
- lib/permissions/CLAUDE.md

=== PHASE 1 — PARALLEL EXPLORATION (dispatch simultaneously) ===

Spawn 3 Explorer subagents in parallel:

Explorer A: Read proxy.ts, lib/api-auth.ts, lib/internal-api-auth.ts, lib/rate-limit.ts,
lib/clerk.ts, lib/clerk-sync.ts, lib/get-current-user.ts, lib/app-access.ts.
Report: What auth mechanisms are implemented? Where are the gaps? What is checked in middleware
vs. per-route? Are there routes that bypass middleware?

Explorer B: Read the entire lib/permissions/ directory, lib/org-admin.ts,
lib/personal-workspace-guard.ts, lib/query-guards.ts, lib/create-safe-action.ts.
Report: How is RBAC enforced? Are permission checks consistent? Are there roles that can escalate
privileges? Does query-guards.ts actually protect all queries?

Explorer C: Read app/api/v1/ (all files), app/api/auth/ (all files),
app/api/webhooks/ (all files), app/api/staging-access/, app/api/app-access/.
Report: What scopes does the external API support? Is API key validation consistent across all
/api/v1/* routes? Are webhook signatures verified before processing?

Wait for all 3 Explorers to complete.

=== PHASE 2 — INDEPENDENT REVIEW ROUND 1 (dispatch simultaneously) ===

Using the Explorer findings as context, spawn 2 Reviewer subagents in parallel.
Give BOTH reviewers the full file list from the scope above and the Explorer outputs.

Reviewer A: Conduct a security-focused review. Focus on:
- Authentication bypass vectors in proxy.ts
- Missing auth guards in API routes (especially /api/v1/*)
- Privilege escalation paths through role hierarchy
- Timing side-channels in token comparison
- API key scope enforcement gaps
- Webhook signature verification completeness
- organizationId leakage from client parameters
- Race conditions in session/auth state

Reviewer B: Conduct a correctness and architecture review. Focus on:
- Inconsistencies between middleware-level auth and route-level auth
- Dead permission checks (rules defined but never enforced)
- Missing rate limiting on sensitive endpoints
- Clerk v6 async auth() usage — any forgotten await?
- Edge cases in personal workspace guard
- Token expiry and refresh handling
- Clerk webhook event handling completeness (all relevant events handled?)
- RBAC gaps between ORG_OWNER, ADMIN, AGENT, VIEWER

Collect both outputs in full.

=== PHASE 3 — CROSS-REVIEW ROUND 2 (dispatch simultaneously) ===

Spawn 2 Critic subagents in parallel:

Critic A: You are reviewing a security analysis produced by GPT Codex for the Oikion auth/RBAC
layer. The Codex output is provided below. Your job is to:
1. Identify everything Codex missed or got wrong
2. Correct any factual errors about the codebase
3. Add your own independent findings that Codex did not surface
4. Rate each Codex finding as: confirmed / partially correct / incorrect
[Insert Reviewer B's full output here as "GPT Codex output"]

Critic B: You are reviewing a security analysis produced by GPT Codex for the Oikion auth/RBAC
layer. The Codex output is provided below. Your job is to:
1. Identify everything Codex missed or got wrong
2. Correct any factual errors about the codebase
3. Add your own independent findings that Codex did not surface
4. Rate each Codex finding as: confirmed / partially correct / incorrect
[Insert Reviewer A's full output here as "GPT Codex output"]

Wait for both Critics to complete.

=== PHASE 4 — SYNTHESIS ===

Merge all outputs (Explorer A/B/C, Reviewer A/B, Critic A/B) into a single Markdown report.
Deduplicate. Resolve disagreements by reading the actual file. Prioritize by severity:
Critical > High > Medium > Low > Positive Findings.
For every issue: include file path, line range if known, description, and recommended fix.
```

---

## Domain 2 — E2EE & Encryption Architecture

```
You are the orchestrator for a deep correctness and security audit of the End-to-End Encryption
and server-side encryption architecture of the Oikion MVP codebase at
/Users/stapo/Desktop/Oikion/MVP.

This domain has the highest blast radius of any in the codebase. A bug here can silently corrupt
or expose all user data. Be maximally thorough.

=== PROJECT CONTEXT ===
- Two encryption layers: (1) server-side AES-256-GCM field encryption on PII fields;
  (2) E2EE using Megolm (Matrix Double Ratchet) for messaging and entity comments
- Per-org DEK (Data Encryption Key) wrapped by a platform KEK
- Encrypted format: iv:auth:ct (colon-separated hex) for server-side; e2ee:v1:<base64> for E2EE
- isEncrypted() guard prevents double-encryption — functions must be idempotent
- PiiAccessLog is append-only audit of all PII decryption events
- lib/prisma.ts uses NAMED export { prismadb } — not default export
- Encryption mode is immutable per org (STANDARD vs E2EE) — enforced by encryption-mode-guard.ts

=== SCOPE ===
Files to analyze:
- lib/crypto.ts
- lib/encryption.ts
- lib/model-encryption.ts
- lib/key-management.ts
- lib/platform-key-management.ts
- lib/e2ee/ (entire directory)
- lib/encryption-mode-guard.ts
- lib/pii-access-log.ts
- lib/entity-session/ (entire directory)
- app/api/e2ee/ (entire directory)
- components/e2ee/ (entire directory)
- components/encryption/ (entire directory)
- hooks/useE2EE.ts (if it exists, else hooks/use-e2ee.ts)
- actions/encryption/ (entire directory)
- prisma/schema.prisma (models: UserIdentityKey, UserE2eePepper, UserPreKey, EntitySession,
  EntitySessionShare, EntitySessionBackup, E2eeSessionBackup, OrgEncryptionKey,
  PlatformEncryptionKey, OrgRecoveryKey, RecoveryCode, DirectSession, GroupSession,
  GroupSessionShare)

=== PHASE 1 — PARALLEL EXPLORATION ===

Spawn 3 Explorer subagents in parallel:

Explorer A: Read lib/crypto.ts, lib/encryption.ts, lib/model-encryption.ts,
lib/encryption-mode-guard.ts. Report: What primitives are used? What are the encrypted field
lists? Is there any use of deprecated algorithms? Is IV generation secure (random per operation)?
Is the isEncrypted() guard reliable? Any double-encryption risk?

Explorer B: Read lib/key-management.ts, lib/platform-key-management.ts, lib/e2ee/ (all files),
lib/entity-session/ (all files). Report: How is the DEK/KEK hierarchy structured? How are keys
rotated? How are E2EE session keys established and stored? What happens if a key is lost?
Are recovery codes single-use? Are prekey bundles replenished?

Explorer C: Read app/api/e2ee/ (all files), lib/pii-access-log.ts, the E2EE-related Prisma
models from schema.prisma, and components/e2ee/ (all files). Report: What E2EE API endpoints
exist? Is PII decryption always logged? Are there any endpoints that return decrypted data
without logging? What does the UI expose about encryption state?

=== PHASE 2 — INDEPENDENT REVIEW ROUND 1 ===

Spawn 2 Reviewer subagents in parallel with full scope access:

Reviewer A: Security-cryptography focus:
- IV reuse risk (AES-GCM is catastrophically broken if IV repeats with same key)
- Key derivation strength (PBKDF2 iteration count, Argon2 parameters)
- Timing side-channels in key comparison
- Missing PII access log entries for any decryption pathway
- Unsafe key storage patterns (keys in logs, error messages, responses)
- Recovery code entropy and single-use enforcement
- Prekey bundle exhaustion handling
- Forward secrecy guarantee verification
- E2EE session revocation completeness

Reviewer B: Correctness and integration focus:
- isEncrypted() guard correctness — any field that could slip through unencrypted
- Missing encryption on fields that should be encrypted (compare against model-encryption.ts lists)
- Encryption mode enforcement — can STANDARD org access E2EE endpoints?
- Prisma transaction atomicity around key creation
- Race conditions in key establishment (two devices simultaneously initializing)
- UI correctly reflecting encryption state?
- Data export / GDPR deletion compatibility with encrypted fields
- What happens to encrypted data if org DEK is lost?

=== PHASE 3 — CROSS-REVIEW ROUND 2 ===

Spawn 2 Critic subagents in parallel:

Critic A: You are reviewing a cryptography and E2EE analysis produced by GPT Codex for the
Oikion encryption layer. The Codex output is below. Identify what Codex missed or got wrong,
correct factual errors, add your own findings, and rate each finding as confirmed / partially
correct / incorrect.
[Insert Reviewer B's full output here]

Critic B: You are reviewing a cryptography and E2EE analysis produced by GPT Codex for the
Oikion encryption layer. The Codex output is below. Identify what Codex missed or got wrong,
correct factual errors, add your own findings, and rate each finding as confirmed / partially
correct / incorrect.
[Insert Reviewer A's full output here]

=== PHASE 4 — SYNTHESIS ===

Merge all outputs into a single Markdown report: Critical > High > Medium > Low > Positive.
For every issue: file path, description, cryptographic impact, recommended fix.
Flag any finding where the two Round 1 reviewers disagreed — these are highest priority to verify.
```

---

## Domain 3 — Core Entity Trio: Contacts, Requests & Properties

```
You are the orchestrator for a deep audit of the three core business entities of the Oikion MVP:
Contacts (formerly Clients), Requests (formerly Mandates), and Properties. These are the
most-used modules in the application. Find bugs, data integrity risks, performance issues,
and UX gaps.

=== PROJECT CONTEXT ===
- Entity Architecture v2.0: Clients→Contacts, Mandates→Requests (migration complete)
- Legacy app/api/crm/clients/ routes still exist — do NOT fix or extend them, they are dead code
- All queries MUST filter by organizationId
- Field-level encryption: Contact PII fields are encrypted server-side (AES-256-GCM)
- Contacts use cursor-based pagination; SWR hooks at hooks/swr/
- NewClientWizard and NewPropertyWizard use key={currentStep} to force React remount on step change
- z.coerce.number() converts "" → 0; explicit onChange handlers needed for optional numeric fields
- Visibility system: ItemVisibility enum HIDDEN | PRIVATE | SECURE | PUBLIC
- Soft delete via archive; hard delete only via explicit purge

=== SCOPE ===
Files to analyze:
- app/api/crm/ (all files — mark legacy routes clearly)
- app/api/requests/ (all files)
- app/api/mls/ (all files)
- app/api/mls/properties/ (all files including draft/)
- actions/contacts/ (all files)
- actions/requests/ (all files)
- actions/mls/ (all files)
- actions/crm/ (all files — mark legacy)
- lib/validations/contacts.ts (or crm.ts / requests.ts)
- lib/validations/status-transitions.ts
- lib/model-encryption.ts (contact/property/request field lists)
- lib/requests/field-mapper.ts
- app/[locale]/app/(routes)/crm/ (all component files)
- app/[locale]/app/(routes)/requests/ (all component files)
- app/[locale]/app/(routes)/mls/ (all component files)
- components/matchmaking/ (for how match cards link to entities)
- hooks/swr/ (useContacts, useContact, useContactsPaginated, useProperties,
  usePropertiesPaginated, useRequests, useRequest, useClients, useClientsPaginated)
- prisma/schema.prisma (models: Contact, Properties, Request, ContactProperty,
  RequestContact, PropertyRequestMatch, ContactRelationship)

=== PHASE 1 — PARALLEL EXPLORATION ===

Spawn 3 Explorer subagents in parallel:

Explorer A: Read all app/api/crm/, app/api/requests/, app/api/mls/ files.
Report: What CRUD operations exist per entity? Are auth guards consistent? Is organizationId
always sourced from server auth (never client body)? Which routes are legacy (clients)?
Are there any routes that skip encryption on write?

Explorer B: Read all actions/contacts/, actions/requests/, actions/mls/ files and
lib/validations/ files. Report: Are Zod schemas strict? Do server actions always call
requireAction()? Are there missing validations on update paths? Is the visibility enum
correctly validated? Are numeric fields safe from z.coerce.number() coercion bugs?

Explorer C: Read the frontend files: all components in the CRM, requests, and MLS route groups;
all relevant SWR hooks; the wizard components. Report: Do forms handle all error states?
Are SWR keys invalidated after mutations? Do wizards handle step validation correctly?
Are there any missing loading skeletons? Are there Greek translation strings missing?

=== PHASE 2 — INDEPENDENT REVIEW ROUND 1 ===

Spawn 2 Reviewer subagents in parallel:

Reviewer A: Data integrity and security focus:
- Missing organizationId filters in any query path
- Insecure direct object reference (IDOR) risks — can user access another org's entity?
- Fields written to DB without encryption when they should be encrypted
- Missing Zod .strict() allowing unexpected field injection
- Visibility downgrade not cleaning up CrossOrgMatch rows atomically
- Status transition validation — can entity skip states illegally?
- Cascade delete safety — what happens when Contact is deleted?
- Import path creating entities that bypass encryption

Reviewer B: Performance and UX focus:
- N+1 query patterns in entity list fetches (missing Prisma include batching)
- Missing indexes for common filter patterns (status + organizationId, etc.)
- SWR cache not invalidated after create/update/delete mutations
- Wizard form steps: any fields losing value on step navigation?
- Missing error boundaries in entity detail pages
- Pagination: any list that fetches all records without pagination?
- Missing optimistic updates causing jarring UX
- Missing skeleton loaders for entity detail sections

=== PHASE 3 — CROSS-REVIEW ROUND 2 ===

Spawn 2 Critic subagents in parallel:

Critic A: You are reviewing a code analysis of the Oikion Contacts/Requests/Properties domain
produced by GPT Codex. The Codex output is below. Identify what Codex missed or got wrong,
correct factual errors about this codebase, add your own findings, and rate each Codex finding
as confirmed / partially correct / incorrect.
[Insert Reviewer B's full output here]

Critic B: You are reviewing a code analysis of the Oikion Contacts/Requests/Properties domain
produced by GPT Codex. The Codex output is below. Identify what Codex missed or got wrong,
correct factual errors about this codebase, add your own findings, and rate each Codex finding
as confirmed / partially correct / incorrect.
[Insert Reviewer A's full output here]

=== PHASE 4 — SYNTHESIS ===

Merge all outputs. Distinguish between legacy (clients) and current (contacts) issues.
Format: Critical > High > Medium > Low > Positive Findings.
Include file path, line range where possible, and recommended fix for every issue.
```

---

## Domain 4 — Matchmaking Engine

```
You are the orchestrator for a deep audit of the Matchmaking Engine of the Oikion MVP codebase
at /Users/stapo/Desktop/Oikion/MVP. This is the core algorithmic module that matches Properties
with Requests (buyer/renter needs). Find algorithm bugs, scoring errors, data integrity issues,
and performance problems.

=== PROJECT CONTEXT ===
- Matches Properties against Requests using a weighted scoring calculator
- Score components: price fit, location overlap, size fit, amenity match, condition/energy class,
  timeline, financing type
- Disqualifier logic separates hard-fail conditions from score reduction
- Intra-org matching (same agency) and cross-org matching (Polis network) are separate paths
- CrossOrgMatch rows must be deleted atomically when visibility is downgraded to HIDDEN/PRIVATE
- OrgMatchWeights stores per-org weight calibration; WeightCalibrationReport tracks history
- Cron job recalibrates weights periodically
- Timeline enum values MUST match exactly between types.ts, calculator.ts, and Prisma schema
  (prior bug: mismatched Timeline values caused <25% scores)
- Null score rows from import can pollute score distribution analytics — must be excluded
- RequestForMatching includes amenity_inference, condition/energy class fields

=== SCOPE ===
Files to analyze:
- lib/matchmaking/ (entire directory)
- lib/matchmaking-constants.ts
- actions/matchmaking/ (all files)
- app/api/matchmaking/ (all files)
- app/api/cron/ (files related to: weight calibration, cross-org matching)
- app/[locale]/app/(routes)/matchmaking/ (all files)
- components/matchmaking/ (all files)
- hooks/swr/ (usePropertyMatches, useRequestMatches, useMatchAnalytics, etc.)
- prisma/schema.prisma (models: PropertyRequestMatch, OrgMatchWeights,
  WeightCalibrationReport, CrossOrgMatch, RequestForMatching if separate)

=== PHASE 1 — PARALLEL EXPLORATION ===

Spawn 3 Explorer subagents in parallel:

Explorer A: Read lib/matchmaking/ (all files) and lib/matchmaking-constants.ts.
Report: What is the exact scoring formula? What are the disqualifiers? How is each score
component calculated? What weight defaults exist? What enum values does the calculator use
for Timeline, FinancingType, PropertyCondition, EnergyClass?

Explorer B: Read actions/matchmaking/ (all files), app/api/matchmaking/, app/api/cron/
(matchmaking-related files), prisma/schema.prisma (matchmaking models).
Report: How are match records created and stored? How does the cron recalibration work?
Are scores ever stale? How are null/missing scores handled? Is cross-org match deletion
done atomically with visibility changes?

Explorer C: Read app/[locale]/app/(routes)/matchmaking/, components/matchmaking/,
relevant SWR hooks. Report: How are match results displayed? Is score breakdown shown?
Are null scores excluded from analytics? What UX happens when there are no matches?
Are there missing loading states?

=== PHASE 2 — INDEPENDENT REVIEW ROUND 1 ===

Spawn 2 Reviewer subagents in parallel:

Reviewer A: Algorithm correctness focus:
- Enum value mismatches between types.ts, calculator.ts, and Prisma schema (known bug class)
- Score normalization: can any component produce a value outside [0, 1]?
- Disqualifier logic: are there cases where a disqualified match still gets scored?
- Weight calibration: can weights sum to more than 1.0? Negative weights possible?
- Null score handling: do analytics exclude null rows?
- Linear taper formulas: off-by-one or division-by-zero edge cases?
- Amenity inference: what happens when property has no amenity data?
- Cross-org match: is the score symmetric (A matches B ↔ B matches A)?

Reviewer B: Data integrity and performance focus:
- Are match scores ever cached without expiry (stale results)?
- N+1 queries in match list fetching
- Missing indexes on PropertyRequestMatch (organizationId, score, status)
- Atomic visibility downgrade → CrossOrgMatch deletion (is this transactional?)
- What happens if cron recalibration job fails midway? Is state left corrupted?
- Can two concurrent requests create duplicate match rows?
- Are deleted/archived entities excluded from matching?
- Performance: how does matching scale with large property/request counts?

=== PHASE 3 — CROSS-REVIEW ROUND 2 ===

Spawn 2 Critic subagents in parallel:

Critic A: You are reviewing a matchmaking algorithm analysis produced by GPT Codex for the
Oikion platform. The Codex output is below. Identify what Codex missed or got wrong, correct
factual errors, add your own findings, and rate each Codex finding as confirmed / partially
correct / incorrect.
[Insert Reviewer B's full output here]

Critic B: You are reviewing a matchmaking algorithm analysis produced by GPT Codex for the
Oikion platform. The Codex output is below. Identify what Codex missed or got wrong, correct
factual errors, add your own findings, and rate each Codex finding as confirmed / partially
correct / incorrect.
[Insert Reviewer A's full output here]

=== PHASE 4 — SYNTHESIS ===

Merge all outputs. Flag any enum mismatch findings as Critical.
Format: Critical > High > Medium > Low > Positive Findings.
Include file path, specific enum value, formula, or line range for every issue.
```

---

## Domain 5 — Deal Pipeline

```
You are the orchestrator for a deep audit of the Deal Pipeline module of the Oikion MVP
codebase at /Users/stapo/Desktop/Oikion/MVP. This is the newest major module (Phase 3,
implemented 2026-04-07) and has the highest probability of undetected bugs.

=== PROJECT CONTEXT ===
- 10-stage Greek real estate pipeline:
  INTEREST → OFFER → NEGOTIATION → PRELIMINARY_AGREEMENT → DUE_DILIGENCE →
  TRANSFER_TAX → SIGNING → REGISTRATION → COMPLETED + FALLEN_THROUGH
- DealParty is a many-to-many join table (Deal ↔ Contact with role field)
- DealStageLog is an append-only audit of all stage transitions
- PropertyShowing enhanced as part of Phase 3 with ShowingAttendee join table
- Soft delete only; no hard delete for Deal or DealStageLog
- 11-action permission pattern (deal-specific permissions)
- The Phase 3 migration file was NOT yet applied as of 2026-04-07 — verify current state

=== SCOPE ===
Files to analyze:
- app/api/deals/ (all files)
- actions/deals/ (all files including index.ts)
- lib/deals/ (all files)
- app/[locale]/app/(routes)/deals/ (all files)
- components/ (any deal-related components)
- hooks/swr/ (useDeals, useDeal, getDealKey, getDealsKey)
- prisma/schema.prisma (models: Deal, DealParty, DealStageLog, PropertyShowing,
  ShowingAttendee)
- prisma/migrations/ (find the Phase 3 migration file — check if it was applied)

=== PHASE 1 — PARALLEL EXPLORATION ===

Spawn 3 Explorer subagents in parallel:

Explorer A: Read app/api/deals/ (all files) and actions/deals/ (all files).
Report: What CRUD operations exist? Are all 10 pipeline stages handled? Is stage transition
validation enforced server-side? Can a deal jump from INTEREST to COMPLETED directly?
Is organizationId always server-sourced? Are DealParty roles validated against an enum?

Explorer B: Read prisma/schema.prisma (Deal, DealParty, DealStageLog, PropertyShowing,
ShowingAttendee models) and prisma/migrations/ (find Phase 3 migration file, report its
content and whether it appears to have been applied based on the migration table or lock file).
Report: Schema correctness, missing indexes, cascade delete settings, nullable fields that
should be required, any migration state issues.

Explorer C: Read app/[locale]/app/(routes)/deals/ (all files), relevant SWR hooks,
lib/deals/ if it exists. Report: Does the UI enforce stage transition rules? Is the full
10-stage pipeline rendered? Are DealParty roles correctly displayed? Are there missing
loading/error states? Is the audit log (DealStageLog) surfaced to users?

=== PHASE 2 — INDEPENDENT REVIEW ROUND 1 ===

Spawn 2 Reviewer subagents in parallel:

Reviewer A: Business logic and correctness focus:
- Stage transition validation: is it enforced in API and actions, or only UI?
- Can FALLEN_THROUGH be re-opened? What states allow transitions to what?
- DealParty: can the same Contact be added twice with different roles? Is this valid?
- DealStageLog: is every stage change recorded? Are any transitions logged?
- PropertyShowing ↔ Deal linkage: is it enforced that a showing belongs to the deal's property?
- Permission enforcement: do the 11 deal permissions match what the API actually enforces?
- organizationId isolation: can a user see deals from another org?
- Are archived/deleted contacts correctly handled in DealParty?

Reviewer B: Data integrity and UX focus:
- Missing database indexes (Deal by status+organizationId, DealStageLog by dealId+timestamp)
- N+1 queries when fetching deal lists with parties and stage history
- SWR cache invalidation after stage transitions
- Missing optimistic UI for stage changes
- What happens if a deal's property is archived or deleted?
- Are monetary amounts (offer price, final price) stored as Decimal? Integer overflow risk?
- Missing skeleton loaders in deal detail view
- Are all deal stage names translated to Greek?

=== PHASE 3 — CROSS-REVIEW ROUND 2 ===

Spawn 2 Critic subagents in parallel:

Critic A: You are reviewing a code analysis of the Oikion Deal Pipeline module produced by
GPT Codex. The Codex output is below. Identify what Codex missed or got wrong, correct
factual errors, add your own findings, and rate each Codex finding as confirmed / partially
correct / incorrect.
[Insert Reviewer B's full output here]

Critic B: You are reviewing a code analysis of the Oikion Deal Pipeline module produced by
GPT Codex. The Codex output is below. Identify what Codex missed or got wrong, correct
factual errors, add your own findings, and rate each Codex finding as confirmed / partially
correct / incorrect.
[Insert Reviewer A's full output here]

=== PHASE 4 — SYNTHESIS ===

Start the report with a Migration Status section: is the Phase 3 migration applied or not?
Then: Critical > High > Medium > Low > Positive Findings.
Include file path, line range, and fix recommendation for every issue.
```

---

## Domain 6 — Messaging & Real-time

```
You are the orchestrator for a deep audit of the Messaging and Real-time module of the Oikion
MVP codebase at /Users/stapo/Desktop/Oikion/MVP. Real-time state bugs are the hardest class
of defect to detect — be maximally thorough.

=== PROJECT CONTEXT ===
- Real-time transport: Ably (WebSocket channels + presence)
- Two messaging contexts: (1) Team channels (Channel model); (2) Direct/group conversations
  (Conversation model)
- E2EE messaging: DirectSession + GroupSession using Megolm
- Message types: text, attachment, mention, reaction, read receipt
- Presence system: UserPresence model + PresenceProvider context
- Typing indicators: TypingIndicator model (short TTL, Ably pub/sub)
- Email inbox integration: EmailInboxConfig (IMAP/SMTP for email channels)
- Ably tokens are lazy-loaded and auto-refreshed on expiry

=== SCOPE ===
Files to analyze:
- app/api/messaging/ (all files)
- actions/messaging/ (all files)
- lib/messaging.ts
- lib/messaging-utils.ts
- lib/messaging-errors.ts
- lib/ably.ts
- hooks/useAbly.ts
- hooks/useE2EE.ts (if exists)
- components/social/ (messaging-related components)
- app/[locale]/app/(routes)/network/messages/ (all files)
- hooks/swr/ (useMessaging, useCreateChannel, useStartDM, useUnreadMessageCount)
- prisma/schema.prisma (models: Channel, ChannelMember, Conversation,
  ConversationParticipant, ConversationOrgMembership, Message, MessageReaction,
  MessageRead, MessageAttachment, MessageMention, TypingIndicator, UserPresence,
  DirectSession, GroupSession, GroupSessionShare, EmailInboxConfig)

=== PHASE 1 — PARALLEL EXPLORATION ===

Spawn 3 Explorer subagents in parallel:

Explorer A: Read app/api/messaging/ (all files) and actions/messaging/ (all files).
Report: What messaging API endpoints exist? Is auth enforced on every endpoint?
Is channel membership verified before message delivery? Are there rate limits on
message send? How is message deletion handled? Are attachments size-limited?

Explorer B: Read lib/ably.ts, hooks/useAbly.ts, lib/messaging.ts, lib/messaging-utils.ts,
lib/messaging-errors.ts. Report: How is the Ably token generated and refreshed?
What happens when the token expires mid-session? How are Ably channel names constructed
(any collision risk between orgs)? Are Ably errors handled gracefully?

Explorer C: Read the Prisma models for messaging from schema.prisma, the Conversation/Channel
UI components, and the SWR messaging hooks. Report: Schema completeness (missing indexes,
cascade settings), how unread counts are calculated (DB query vs. in-memory?), how read
receipts are tracked, any obvious race conditions in message ordering.

=== PHASE 2 — INDEPENDENT REVIEW ROUND 1 ===

Spawn 2 Reviewer subagents in parallel:

Reviewer A: Security and real-time correctness focus:
- Cross-org message leakage: can a user read messages from a channel in another org?
- Ably channel name construction: is organizationId always included to prevent cross-org access?
- Missing auth in any messaging endpoint
- Message ordering guarantees: are messages ordered by server timestamp or client timestamp?
- Race condition: two users send simultaneously — any duplicate or lost message risk?
- Typing indicator TTL: what prevents stale indicators from staying visible forever?
- E2EE session establishment race: two devices initialize at the same time?
- Email inbox IMAP credentials storage: are they encrypted at rest?

Reviewer B: Performance and UX focus:
- Unread count calculation: N+1 query risk across many conversations?
- Missing Ably channel cleanup when user leaves a conversation
- SWR cache for messages: is it invalidated on incoming Ably event?
- Infinite scroll for message history: any missing cursor or off-by-one in pagination?
- Missing loading states in message thread view
- Optimistic message sending: is the message shown before server confirms?
- What happens if Ably connection drops? Is there a reconnection + replay mechanism?
- Attachment upload: is progress shown? What is the size limit enforced?

=== PHASE 3 — CROSS-REVIEW ROUND 2 ===

Spawn 2 Critic subagents in parallel:

Critic A: You are reviewing a messaging and real-time analysis produced by GPT Codex for
the Oikion platform. The Codex output is below. Identify what Codex missed or got wrong,
correct factual errors, add your own findings, and rate each Codex finding as confirmed /
partially correct / incorrect.
[Insert Reviewer B's full output here]

Critic B: You are reviewing a messaging and real-time analysis produced by GPT Codex for
the Oikion platform. The Codex output is below. Identify what Codex missed or got wrong,
correct factual errors, add your own findings, and rate each Codex finding as confirmed /
partially correct / incorrect.
[Insert Reviewer A's full output here]

=== PHASE 4 — SYNTHESIS ===

Merge all outputs. Flag any cross-org leakage finding as Critical.
Format: Critical > High > Medium > Low > Positive Findings.
```

---

## Domain 7 — Documents, Templates & Entity Linking

```
You are the orchestrator for a deep audit of the Documents, Templates, and Entity Linking
module of the Oikion MVP codebase at /Users/stapo/Desktop/Oikion/MVP.

=== PROJECT CONTEXT ===
- TipTap rich text editor for document editing
- Entity linking: M2M relationships between Documents and Contact/Property/Request/Deal
- Mention parsing: @mentions in documents parsed, replaced with user links
- Document sharing: SharedEntity model, bilateral access with org permission checks
- Document templates: OrgDocumentTemplate with auto-fill from entity data
- E2EE compatibility: documents in E2EE orgs may have encrypted content
- Soft delete only for documents

=== SCOPE ===
Files to analyze:
- app/api/documents/ (all files)
- app/api/templates/ (all files)
- app/api/share/ (all files)
- actions/documents/ (all files)
- actions/templates/ (all files)
- actions/sharing/ (all files)
- lib/documents/ (all files)
- lib/templates/ (all files)
- lib/sharing/ (all files)
- lib/parse-mentions.ts
- lib/documents/parse-mentions.ts (if separate)
- components/documents/ (all files)
- components/linking/ (all files)
- components/shared/ (all files)
- app/[locale]/app/(routes)/documents/ (all files)
- hooks/swr/ (useDocuments, useDocumentLinked, useDocumentTemplates)
- prisma/schema.prisma (models: Documents, DocumentTemplate, OrgDocumentTemplate,
  SharedEntity)

=== PHASE 1 — PARALLEL EXPLORATION ===

Spawn 3 Explorer subagents in parallel:

Explorer A: Read app/api/documents/, app/api/share/, actions/documents/, actions/sharing/.
Report: What document CRUD operations exist? Is ownership verified before edit/delete?
How is shared access validated? Can a user access a document shared with them after
sharing is revoked? Is org isolation enforced on all document endpoints?

Explorer B: Read lib/parse-mentions.ts, lib/documents/, lib/templates/, lib/sharing/,
app/api/templates/, actions/templates/. Report: How does mention parsing work?
Any XSS risk in mention replacement? How does template auto-fill source entity data?
Can template auto-fill leak data from other orgs? Are template Zod schemas strict?

Explorer C: Read components/documents/, components/linking/, app/[locale]/app/(routes)/documents/,
relevant SWR hooks, prisma models. Report: How is the TipTap editor integrated?
Are document saves debounced? Is there autosave? What happens to linked entities when
a document is deleted? Are there missing loading states in the document editor?

=== PHASE 2 — INDEPENDENT REVIEW ROUND 1 ===

Spawn 2 Reviewer subagents in parallel:

Reviewer A: Security and data integrity focus:
- IDOR: can user request a document by ID without ownership/sharing verification?
- Mention parsing: XSS injection through crafted @mention values?
- SharedEntity: is org membership verified when accepting a shared document?
- Template auto-fill: can a template pull data from another org's entity?
- Document deletion: are entity links cleaned up atomically?
- E2EE compatibility: any document content stored/transmitted unencrypted in E2EE orgs?

Reviewer B: Performance and UX focus:
- Autosave: is there debouncing? What happens on network failure during save?
- N+1 queries when loading document with all linked entities
- Missing skeleton in document editor load
- Linked entity display: what shows if the linked entity was deleted?
- Template rendering: any server-side rendering issues with TipTap content?
- Large document performance: any content size limits enforced?

=== PHASE 3 — CROSS-REVIEW ROUND 2 ===

Critic A: GPT Codex produced the following analysis of Oikion's Documents module. Identify
gaps, correct errors, add findings, and rate each: confirmed / partially correct / incorrect.
[Insert Reviewer B's output]

Critic B: GPT Codex produced the following analysis of Oikion's Documents module. Identify
gaps, correct errors, add findings, and rate each: confirmed / partially correct / incorrect.
[Insert Reviewer A's output]

=== PHASE 4 — SYNTHESIS ===
Critical > High > Medium > Low > Positive. File path + fix for every finding.
```

---

## Domain 8 — Calendar & Google Sync

```
You are the orchestrator for a deep audit of the Calendar and Google Calendar Sync module
of the Oikion MVP codebase at /Users/stapo/Desktop/Oikion/MVP.

=== PROJECT CONTEXT ===
- Two-way sync with Google Calendar via OAuth + push webhooks
- CalendarEvent model stores events; CalendarReminder for reminders
- ShowingAttendee links PropertyShowing to Contacts (Phase 3 addition)
- Google Calendar OAuth tokens stored per user; refresh handled automatically
- Push notifications from Google delivered to /api/webhooks/google-calendar
- Cron jobs handle: reminder delivery, polling-based sync fallback
- CalendarEvent ↔ Contact and ↔ User (agent) via join tables

=== SCOPE ===
Files to analyze:
- app/api/calendar/ (all files)
- app/api/auth/google-calendar/ (all files)
- app/api/webhooks/google-calendar/ (all files)
- app/api/cron/ (reminder and calendar sync cron files)
- actions/calendar/ (all files)
- lib/google-calendar/ (all files)
- lib/calendar-permissions.ts
- lib/calendar-reminders.ts
- app/[locale]/app/(routes)/calendar/ (all files)
- components/calendar/ (all files)
- hooks/swr/ (useCalendarEvents, useCalendarEvent, useCalendarConnection,
  useEventInvitations, useInvitedEvents, usePendingInvitationCount, useEventMutations)
- prisma/schema.prisma (models: CalendarEvent, CalendarReminder,
  CalendarEventContact, CalendarEventAgent)

=== PHASE 1 — PARALLEL EXPLORATION ===

Spawn 3 Explorer subagents in parallel:

Explorer A: Read lib/google-calendar/ (all files), app/api/auth/google-calendar/,
app/api/webhooks/google-calendar/. Report: How is OAuth token stored and refreshed?
Is the refresh token encrypted at rest? Is the Google webhook push notification
signature verified? How are sync conflicts resolved (Google vs. local edit simultaneously)?

Explorer B: Read app/api/calendar/ (all files), actions/calendar/ (all files),
app/api/cron/ (calendar/reminder files), lib/calendar-permissions.ts,
lib/calendar-reminders.ts. Report: What permissions guard calendar operations?
How are reminders delivered? Is the cron fallback handling duplicate delivery?
Can a user create events for another org?

Explorer C: Read app/[locale]/app/(routes)/calendar/, components/calendar/, SWR hooks.
Report: How is the calendar rendered? Are invitations handled in UI?
What happens when Google sync fails? Are pending invitation counts shown correctly?
Missing loading/error states?

=== PHASE 2 — INDEPENDENT REVIEW ROUND 1 ===

Spawn 2 Reviewer subagents in parallel:

Reviewer A: Security and correctness focus:
- OAuth token security: is the refresh token encrypted, rotated on revocation?
- Webhook push verification: Google webhook headers validated before processing?
- Sync conflict resolution: who wins on simultaneous edit (Google vs. local)?
- IDOR: can user modify another org's calendar event by ID?
- Reminder delivery: is there deduplication to prevent double reminders?
- Invitation: can user invite contacts from another org (cross-org leak)?

Reviewer B: Reliability and UX focus:
- What happens when Google API rate-limits or returns 5xx?
- Cron sync and webhook push: can both fire simultaneously and create duplicate events?
- Missing retry logic for failed reminder delivery
- Calendar view: are events in correct timezone (Greek timezone handling)?
- SWR cache invalidated after Google sync completes?
- Expired OAuth tokens: is the user prompted to reconnect gracefully?

=== PHASE 3 — CROSS-REVIEW ROUND 2 ===

Critic A: GPT Codex produced the following analysis of Oikion's Calendar module. Identify
gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer B's output]

Critic B: GPT Codex produced the following analysis of Oikion's Calendar module. Identify
gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer A's output]

=== PHASE 4 — SYNTHESIS ===
Critical > High > Medium > Low > Positive. File path + fix for every finding.
```

---

## Domain 9 — Import, Export & Archive

```
You are the orchestrator for a deep audit of the Import, Export, and Archive modules of the
Oikion MVP codebase at /Users/stapo/Desktop/Oikion/MVP.

=== PROJECT CONTEXT ===
- Unified Import Engine: all import goes through /app/import/add (never per-entity routes)
- Three-layer validation: client validation → API validation → engine validation
- Import supports Contact, Property, Request entities with field mapping and deduplication
- Export: multi-format (CSV, Excel, JSON); GDPR data export separate from bulk export
- Archive: soft delete with restore and purge; linked entity counts must be shown before purge
- ImportHistory and ExportHistory models track all operations
- GDPR: DataExportRequest and DataDeletionRequest are formal request flows
- Enum normalizer maps legacy values (e.g., "hidden"→"HIDDEN", "personal"→"PRIVATE")

=== SCOPE ===
Files to analyze:
- app/api/import/ (all files)
- app/api/export/ (all files)
- app/api/archive/ (all files)
- actions/archive/ (all files)
- lib/import/ (entire directory)
- lib/export/ (entire directory)
- lib/data-export/ (entire directory)
- app/[locale]/app/(routes)/import/ (all files)
- app/[locale]/app/(routes)/archive/ (all files)
- components/import/ (all files)
- components/export/ (all files)
- prisma/schema.prisma (models: ImportHistory, ExportHistory,
  DataExportRequest, DataDeletionRequest)

=== PHASE 1 — PARALLEL EXPLORATION ===

Spawn 3 Explorer subagents in parallel:

Explorer A: Read lib/import/ (all files). Report: How does field mapping work?
How is deduplication implemented? Does the engine validate each row before committing
or does it batch-commit? What happens if a row fails mid-import — is it rolled back?
How are enum values normalized? What is the validation cascade?

Explorer B: Read app/api/import/, app/api/export/, app/api/archive/, actions/archive/,
lib/export/, lib/data-export/. Report: Are all import/export/archive endpoints auth-guarded?
Is organizationId always server-sourced? How does GDPR export work — is all PII included?
Is encrypted data decrypted before export or exported encrypted? Is purge protected by
a confirmation step server-side (not just UI)?

Explorer C: Read components/import/, app/[locale]/app/(routes)/import/,
app/[locale]/app/(routes)/archive/, relevant hooks. Report: Import wizard UX:
what validation feedback is shown per row? Is progress shown during large imports?
Archive UX: are linked counts shown before purge? What happens on partial import failure?

=== PHASE 2 — INDEPENDENT REVIEW ROUND 1 ===

Spawn 2 Reviewer subagents in parallel:

Reviewer A: Data integrity and security focus:
- Can import create entities with another org's organizationId?
- Does deduplication check happen before or after validation? (ordering matters)
- Is the import engine transactional — can a partial import leave DB in inconsistent state?
- GDPR export: does it include all encrypted fields, decrypted? Is the export download link
  expiring and single-use?
- Purge: is there a server-side confirmation requirement or just UI guard?
- Enum normalizer: any missing mappings that could cause import to silently drop values?
- File upload: is file type and size validated server-side (not just client-side)?

Reviewer B: Performance and UX focus:
- Large import (10,000 rows): is it streamed or all loaded into memory?
- Missing progress indicator for long-running imports
- ImportHistory: are failed row details stored for user to download error report?
- Archive list pagination: fetching all archived entities at once for large orgs?
- Export file generation: synchronous (blocks request) or async with download link?
- Missing skeleton in archive page
- Are import errors surfaced per-row with the original row data shown?

=== PHASE 3 — CROSS-REVIEW ROUND 2 ===

Critic A: GPT Codex produced the following analysis of Oikion's Import/Export/Archive.
Identify gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer B's output]

Critic B: GPT Codex produced the following analysis of Oikion's Import/Export/Archive.
Identify gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer A's output]

=== PHASE 4 — SYNTHESIS ===
Critical > High > Medium > Low > Positive. File path + fix for every finding.
```

---

## Domain 10 — Organization Admin & Settings

```
You are the orchestrator for a deep audit of the Organization Admin and Settings modules of
the Oikion MVP codebase at /Users/stapo/Desktop/Oikion/MVP. This includes module activation,
RBAC role management, data ownership policy, billing, and all user/org settings.

=== PROJECT CONTEXT ===
- Role hierarchy: ORG_OWNER > ADMIN > AGENT > VIEWER
- Data ownership modes: AGENCY (data stays with org on departure) vs AGENT (data migrates)
- Ownership mode change is prospective-only: policyHistory JSON tracks era tuples {mode, from, to}
- User departure flow: lib/user-departure/ handles data migration on offboarding
- Billing via Stripe: OrgSubscription, plan gates via lib/billing/plan-access.ts
- Module activation: OrganizationFeature model, toggled by org admin
- Personal workspace: Clerk org with publicMetadata.type === "personal"
- Users model has NO organizationId — use Clerk membership list for org-scoped user queries

=== SCOPE ===
Files to analyze:
- app/api/admin/ (all files)
- app/api/org/ (all files)
- app/api/billing/ (all files)
- app/api/my-account/ (all files)
- app/api/settings/ (all files)
- app/api/organization/ (all files)
- actions/admin/ (all files)
- actions/organization/ (all files)
- lib/billing/ (all files)
- lib/stripe.ts
- lib/data-ownership/ (all files)
- lib/user-departure/ (all files)
- lib/billing/plan-access.ts
- app/[locale]/app/(routes)/admin/ (all files)
- app/[locale]/app/(routes)/settings/ (all files)
- app/[locale]/app/(routes)/organization/ (all files)
- components/settings/ (all files)
- components/data-ownership/ (all files)
- prisma/schema.prisma (models: OrganizationSettings, OrganizationSettingsAudit,
  OrganizationFeature, UserModuleAccess, RoleModuleAccess, OrgSubscription,
  OrgMemberConsent, DepartureLog, OrganizationRolePermission, MyAccount)

=== PHASE 1 — PARALLEL EXPLORATION ===

Spawn 3 Explorer subagents in parallel:

Explorer A: Read app/api/admin/, app/api/org/, actions/admin/, actions/organization/.
Report: What admin operations are available? Is platform admin vs. org admin distinction
enforced? Can an AGENT call org admin endpoints? Is Clerk membership always used for
org-scoped user queries (never querying Users table by organizationId)?

Explorer B: Read lib/billing/, lib/stripe.ts, lib/data-ownership/, lib/user-departure/.
Report: How are plan gates enforced? Is Stripe webhook handling idempotent (duplicate
events)? How does data ownership mode change work? Is it truly prospective-only?
What is the complete user departure flow — what data is migrated, what stays?

Explorer C: Read app/[locale]/app/(routes)/admin/, app/[locale]/app/(routes)/settings/,
components/settings/, components/data-ownership/, Prisma admin/settings models.
Report: What settings are available to which roles? Is the data ownership UI clear?
Are there settings changes that take effect immediately vs. at next login?
Missing confirmation dialogs for destructive settings?

=== PHASE 2 — INDEPENDENT REVIEW ROUND 1 ===

Spawn 2 Reviewer subagents in parallel:

Reviewer A: Security and correctness focus:
- Privilege escalation: can AGENT role call ADMIN endpoints?
- Stripe webhook: is signature verified? Are events idempotent (no double billing)?
- Data ownership: is the prospective-only constraint enforced server-side?
- Departure flow: can departure be triggered for ORG_OWNER (should be blocked)?
- Module deactivation: what happens to data when a module is deactivated?
- Personal workspace guard: can settings in personal workspace affect org workspace?
- Role permission changes: are active sessions invalidated when role is downgraded?

Reviewer B: Data integrity and UX focus:
- Missing audit trail for settings changes (OrganizationSettingsAudit completeness)
- Stripe subscription status cached — what if it's stale when checking plan gates?
- Departure migration: what happens if it fails midway? Is it transactional?
- N+1 queries in admin user list (fetching Clerk membership per user)
- Settings UI: missing success/error feedback on save
- Billing portal: is the Stripe portal URL single-use and short-expiry?
- Module toggle: any race condition if two admins toggle simultaneously?

=== PHASE 3 — CROSS-REVIEW ROUND 2 ===

Critic A: GPT Codex produced the following analysis of Oikion's Organization Admin/Settings.
Identify gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer B's output]

Critic B: GPT Codex produced the following analysis of Oikion's Organization Admin/Settings.
Identify gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer A's output]

=== PHASE 4 — SYNTHESIS ===
Critical > High > Medium > Low > Positive. File path + fix for every finding.
```

---

## Domain 11 — Network, Social & Cross-Org

```
You are the orchestrator for a deep audit of the Network, Social, and Cross-Org modules of
the Oikion MVP codebase at /Users/stapo/Desktop/Oikion/MVP.

=== PROJECT CONTEXT ===
- Agent network: AgentProfile, AgentConnection (bidirectional connection requests)
- Social feed: SocialPost, SocialPostComment, SocialPostLike (internal social network)
- Cross-org matchmaking: CrossOrgMatch stores matches between orgs' Properties and Requests
- Sharing hub: agents can share Properties and Requests with connected agents across orgs
- OrgNetworkSettings controls whether the org participates in the network
- CrossOrgMatch rows must be deleted when visibility is downgraded (HIDDEN/PRIVATE)
- External social media logging: SocialPostLog (n8n-triggered)

=== SCOPE ===
Files to analyze:
- app/api/agent/ (all files)
- app/api/agency-profile/ (all files)
- app/api/connections/ (all files)
- app/api/profile/ (all files)
- actions/network/ (all files)
- actions/social/ (all files)
- actions/social-feed/ (all files)
- app/[locale]/app/(routes)/network/ (all files)
- components/social/ (all files)
- hooks/swr/ (useConnections, useSendConnectionRequest, useRespondToConnection,
  useRemoveConnection)
- prisma/schema.prisma (models: AgentProfile, AgentConnection, SocialPost,
  SocialPostComment, SocialPostLike, CrossOrgMatch, OrgNetworkSettings,
  OrgNetworkPartner, SocialPostLog)

=== PHASE 1 — PARALLEL EXPLORATION ===

Spawn 3 Explorer subagents in parallel:

Explorer A: Read app/api/connections/, app/api/agent/, actions/network/.
Report: How are connection requests validated? Can a user accept a request sent to
someone else? Is the connection state machine correct (PENDING → ACCEPTED / REJECTED)?
Can a user see another org's agent profile without a connection?

Explorer B: Read actions/social-feed/, actions/social/, app/api/profile/.
Report: Can a user see posts from orgs they are not connected to?
Are likes/comments from deleted accounts handled gracefully?
Is content moderation enforced? Any XSS risk in post content?

Explorer C: Read app/[locale]/app/(routes)/network/, components/social/, Prisma models.
Report: How is the social feed paginated? Is CrossOrgMatch deletion wired to
visibility changes? What UI shows when network feature is disabled for the org?
Missing loading states in feed or profile?

=== PHASE 2 — INDEPENDENT REVIEW ROUND 1 ===

Spawn 2 Reviewer subagents in parallel:

Reviewer A: Security and privacy focus:
- Can user view agent profiles from orgs they have no relationship with?
- IDOR in connection accept/reject: can user manipulate another user's connections?
- Cross-org match visibility: is CrossOrgMatch deletion atomic with visibility downgrade?
- Social post privacy: are posts visible outside the network?
- XSS in post/comment content: is rich text sanitized before storage and rendering?
- Network settings: can org opt out and still have their data in CrossOrgMatch?

Reviewer B: Data integrity and UX focus:
- Bidirectional connection: is it stored as one row or two? Consistency risk?
- Social feed: N+1 queries when loading posts with authors and like counts?
- Missing pagination on social feed (infinite scroll implemented?)
- Soft-deleted agent profile: are their posts/connections handled gracefully?
- Missing loading states in discovery pages
- Connection status caching: can it be stale (showing "Connect" when already connected)?

=== PHASE 3 — CROSS-REVIEW ROUND 2 ===

Critic A: GPT Codex produced the following analysis of Oikion's Network/Social module.
Identify gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer B's output]

Critic B: GPT Codex produced the following analysis of Oikion's Network/Social module.
Identify gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer A's output]

=== PHASE 4 — SYNTHESIS ===
Critical > High > Medium > Low > Positive. File path + fix for every finding.
```

---

## Domain 12 — Notifications & Activity Feed

```
You are the orchestrator for a deep audit of the Notifications and Activity Feed modules of
the Oikion MVP codebase at /Users/stapo/Desktop/Oikion/MVP.

=== PROJECT CONTEXT ===
- Multi-channel delivery: in-app (Notification model), email (Resend), push (Ably)
- NotificationDeliveryLog tracks delivery per channel per notification
- Activity model: unified audit log for all entity mutations
- EntityChangeLog: immutable per-entity audit (CREATED, UPDATED, LINKED, ARCHIVED, STAGE_CHANGED)
- Mention notifications: @mentions in documents and comments trigger notifications
- 40+ notification categories (contact created, deal stage changed, comment added, etc.)
- Ably used for real-time push delivery of in-app notifications

=== SCOPE ===
Files to analyze:
- app/api/notifications/ (all files)
- actions/notifications/ (all files)
- actions/feed/ (all files)
- actions/activities/ (all files)
- lib/notifications/ (all files including notification-service.ts, email-service.ts)
- lib/activity-logger.ts
- lib/entity-change-log.ts
- lib/notify-watchers.ts
- lib/parse-mentions.ts (mention → notification path)
- lib/new-user-notify.ts
- lib/admin-notify.ts
- components/notifications/ (all files)
- hooks/swr/ (useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead,
  useNotificationCounts, useInfiniteNotifications, useArchiveCounts)
- prisma/schema.prisma (models: Notification, NotificationDeliveryLog,
  Activity, EntityChangeLog, CalendarReminder)

=== PHASE 1 — PARALLEL EXPLORATION ===

Spawn 3 Explorer subagents in parallel:

Explorer A: Read lib/notifications/ (all files), lib/activity-logger.ts,
lib/entity-change-log.ts. Report: How are notifications created? Which entity mutations
trigger notifications? Is there any notification deduplication? How are the 40+ categories
routed to the correct delivery channels?

Explorer B: Read app/api/notifications/, actions/notifications/, lib/notify-watchers.ts.
Report: Are notification endpoints auth-guarded? Can user mark another user's notification
as read? Is the delivery log updated atomically with delivery attempt? What is the retry
strategy for failed email delivery?

Explorer C: Read components/notifications/, relevant SWR hooks, actions/feed/.
Report: How are notification counts calculated (DB query per page load? Cached?).
Are counts stale after marking as read? Infinite scroll for notification list?
Activity feed: is it paginated? Are all entity types shown?

=== PHASE 2 — INDEPENDENT REVIEW ROUND 1 ===

Spawn 2 Reviewer subagents in parallel:

Reviewer A: Correctness and security focus:
- IDOR: can user mark another user's notifications as read?
- Notification deduplication: can the same event fire multiple notifications?
- Mention parsing: are mentions correctly resolved to user IDs before notification dispatch?
- EntityChangeLog immutability: any pathway that allows update/delete of log rows?
- Are activity log entries created within the same Prisma transaction as the entity mutation?
- Failed email delivery: is it retried? Logged? User notified?

Reviewer B: Performance and UX focus:
- Notification count queries: are they cached or queried on every page render?
- N+1 queries in notification list (fetching actor info per notification)?
- Real-time count update via Ably: badge count updated without page refresh?
- Missing skeleton in notification popover during load
- Activity feed: is it scoped to org, or can users see cross-org activity?
- Large activity log: any pagination or infinite scroll?

=== PHASE 3 — CROSS-REVIEW ROUND 2 ===

Critic A: GPT Codex produced the following analysis of Oikion's Notifications/Activity Feed.
Identify gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer B's output]

Critic B: GPT Codex produced the following analysis of Oikion's Notifications/Activity Feed.
Identify gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer A's output]

=== PHASE 4 — SYNTHESIS ===
Critical > High > Medium > Low > Positive. File path + fix for every finding.
```

---

## Domain 13 — Public Surface: Website, Portals & XE.gr

```
You are the orchestrator for a deep audit of the public-facing modules of the Oikion MVP:
the landing website, public agent/agency profiles, the XE.gr property portal sync, and
the newsletter system at /Users/stapo/Desktop/Oikion/MVP.

=== PROJECT CONTEXT ===
- Public routes live under app/[locale]/(landing)/ (no auth required)
- XE.gr is the major Greek real estate portal; properties sync via XeIntegration
- XeSyncHistory tracks each sync attempt; XeSyncItem tracks per-property publish status
- Agent and agency profiles are public (AgentProfile, AgencyProfile)
- Newsletter: NewsletterSubscriber model, Resend for delivery
- AgencyContactSubmission and WebsiteContactSubmission: public contact forms (no auth)
- Public contact forms must be rate-limited (no auth = abuse vector)
- n8n handles newsletter scheduling and blog post generation

=== SCOPE ===
Files to analyze:
- app/api/portal-publishing/ (all files)
- app/api/newsletter/ (all files)
- app/api/og/ (all files)
- actions/xe/ (all files)
- actions/website/ (all files)
- lib/xe/ (all files)
- app/[locale]/(landing)/ (all files)
- components/website/ (all files)
- prisma/schema.prisma (models: XeIntegration, XeAgentSettings, XeSyncHistory,
  XeSyncItem, NewsletterSubscriber, NewsletterCampaign, AgencyContactSubmission,
  WebsiteContactSubmission, BlogPost, AgentContactSubmission, AgencyProfile)

=== PHASE 1 — PARALLEL EXPLORATION ===

Spawn 3 Explorer subagents in parallel:

Explorer A: Read lib/xe/ (all files), actions/xe/, app/api/portal-publishing/.
Report: How are XE.gr credentials stored? Are they encrypted at rest?
How does property mapping work (Oikion fields → XE.gr fields)?
What happens if XE.gr API is down during sync? Is retry logic implemented?
Can a user publish another org's properties to XE.gr?

Explorer B: Read app/[locale]/(landing)/ (all files), components/website/ (all files),
actions/website/, app/api/newsletter/. Report: Are public contact forms rate-limited?
Is there any spam protection (CAPTCHA, honeypot)? Is user-supplied data sanitized
before storage? Are newsletter unsubscribe links properly implemented?

Explorer C: Read prisma/schema.prisma (public-surface models), app/api/og/,
actions/xe/sync.ts or similar. Report: Schema completeness for public models.
Is XE.gr credentials stored with proper encryption? Are public profile queries
scoped correctly (only PUBLIC visibility items)? OG image generation: any SSRF risk?

=== PHASE 2 — INDEPENDENT REVIEW ROUND 1 ===

Spawn 2 Reviewer subagents in parallel:

Reviewer A: Security focus:
- XE.gr credentials: encrypted at rest? Logged anywhere?
- Public contact forms: rate limiting, CAPTCHA/honeypot, input sanitization
- Public profile pages: do they leak PRIVATE or HIDDEN properties?
- SSRF in OG image generation: is the URL parameter validated?
- Newsletter unsubscribe: is the token cryptographically secure and single-use?
- Are public API endpoints truly unauthenticated by design, or are some accidentally public?

Reviewer B: Reliability and UX focus:
- XE.gr sync failure handling: is the user notified? Is partial sync recoverable?
- XeSyncHistory: is sync status shown in the UI?
- Public website: are pages statically generated (ISR) or server-rendered per request?
- Missing OG images for property/agent pages?
- Contact form submission: optimistic UI? Duplicate submission prevention?
- Newsletter double-opt-in: is it implemented?

=== PHASE 3 — CROSS-REVIEW ROUND 2 ===

Critic A: GPT Codex produced the following analysis of Oikion's public surface modules.
Identify gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer B's output]

Critic B: GPT Codex produced the following analysis of Oikion's public surface modules.
Identify gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer A's output]

=== PHASE 4 — SYNTHESIS ===
Critical > High > Medium > Low > Positive. File path + fix for every finding.
```

---

## Domain 14 — Dashboard & Reports

```
You are the orchestrator for a deep audit of the Dashboard and Reports modules of the Oikion
MVP codebase at /Users/stapo/Desktop/Oikion/MVP.

=== PROJECT CONTEXT ===
- Dashboard widgets powered by Tremor charts
- Metrics include: contacts, properties, deals, agents, leads, revenue, KPIs
- Dashboard queries are action-based (not SWR) — they run on the server
- Reports module generates custom reports from the same data sources
- All dashboard data is scoped to organizationId
- MarketingSpend, AgentHours, MarketData models for KPI tracking
- Dashboard is a "physics grid" — widgets can be dragged and repositioned

=== SCOPE ===
Files to analyze:
- app/api/dashboard/ (all files)
- actions/dashboard/ (all files)
- actions/reports/ (all files)
- app/[locale]/app/(routes)/reports/ (all files)
- components/dashboard/ (all files including DashboardGrid, PhysicsGrid, WidgetSettingsPanel)
- components/tremor/ (all files)
- components/reports/ (all files)
- hooks/swr/ (any dashboard-related hooks)
- prisma/schema.prisma (models: MarketingSpend, AgentHours, MarketData)

=== PHASE 1 — PARALLEL EXPLORATION ===

Spawn 2 Explorer subagents in parallel:

Explorer A: Read actions/dashboard/ (all files), app/api/dashboard/ (all files),
actions/reports/ (all files). Report: What metrics are computed?
Are all queries filtered by organizationId? Are there any expensive queries that
run on every dashboard load without caching? How is trend data calculated?

Explorer B: Read components/dashboard/ (all files), components/tremor/ (all files),
components/reports/, app/[locale]/app/(routes)/reports/. Report: How are charts rendered?
Are there loading states for each widget? What happens if a metric query fails?
Is the physics grid dragging persisted? Any widget that renders client data server-side?

=== PHASE 2 — INDEPENDENT REVIEW ROUND 1 ===

Spawn 2 Reviewer subagents in parallel:

Reviewer A: Correctness and security focus:
- Are all dashboard queries scoped by organizationId without exception?
- Trend calculations: any off-by-one in date ranges?
- Revenue calculations: Decimal precision or floating point?
- Reports: can a user generate a report for another org by passing organizationId?
- Are slow queries (counts across large tables) cached or computed inline?

Reviewer B: Performance and UX focus:
- N+1 queries in dashboard: are all widgets fetching independently?
- Missing loading skeletons per widget
- Widget position persistence: localStorage? DB? Lost on refresh?
- Empty state: what shows when there is no data (new org)?
- Chart accessibility: are Tremor charts screen-reader friendly?
- Report generation: synchronous (blocks request) or async with download?

=== PHASE 3 — CROSS-REVIEW ROUND 2 ===

Critic A: GPT Codex produced the following analysis of Oikion's Dashboard/Reports module.
Identify gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer B's output]

Critic B: GPT Codex produced the following analysis of Oikion's Dashboard/Reports module.
Identify gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer A's output]

=== PHASE 4 — SYNTHESIS ===
Critical > High > Medium > Low > Positive. File path + fix for every finding.
```

---

## Domain 15 — Platform Admin & Observability

```
You are the orchestrator for a deep audit of the Platform Admin and Observability infrastructure
of the Oikion MVP codebase at /Users/stapo/Desktop/Oikion/MVP.

=== PROJECT CONTEXT ===
- Platform admin requires isPlatformAdmin: true in Clerk privateMetadata OR email in
  PLATFORM_ADMIN_EMAILS env var
- Platform admin can: manage orgs, view all users, manage features, send campaigns,
  view PII audit logs, manage changelog, trigger cron jobs manually
- Cron jobs: reminders, Google Calendar sync, cross-org matching, weight calibration,
  email polling — triggered via /api/cron/* with a cron secret header
- Background jobs: BackgroundJob model tracks K8s job status
- Observability: PostHog (product analytics), Sentry (error tracking), Prisma metrics
- PiiAccessLog is append-only (never updated/deleted)
- AdminAuditLog and AdminSecurityAudit track platform admin actions

=== SCOPE ===
Files to analyze:
- app/api/platform-admin/ (all files)
- app/api/health/ (all files)
- app/api/cron/ (all files)
- app/api/jobs/ (all files)
- actions/platform-admin/ (all files)
- lib/posthog.ts
- lib/logger.ts
- lib/prisma-health.ts
- lib/prisma-metrics.ts
- lib/platform-admin.ts
- lib/platform-admin-utils.ts
- lib/pii-access-log.ts
- app/[locale]/app/(platform_admin)/ (all files)
- prisma/schema.prisma (models: AdminAccessLog, AdminAuditLog, AdminSecurityAudit,
  BackgroundJob, PiiAccessLog, ChangelogEntry, ChangelogBroadcast)

=== PHASE 1 — PARALLEL EXPLORATION ===

Spawn 3 Explorer subagents in parallel:

Explorer A: Read app/api/platform-admin/ (all files), actions/platform-admin/ (all files),
lib/platform-admin.ts, lib/platform-admin-utils.ts. Report: What platform admin endpoints
exist? How is platform admin auth enforced — is isPlatformAdmin check consistent across
all endpoints? Can a non-platform-admin call any platform-admin endpoint?

Explorer B: Read app/api/cron/ (all files), app/api/jobs/ (all files), app/api/health/.
Report: How are cron endpoints protected (cron secret header)? Is the secret compared
with timing-safe equality? What happens if a cron job fails midway?
Are job statuses correctly updated in BackgroundJob model?

Explorer C: Read lib/posthog.ts, lib/logger.ts, lib/prisma-health.ts, lib/prisma-metrics.ts,
lib/pii-access-log.ts, prisma/schema.prisma (admin/audit models).
Report: What is logged and where? Is PII ever logged in plain text?
Are PostHog events sent from server or client? Is PiiAccessLog truly append-only
(no UPDATE/DELETE paths exist)?

=== PHASE 2 — INDEPENDENT REVIEW ROUND 1 ===

Spawn 2 Reviewer subagents in parallel:

Reviewer A: Security focus:
- Platform admin auth consistency: every endpoint checked, no bypass paths?
- Cron secret: timing-safe comparison? Is the secret long enough?
- PII in logs: any console.log or logger.info calls that include email, phone, name?
- PiiAccessLog append-only enforcement: any UPDATE/DELETE on that table?
- AdminAuditLog: are all platform admin actions logged (not just sensitive ones)?
- Can platform admin access user E2EE data (they should NOT be able to)?
- Campaign email sending: can platform admin send to users outside the platform?

Reviewer B: Reliability and observability focus:
- Cron idempotency: if cron fires twice (double trigger), are operations safe?
- Health check endpoints: do they actually test DB connectivity or just return 200?
- PostHog: are any PII fields (email, name, phone) sent as event properties?
- Sentry: are error reports sanitized before sending (no tokens, passwords)?
- BackgroundJob status: is it updated if the job crashes vs. completes normally?
- Platform admin UI: are destructive actions (delete org, reseed demo) confirmation-gated?
- Missing observability: any critical path with no logging?

=== PHASE 3 — CROSS-REVIEW ROUND 2 ===

Critic A: GPT Codex produced the following analysis of Oikion's Platform Admin/Observability.
Identify gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer B's output]

Critic B: GPT Codex produced the following analysis of Oikion's Platform Admin/Observability.
Identify gaps, correct errors, add findings, rate each: confirmed / partially correct / incorrect.
[Insert Reviewer A's output]

=== PHASE 4 — SYNTHESIS ===
Critical > High > Medium > Low > Positive. File path + fix for every finding.
Start with a Cron Security section (cron secret validation) and a PII Logging section
(any logs that might expose PII).
```

---

## Quick Reference

| Domain | Est. Agents | Risk Level | Start Here? |
|--------|------------|------------|-------------|
| 1. Auth, RBAC & Middleware | 7 | 🔴 Critical | Yes — run first |
| 2. E2EE & Encryption | 7 | 🔴 Critical | Yes — run first |
| 3. Core Entity Trio | 7 | 🟠 High | Second batch |
| 4. Matchmaking Engine | 7 | 🟠 High | Second batch |
| 5. Deal Pipeline | 7 | 🟠 High | Second batch |
| 6. Messaging & Real-time | 7 | 🟠 High | Second batch |
| 7. Documents & Linking | 7 | 🟡 Medium | Third batch |
| 8. Calendar & Google Sync | 7 | 🟡 Medium | Third batch |
| 9. Import / Export / Archive | 7 | 🟡 Medium | Third batch |
| 10. Org Admin & Settings | 7 | 🟡 Medium | Third batch |
| 11. Network, Social & Cross-Org | 7 | 🟡 Medium | Fourth batch |
| 12. Notifications & Activity Feed | 7 | 🟡 Medium | Fourth batch |
| 13. Public Surface & XE.gr | 7 | 🟡 Medium | Fourth batch |
| 14. Dashboard & Reports | 5 | 🟢 Low | Fourth batch |
| 15. Platform Admin & Observability | 7 | 🟠 High | Run with batch 1 |

**Total agent invocations per domain**: 3 Explorers + 2 Reviewers + 2 Critics = **7 agents**
**Total across all 15 domains**: ~105 agent invocations
