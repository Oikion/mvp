# Phase A: Cascade Safety & Deletion Unification

**Date**: 2026-03-10
**Status**: Approved
**Scope**: Schema migration, unified departure service, UI null-safety, pathway rewiring
**Depends on**: Phases 1-2-4 security hardening (completed)
**Followed by**: Phase B (data ownership toggle + agent departure migration)

---

## Problem Statement

Deleting or removing a user from an organization currently has four inconsistent code paths that produce different results — ranging from thorough cleanup (GDPR) to near-zero cleanup (Clerk webhook). Additionally, 15 database `onDelete: Cascade` rules on org-owned data mean that deleting a user destroys organization assets (social posts, comments, API keys, attachments, changelog entries, and critically, encryption key wrappers).

The codebase needs to:
1. Stop destroying org data when a user is deleted
2. Consolidate all deletion/departure pathways into a single service
3. Handle null user references gracefully in the UI
4. Prepare foundations for Phase B (per-org data ownership toggle)

## Architecture Principle

**Org data stays with the org. User references are informational.**

- Properties, Clients, Mandates, Deals, Tasks, Documents, Social Posts, Comments — all belong to the organization
- `assigned_to`, `created_by`, `authorId`, `userId` on these models are informational authorship markers
- When a user departs, these references become `null` and the UI displays "Deleted User"
- User-personal data (AgentProfile, E2EE keys, notifications, API keys) is deleted with the user

---

## Section 1: Schema Migration

### 1.1 Make 18 Required User-Reference Fields Optional

These fields must become `String?` so `onDelete: SetNull` works.

| Model | Field | Current | Change |
|---|---|---|---|
| ClientComment | userId | `String` | `String?` |
| PropertyComment | userId | `String` | `String?` |
| MandateComment | userId | `String` | `String?` |
| crm_Accounts_Tasks_Comments | user | `String` | `String?` |
| SocialPost | authorId | `String` | `String?` |
| SocialPostComment | userId | `String` | `String?` |
| SocialPostLike | userId | `String` | `String?` |
| SharedEntity | sharedById | `String` | `String?` |
| SharedEntity | sharedWithId | `String` | `String?` |
| Deal | clientAgentId | `String` | `String?` |
| Deal | propertyAgentId | `String` | `String?` |
| Deal | proposedById | `String` | `String?` |
| Attachment | uploadedById | `String` | `String?` |
| ChangelogEntry | createdById | `String` | `String?` |
| ChangelogBroadcast | sentById | `String` | `String?` |
| Message | senderId | `String` | `String?` |
| ReferralCode | userId | `String` | `String?` |
| Referral | referredUserId | `String` | `String?` |

### 1.2 Set Explicit onDelete Rules

**SetNull (org data — authorship is informational, 31 relations):**

| Model | Field | Current Rule | New Rule |
|---|---|---|---|
| CalendarEvent | assignedUserId | Restrict | SetNull |
| Client_Contacts | assigned_to | Restrict | SetNull |
| Client_Contacts | created_by | Restrict | SetNull |
| Clients | assigned_to | Restrict | SetNull |
| ClientComment | userId | Cascade | SetNull |
| PropertyComment | userId | Cascade | SetNull |
| MandateComment | userId | Restrict | SetNull |
| crm_Accounts_Tasks | user | Restrict | SetNull |
| crm_Accounts_Tasks_Comments | user | Restrict | SetNull |
| Deal | clientAgentId | Restrict | SetNull |
| Deal | propertyAgentId | Restrict | SetNull |
| Deal | proposedById | Restrict | SetNull |
| DocumentView | viewerUserId | Restrict | SetNull |
| Documents | assigned_user | Restrict | SetNull |
| Documents | created_by_user | Restrict | SetNull |
| Properties | assigned_to | Restrict | SetNull |
| Property_Contacts | assigned_to | Restrict | SetNull |
| SocialPost | authorId | Cascade | SetNull |
| SocialPostComment | userId | Cascade | SetNull |
| SocialPostLike | userId | Cascade | SetNull |
| SharedEntity | sharedById | Cascade | SetNull |
| SharedEntity | sharedWithId | Cascade | SetNull |
| Attachment | uploadedById | Cascade | SetNull |
| ChangelogEntry | createdById | Cascade | SetNull |
| ChangelogBroadcast | sentById | Cascade | SetNull |
| Message | senderId | Restrict | SetNull |
| Mandate | assigned_to | SetNull | SetNull (already correct) |
| ReferralCode | userId | Cascade | SetNull (also set `isActive = false` in departure service) |
| Referral | referredUserId | Restrict | SetNull |

