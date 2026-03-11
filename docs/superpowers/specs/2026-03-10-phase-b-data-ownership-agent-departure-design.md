# Phase B: Data Ownership Toggle & Agent Departure Migration

**Date**: 2026-03-10
**Status**: Approved
**Scope**: Org-level data ownership setting, agent consent flows, departure-time data migration, policy era tracking
**Depends on**: Phase A (cascade safety & deletion unification — must be deployed first)

---

## Problem Statement

Phase A ensures deleting a user no longer destroys organization data (all org-data references become `onDelete: SetNull`). But it treats all orgs the same — data always stays with the org. In reality, Greek real estate agencies operate under two models:

1. **Agency-owned**: The agency considers all uploaded data its corporate asset. Agents are employees contributing to a shared database.
2. **Agent-owned**: Agents are independent professionals using the agency's platform. Their listings, clients, and mandates are personal business assets they bring and take with them.

The platform must support both models with explicit, legally binding consent from all parties.

## Architecture Principle

**Data ownership is a per-org policy, set by the org admin and consented to by each agent before they access org data. Policy changes apply prospectively — existing data follows the policy in effect when it was created.**

---

## Section 1: Schema & Data Model

### 1.1 New Enum

```prisma
enum DataOwnershipMode {
  AGENCY    // Data stays with org on departure
  AGENT     // Data migrates to agent's personal workspace on departure
}
```

### 1.2 OrganizationSettings Extensions