**Keep Cascade (user-personal data, 12 relations):**

| Model | Field | Rationale |
|---|---|---|
| AgentConnection | followerId, followingId | Personal social connections |
| AgentProfile | userId | User's public agent profile |
| EventInvitee | userId | Personal calendar participation |
| Feedback | userId | Personal feedback submissions |
| Notification | userId | Personal notifications |
| UserNotificationSettings | userId | Personal preferences |
| UserIdentityKey | userId | E2EE keys — personal cryptographic material |
| UserE2eePepper | userId | E2EE pepper — personal |
| UserPreKey | userId | E2EE pre-keys — personal |
| OrganizationEncryptionKey | userId | Per-user wrapped DEK — personal |
| ApiKey | createdById | API keys are credentials — invalidate on user deletion |
| WebhookEndpoint | createdById | Tied to API key creator |

### 1.3 Add DepartureReason Enum

```prisma
enum DepartureReason {
  LEFT_ORG
  REMOVED_FROM_ORG
  ACCOUNT_DELETED
  ADMIN_FORCE_DELETED
}
```

This Prisma enum is used by Phase A's departure service and reused by Phase B's `DepartureLog` model.

### 1.4 Add 11 Missing Indexes

| Model | Field |
|---|---|
| ChangelogBroadcast | sentById |
| Client_Contacts | created_by |
| Documents | document_type |
| MandateComment | userId |
| Property_Contacts | assigned_to |
| Property_Contacts | property |
| crm_Accounts_Tasks | account |
| crm_Accounts_Tasks | calendarEventId |
| crm_Accounts_Tasks | user |
| crm_Accounts_Tasks_Comments | crm_account_task |
| crm_Accounts_Tasks_Comments | user |

### 1.5 Remove Sentinel organizationId Defaults

Remove `@default("00000000-0000-0000-0000-000000000000")` from 13 models. No field should have a default or forced ID — if the org ID doesn't exist in Clerk it's invalid.

**Models**: CalendarEvent, CalendarReminder, Clients, Client_Contacts, Documents, CalendarEventAttendee, CalendarEventNotes, Deal (`__global__`), Feedback, FeedbackScreenshot, Mandate, crm_Accounts_Tasks, crm_Tasks_Comments.

**Pre-flight**: Audit query to verify zero rows use sentinel values.

---

## Section 2: Unified Departure Service

### File: `lib/user-departure/index.ts`

```typescript
// DepartureReason is a Prisma enum (added in Phase A schema migration)
// enum DepartureReason { LEFT_ORG, REMOVED_FROM_ORG, ACCOUNT_DELETED, ADMIN_FORCE_DELETED }
import { DepartureReason } from "@prisma/client";

type DepartureResult = {
  orgId: string;
  nulledReferences: number;
  deletedPersonalData: number;
  errors: string[];
};

async function handleUserDeparture(
  userId: string,
  orgId: string,
  reason: DepartureReason
): Promise<DepartureResult>
```

### Departure Flow

**Step 1: Pre-flight checks**
- Verify user exists in DB
- Block if orgId is a personal workspace (Clerk `publicMetadata.type === "personal"`)
- Verify org encryption keys won't be orphaned (at least one other user has a wrapped DEK, OR no org encryption is active)

**Step 2: Null out org-scoped references (single Prisma transaction)**

For models WITH organizationId — direct filter:
```
Clients, Properties, Mandate, Deal, Documents, CalendarEvent, SocialPost,
crm_Accounts_Tasks, Feedback, Attachment, Message, ChangelogEntry, ChangelogBroadcast
→ WHERE organizationId = orgId AND [userField] = userId → SET [userField] = null
```

For models WITHOUT organizationId — join through parent:
```
ClientComment → via Clients.organizationId
PropertyComment → via Properties.organizationId
MandateComment → via Mandate.organizationId
SocialPostComment → via SocialPost.organizationId
SocialPostLike → via SocialPost.organizationId
SharedEntity → null whichever of sharedById/sharedWithId matches userId
DocumentView → via Documents.organizationId
Client_Contacts → has organizationId, direct filter
Property_Contacts → via Properties (no organizationId on model)
crm_Accounts_Tasks_Comments → has organizationId, direct filter
```

**Step 3: Delete user-personal data for this org**
- Notifications (where organizationId = orgId, userId = userId)
- EventInvitee (where event.organizationId = orgId, userId = userId)
- OrganizationEncryptionKey (where organizationId = orgId, userId = userId)

**Step 4: Audit log**
Create record with: userId, orgId, reason, timestamp, counts of affected records.

### Per-org vs Full-account

- **User leaves one org**: `handleUserDeparture(userId, orgId, "LEFT_ORG")` — user still exists, only this org's references nulled
- **User deletes account**: `handleUserDeparture(userId, orgId, "ACCOUNT_DELETED")` called for EACH org, then Users row deleted (DB cascades clean up personal data)

### Personal Workspace Guard (server-side enforcement)

Wire `guardPersonalWorkspace()` from `lib/personal-workspace-guard.ts` to:
- `handleUserDeparture()` — reject if orgId is personal workspace
- Clerk `organizationMembership.deleted` webhook — block + restore
- Any server action that removes org members

---

## Section 3: UI Null-Safety

### Helper: `lib/display-utils.ts`

```typescript
type UserLike = { name?: string | null; email?: string | null; avatar?: string | null } | null | undefined;

function getUserDisplay(user: UserLike): { name: string; email: string; avatar: string | null }
```

Returns `{ name: t("common.deletedUser"), email: "", avatar: null }` when user is null.

### i18n Translations

- `en/common.json`: `"deletedUser": "Deleted User"`
- `el/common.json`: `"deletedUser": "Διαγραμμένος Χρήστης"`

### UI Surfaces Requiring Null-Safety

Every component that renders user references from the 31 SetNull fields:

- Property/Client/Mandate views: `assigned_to` user name
- Deal view: `clientAgentId`, `propertyAgentId` agent names
- Task view/table: assigned user
- All comment threads (Client, Property, Mandate, Task): comment author
- Social feed: post author, comment author, liker names
- Document list: `created_by_user`, `assigned_user`
- Shared entities: `sharedBy`, `sharedWith` user names
- Activity feed: various author references
- Changelog: `createdBy` author
- Messages: sender name

Pattern: `{getUserDisplay(post.author).name}` instead of `{post.author.name}`

---

## Section 4: Pathway Rewiring

All 5 pathways converge on `handleUserDeparture()`.

### Pathway A: GDPR Data Deletion
**File**: `lib/data-deletion/execute-deletion.ts`

Replace 23 manual `deleteMany` calls with:
1. Validate request (status, grace period) — keep as-is
2. Set status → PROCESSING
3. Get user's org memberships from Clerk
4. For each org: `await handleUserDeparture(userId, orgId, "ACCOUNT_DELETED")`
5. Delete Users row (triggers Cascade for personal data)
6. Delete from Clerk
7. Set status → COMPLETED

### Pathway B: User Self-Delete
**Files**: `actions/user/delete-account.ts`, `app/api/user/[userId]/delete-account/route.ts`

Replace ~50 lines of manual deletes with:
1. Verify "DELETE MY DATA" confirmation
2. Get org memberships from Clerk
3. For each org: `await handleUserDeparture(userId, orgId, "ACCOUNT_DELETED")`
4. Delete Users row + Delete from Clerk

### Pathway C: Clerk Webhook (user.deleted)
**Files**: `app/api/webhooks/clerk/route.ts`, `lib/clerk-sync.ts`

Replace soft-delete + minimal cleanup with:
1. Find DB user by clerkUserId
2. Extract org memberships from webhook event payload (user is already deleted in Clerk)
3. For each org: `await handleUserDeparture(userId, orgId, "ACCOUNT_DELETED")`
4. Delete Users row from DB

Remove `cleanupOrganizationData()` from `clerk-sync.ts` (replaced by departure service).

### Pathway D: Platform Admin Force Delete
**File**: `actions/platform-admin/user-actions.ts`

Replace cascade-dependent deletion with:
1. Verify admin permissions + log action + send email — keep as-is
2. Get target user's org memberships from Clerk
3. For each org: `await handleUserDeparture(targetUserId, orgId, "ADMIN_FORCE_DELETED")`
4. Delete from Clerk + Delete Users row