| Field | Type | Purpose |
|---|---|---|
| `dataOwnershipMode` | `DataOwnershipMode @default(AGENCY)` | Current policy |
| `dataOwnershipSetAt` | `DateTime?` | When mode was first chosen (null = existing org hasn't chosen yet) |
| `dataOwnershipChangedAt` | `DateTime?` | Last policy change timestamp |
| `dataOwnershipChangedBy` | `String?` | userId who changed it |
| `policyVersion` | `Int @default(1)` | Increments on each policy change |
| `policyHistory` | `Json?` | Array of `{mode, from, to}` objects tracking all policy eras |

### 1.3 Consent Tracking Model

```prisma
model OrgMemberConsent {
  id               String            @id @default(uuid())
  organizationId   String
  userId           String
  consentedMode    DataOwnershipMode
  consentedAt      DateTime          @default(now())
  policyVersion    Int               @default(1)

  @@unique([organizationId, userId, policyVersion])
  @@index([organizationId, userId])
}
```

Tracks each agent's consent per policy version. Agents without a consent record for the current `policyVersion` are blocked from accessing the org until they re-consent.

### 1.4 Departure Log Model

```prisma
// DepartureReason enum is defined in Phase A's schema migration.
// Reused here by DepartureLog:

model DepartureLog {
  id               String            @id @default(uuid())
  organizationId   String
  userId           String
  userName         String            // Snapshot at departure time (survives account deletion)
  reason           DepartureReason
  policyApplied    DataOwnershipMode
  migratedEntities Json              // {properties: [{id, title}], clients: [{id, name}], mandates: [{id, title}]}
  cancelledDeals   Json              // [{id, title}]
  entityCounts     Json              // {properties: N, clients: N, mandates: N, deals: N}
  createdAt        DateTime          @default(now())

  @@index([organizationId, createdAt])
  @@index([userId])
}
```

**TypeScript interfaces for JSON fields:**
```typescript
type MigratedEntities = { properties: {id: string, title: string}[], clients: {id: string, name: string}[], mandates: {id: string, title: string}[] };
type CancelledDeals = {id: string, title: string}[];
type EntityCounts = { properties: number, clients: number, mandates: number, deals: number };
```

Persists a summary of what happened during departure for org admin reference.

### 1.5 Deal Model Extension

Add a `cancellationReason` field to the existing `Deal` model:

```prisma
model Deal {
  // ... existing fields ...
  cancellationReason  String?   // e.g. "AGENT_DEPARTED", "MANUAL", etc.
}
```

### 1.6 Personal Workspace Lifecycle

Every user gets a personal workspace (a Clerk organization with `publicMetadata.type === "personal"`) automatically during onboarding. It is:
- Created in `OnboardingSteps.tsx` via `createOrganization()` with personal metadata
- Protected by `lib/personal-workspace-guard.ts` — cannot be deleted, left, or have members invited
- Restored automatically if accidentally deleted (via Clerk `organization.deleted` webhook)

The departure service can always assume the agent has a personal workspace. If for any reason it doesn't exist, the service must create one before migration using the same pattern as `restorePersonalWorkspaceIfNeeded()`.

---

## Section 2: Org Creation & Data Ownership Selection

### At Org Creation

After naming the org, a mandatory step presents two cards:

- **Agency-Owned** (default, highlighted): *"Properties, Clients, and Mandates uploaded by team members belong to the agency. If a member leaves, the data stays with the organization."*
- **Agent-Owned**: *"Properties, Clients, and Mandates remain under the control of the team member who manages them. If a member leaves, their assigned data moves with them to their personal workspace."*

Info note: *"This can be changed later from Organization Settings. If changed, existing data follows the original policy — the new policy applies to data created after the change."*

The selection:
1. Sets `dataOwnershipMode` on `OrganizationSettings`
2. Sets `dataOwnershipSetAt` to now
3. Creates an `OrgMemberConsent` record for the admin (implicit consent as the chooser)
4. Initializes `policyHistory` with `[{mode, from: now(), to: null}]`

### Existing Org Migration Banner

A persistent banner at the top of the dashboard for orgs where `dataOwnershipSetAt` is null:

*"Important: Please select your organization's data ownership policy. [Choose now]"*

Clicking opens a modal with the same two-card selector. Only `ORG_OWNER` and `ADMIN` can act on it. The banner persists across sessions until a choice is made.

### Changing the Policy Later

Available in Organization Settings (ORG_OWNER only). Changing the mode:
1. Closes the current `policyHistory` entry by setting its `to` field to `now()`
2. Appends new entry: `{mode: newMode, from: now(), to: null}`
3. Updates `dataOwnershipMode`, `dataOwnershipChangedAt`, `dataOwnershipChangedBy`
4. Increments `policyVersion`
5. Creates a new `OrgMemberConsent` record for the ORG_OWNER at the new `policyVersion` (implicit consent as the policy setter)
6. All other agents must re-consent on next login (see Section 3)

---

## Section 3: Agent Invitation Consent Flow

### Invitation Acceptance

When an agent clicks an invite link, instead of directly joining, the app shows a dedicated page at `/app/invitation/[invitationId]`:

**"You're invited to [Agency Name]!"**

Contents:
- Agency name and logo
- Data ownership policy notice:
  - **Agency-Owned**: *"This agency's policy: Data you upload (Properties, Clients, Mandates) belongs to the organization. If you leave or are removed, the data stays with the agency."*
  - **Agent-Owned**: *"This agency's policy: Data you manage (Properties, Clients, Mandates assigned to you) remains under your control. If you leave, your assigned data moves to your personal workspace."*
- Checkbox: *"I understand and accept this organization's data policy"*
- **"Accept & Join"** button (disabled until checkbox checked)
- **"Decline"** button

On Accept: creates `OrgMemberConsent` record, completes Clerk membership acceptance.
On Decline: revokes Clerk invitation, redirects to dashboard.

### Re-Consent After Policy Change

When `policyVersion` increments, agents without a matching consent record see a modal on next login:

**"[Agency Name] has updated their data policy"**

Shows the new policy in the same format as invitation. Two paths:

**"Accept & Continue"** — Checkbox + button. Creates new `OrgMemberConsent` record for current `policyVersion`.

**"I'd like to leave instead"** — Expands a consequence summary before confirming:
- If the *original* policy (the one they joined under) was **Agency-Owned**: *"If you leave, all Properties, Clients, and Mandates you created or are assigned to will stay with [Agency Name]."*
- If the *original* policy was **Agent-Owned**: *"If you leave, Properties, Clients, and Mandates currently assigned to you will be moved to your personal workspace. Active Deals involving your properties will be cancelled."*
- Confirm button: **"Leave [Agency Name]"**

The departure then executes under the *original* policy for existing data (policy era rules).

---

## Section 4: Agent Departure & Data Migration Service

### Decision Logic

Extends Phase A's `handleUserDeparture()` with a data ownership branch:

```
Agent departs org
  → Fetch org's dataOwnershipMode + policyHistory
  → For each entity assigned to the departing agent:
      → Determine which policy era the entity belongs to (by createdAt vs policyHistory)
      → AGENCY mode → SetNull (Phase A behavior, entity stays with org)
      → AGENT mode → Migrate to personal workspace, then delete from org
```

### Migration Process (AGENT Mode Path)

For each entity (Property, Client, Mandate) currently assigned to the departing agent:

1. **Decrypt source data** — If entity has encrypted fields, decrypt using source org's DEK
2. **Copy to personal workspace** — Create duplicate in agent's personal org with new ID. Re-encrypt with personal workspace's DEK. Strip org-specific relations (other users' comments, shared entity links).
3. **Handle Deals** — Active deals (`PROPOSED`, `NEGOTIATING`, `ACCEPTED`, `IN_PROGRESS`) involving migrated properties: set status to `CANCELLED`, set `cancellationReason` to `"AGENT_DEPARTED"`. Completed deals stay untouched. Other agent in each broken deal receives notification.
4. **Remove from org** — For entities **with no Deal references** (no row in `Deal` with matching `propertyId` or `clientId`): delete the original entity and explicitly delete its child records (comments, attachments, shared entity links) within the transaction. Note: Phase A changed these relations to `onDelete: SetNull`, so cascading deletes do NOT apply — the departure service must handle deletion explicitly. For entities **with Deal references**: do NOT delete — instead, null out `assigned_to` (same as AGENCY/SetNull behavior) so the Deal FK remains valid. The entity stays in the org as an unassigned record while the agent retains a copy in their personal workspace.
5. **Handle property images** — Copy image file references (URLs) to the migrated entity. Image files in blob storage (Vercel Blob / S3) are NOT duplicated — the URLs remain valid as they are publicly accessible. The departure service copies `PropertyImage` records with updated `propertyId` references.
6. **Handle cross-org shares** — Delete any `SharedEntity` records referencing migrated entities (`deleteMany` by `entityId`). Invalidate Polis/network match cache entries involving the migrated property (remove from cache, they'll be recomputed on next match run without the now-deleted entity).
7. **Log** — Create `DepartureLog` record with entity names and counts.
8. **Notify** — Email org owner with departure report link.

### What Migrates vs What Stays

| Migrates to personal workspace | Stays with org / deleted |
|---|---|
| Property core data (details, photos, pricing) | Comments by other org members |
| Client core data (name, contact, notes) | Shared entity links |
| Mandate core data (terms, requirements) | Deal records (stay in org, active ones cancelled) |
| | Properties/Clients with Deal references (stay in org, `assigned_to` nulled; agent gets copy) |
| Agent's own comments on their entities | Tasks assigned by others |
| Attachments uploaded by the agent | Calendar events (Phase A SetNull handles these) |
| Property images (URL references copied) | Cross-org shared entity links (deleted) |

### Account Deletion vs Org Departure

**Critical rule**: AGENT mode migration (copying data to personal workspace) only applies when the departure reason is `LEFT_ORG` or `REMOVED_FROM_ORG`. For `ACCOUNT_DELETED` and `ADMIN_FORCE_DELETED`, the user's personal workspace will also be deleted, so migrating data there is pointless. In these cases, **AGENCY mode (SetNull) is always used regardless of the org's data ownership setting**. The departure log records `policyApplied: AGENCY` with a note that account deletion overrode the org policy.

### Departure Report

Persisted in `DepartureLog` and accessible at `/app/settings/departures/[departureId]` (ORG_OWNER, ADMIN only).

Shows:
- Agent name (snapshot), departure date, reason, policy applied
- Summary counts: X properties, Y clients, Z mandates migrated/retained, N deals cancelled
- Three collapsible lists: property names, client names, mandate titles (names only — no sensitive data)

Email to org owner links directly to this page.

---

## Section 5: UI Components & Routes

### New Routes

| Route | Purpose | Access |
|---|---|---|
| `/app/invitation/[invitationId]` | Invitation acceptance with consent | Invited user only |
| `/app/settings/departures` | List of departure logs | ORG_OWNER, ADMIN |
| `/app/settings/departures/[departureId]` | Single departure report | ORG_OWNER, ADMIN |

### New Components

- **`DataOwnershipSelector`** — Two-card picker (Agency-owned / Agent-owned). Reused in: org creation, existing org banner modal, org settings page.
- **`DataPolicyConsentModal`** — Consent screen with policy description + checkbox. Props: `mode`, `orgName`, `variant` ("invitation" | "policy-change"). The "policy-change" variant adds the "Leave instead" path with consequence summary.
- **`DataOwnershipBanner`** — Persistent dashboard banner for orgs where `dataOwnershipSetAt` is null. Dismissed after selection.

### Consent Enforcement

In `proxy.ts` middleware, for authenticated app routes:
- After auth resolves user + org, check if `OrgMemberConsent` exists for current `policyVersion`
- If missing (and user is not ORG_OWNER), redirect to re-consent route
- Cached per session, invalidated when `policyVersion` changes

### Settings Page Addition

New "Data Ownership" section in org settings:
- Shows current mode with description
- "Change" button (ORG_OWNER only) — modal with `DataOwnershipSelector` + warning: *"Existing data follows the current policy. The new policy applies to data created after the change. All team members will need to re-consent."*

### Translations

Both `en` and `el` locales need new namespace `dataOwnership.json` covering:
- Selector card titles and descriptions
- Consent modal text for both modes
- Re-consent modal with leave consequences
- Departure report labels
- Banner text
- Settings section labels

---

## Section 6: Edge Cases & Safety

### Edge Case 1: Multiple Policy Eras

If an org changes policy multiple times (Agent → Agency → Agent), `policyHistory` stores all eras as `[{mode, from, to}, ...]`. On departure, each entity's `createdAt` is matched against the eras with a linear scan to determine which policy applies. Orgs won't change policy frequently, so this is efficient.

### Edge Case 2: Agent Removed by Admin (Not Voluntary)

Same migration flow as voluntary departure. `DepartureReason` distinguishes `"left_org"` vs `"removed_from_org"`. The data policy applies identically — that's the contract both parties consented to.

### Edge Case 3: Org Owner Leaves

Blocked by Clerk — owner must transfer ownership first. No special handling needed.

### Edge Case 4: Race Condition During Departure

The departure service runs in a Prisma interactive transaction with `isolationLevel: Serializable` to prevent entities being created mid-departure. Entities created after the transaction snapshot are not included. They become orphaned (assigned to a user no longer in the org). Phase A's SetNull cleanup or manual admin reassignment handles these.

### Edge Case 5: Encrypted Data Migration

Properties and Clients may have server-side encrypted fields (per-org DEK). Migration process:
1. Decrypt with source org's DEK
2. Re-encrypt with personal workspace's DEK
3. This must happen within the departure transaction, before the agent's `OrganizationEncryptionKey` for the source org is deleted

### Edge Case 6: Personal Workspace Has No Encryption Key

If the personal workspace has never initialized encryption (agent never uploaded data there), the departure service must initialize encryption for the personal workspace first (create DEK, wrap with agent's key) before migrating encrypted data.

---

## Relationship to Phase A

Phase B **extends** Phase A — it does not replace it:

- Phase A's `handleUserDeparture()` becomes the foundation. Phase B adds the `dataOwnershipMode` branch.
- Phase A's `onDelete: SetNull` rules remain the default (AGENCY mode). Phase B's AGENT mode adds the migration step *before* the SetNull/delete.
- Phase A's `getUserDisplay()` null-safety helper handles the UI for departed agents regardless of mode.
- Phase A must be deployed and stable before Phase B work begins.

---

## Testing Strategy

### Unit Tests

| Test | Verifies |
|---|---|
| `agency-mode-departure.test.ts` | AGENCY mode: SetNull applied, no migration, departure log created |
| `agent-mode-departure.test.ts` | AGENT mode: entities copied to personal workspace, deleted from org, deals cancelled |
| `policy-era-split.test.ts` | Mixed eras: pre-change entities follow old policy, post-change follow new |
| `multi-era-departure.test.ts` | Multiple policy changes: each entity matched to correct era |
| `encryption-migration.test.ts` | Encrypted data decrypted with source DEK, re-encrypted with target DEK |
| `consent-enforcement.test.ts` | Agents without current policyVersion consent are blocked |

### Integration Tests

| Test | Scenario |
|---|---|
| `org-creation-ownership.test.ts` | Create org with each mode, verify settings stored |
| `invitation-consent.test.ts` | Accept invitation → consent recorded. Decline → invitation revoked |
| `reconsent-flow.test.ts` | Policy change → agent sees modal → accept or leave |
| `departure-report.test.ts` | Full departure → report page shows correct entity names |
| `deal-cancellation.test.ts` | Active deals cancelled, completed deals untouched, notifications sent |

---

## Migration Rollout

### Step 1: Schema Migration

Single migration adding:
- `DataOwnershipMode` enum
- 6 fields on `OrganizationSettings`
- `OrgMemberConsent` model
- `DepartureLog` model (uses `DepartureReason` enum from Phase A)
- `Deal.cancellationReason` field

Non-destructive. All new fields are optional or have defaults.

### Step 2: Deploy Code

1. `DataOwnershipSelector`, `DataPolicyConsentModal`, `DataOwnershipBanner` components
2. Invitation acceptance page
3. Settings page additions
4. Extended departure service
5. Departure report page
6. Consent enforcement in middleware
7. Translations (en + el)

### Step 3: Existing Org Migration

All existing orgs have `dataOwnershipSetAt = null`, which triggers the persistent banner. Admins choose at their own pace. Until chosen, the default `AGENCY` mode applies (same as Phase A behavior — no disruption).

### Rollback Plan

- **Schema**: Backwards-compatible. New fields are ignored by Phase A code.
- **Code**: Revert to Phase A behavior. AGENCY mode is the default, so departures still work.
- **Consent**: If consent enforcement causes issues, disable the middleware check. Consent records remain for re-enabling later.