### Pathway E: User Leaves / Removed From Org (NEW)
**File**: `app/api/webhooks/clerk/route.ts` → `organizationMembership.deleted`

New handler:
1. Extract userId, orgId from webhook payload
2. Check if org is personal workspace → block + restore
3. `await handleUserDeparture(userId, orgId, "LEFT_ORG" | "REMOVED_FROM_ORG")`
4. User still exists — no Users row deletion

This is the pathway Phase B extends with the `dataOwnership` check.

---

## Section 5: Testing Strategy

### Unit Tests (`lib/user-departure/__tests__/`)

| Test File | Verifies |
|---|---|
| `departure-agency-owned.test.ts` | SetNull applied to all 31 relations for correct org only |
| `departure-multi-org.test.ts` | Departure from org A doesn't affect org B data |
| `departure-personal-workspace-blocked.test.ts` | Rejects departure if orgId is personal workspace |
| `departure-encryption-safety.test.ts` | Blocks if would orphan org's last encryption key |
| `departure-audit-log.test.ts` | Creates audit record with reason, timestamp, counts |

### Integration Tests

| Test File | Scenario |
|---|---|
| `gdpr-deletion.test.ts` | Full GDPR flow → departure per org → Users row deleted → org data intact |
| `self-delete.test.ts` | "DELETE MY DATA" → departure per org → Clerk + DB deleted |
| `clerk-webhook.test.ts` | Simulate user.deleted → departure per org → DB cleaned up |
| `admin-delete.test.ts` | Admin force-delete → departure per org → user gone, org data intact |
| `leave-org.test.ts` | organizationMembership.deleted → departure for one org → user exists in other orgs |

### UI Null-Safety Verification

Grep-based audit script: find every Prisma `include` of User relations (the 31 SetNull fields) and verify consuming components use `getUserDisplay()` or optional chaining.

---

## Section 6: Migration Rollout

### Step 1: Pre-flight Data Audit

```sql
SELECT 'CalendarEvent' as model, COUNT(*) FROM "CalendarEvent"
  WHERE "organizationId" = '00000000-0000-0000-0000-000000000000'
UNION ALL SELECT 'Clients', COUNT(*) FROM "Clients"
  WHERE "organizationId" = '00000000-0000-0000-0000-000000000000'
-- ... repeat for all 13 models
UNION ALL SELECT 'Deal', COUNT(*) FROM "Deal"
  WHERE "organizationId" = '__global__';
```

All counts must be zero. Non-zero rows must be assigned to correct org or deleted first.

### Step 2: Schema Migration (single Prisma migration)

One migration containing:
- `DepartureReason` enum (reused by Phase B)
- 18 fields: `String` → `String?`
- 31 relations: add/change `onDelete` rules
- 11 indexes: CREATE INDEX
- 13 models: remove `@default(...)` on organizationId

Non-destructive, backwards-compatible. Existing data untouched.

### Step 3: Deploy Code Changes (same release)

1. `lib/user-departure/index.ts` — departure service
2. `lib/display-utils.ts` — getUserDisplay helper
3. Rewired pathways (A-E)
4. UI components with null-safety
5. `guardPersonalWorkspace` wired to server endpoints
6. Updated translations (en + el)

### Step 4: Staging Verification

- Create test user in two orgs with properties, clients, comments, social posts
- Remove user from org A → verify org A data intact with "Deleted User" labels, org B unaffected
- Delete user account → verify both orgs' data intact, personal data gone

### Step 5: Production Deploy

- Run pre-flight audit query
- Deploy migration + code together
- Monitor error logs for null-reference crashes

### Rollback Plan

- **Schema**: Backwards-compatible. Rolling back code without schema is safe.
- **Code**: Revert deployment. Old pathways still work against new schema.
- **Data**: No data modified by migration itself. Clean rollback.

---

## Phase B Preview

Phase B adds:
- `OrganizationSettings.dataOwnership: "AGENCY" | "AGENT"` field
- Consent flows on org creation and user join
- `handleUserDeparture()` reads ownership setting and branches:
  - AGENCY mode → SetNull (same as Phase A)
  - AGENT mode → copy top-level entities to personal org, delete originals, break Deals
- This spec will be written separately after Phase A plan is finalized.
