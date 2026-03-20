# Organization Creation Wizard & Onboarding Slimming

**Date**: 2026-03-20
**Status**: Approved
**Branch**: `feature/unified-import-engine` (will need a new branch)

---

## Overview

Two coupled changes:

1. **New Organization Creation Wizard** — a 6-step, full-screen wizard for creating agency organizations, accessible from the `AgencyOrganizationSwitcher`. Replaces the current single-page `CreateOrganizationForm`.
2. **Onboarding Slimming** — remove all org-related steps from user onboarding. Post-onboarding, users land in their personal workspace. Agency creation is a separate, intentional action.

### Current Flow
Sign up → Onboarding (user profile + org creation + data policy) → Land in agency org

### New Flow
Sign up → Onboarding (user profile only) → Land in personal workspace → Create agency via wizard when ready

---

## Part 1: Organization Creation Wizard

### Route Structure

```
app/[locale]/app/(onboarding)/create-organization/
├── layout.tsx                          # Auth guard, chrome-free layout
├── page.tsx                            # Renders CreateOrganizationWizard
└── components/
    ├── CreateOrganizationWizard.tsx     # Orchestrator (state, navigation, creation)
    ├── OrgInfoStep.tsx                 # Step 1: name + slug
    ├── DataPolicyStep.tsx              # Step 2: AGENCY/AGENT ownership
    ├── EncryptionPolicyStep.tsx        # Step 3: Standard/Enhanced + PIN
    ├── AddTeammatesStep.tsx            # Step 4: invite connections + manual emails
    ├── EstablishPartnershipsStep.tsx   # Step 5: bilateral agency requests
    └── ReviewStep.tsx                  # Step 6: summary + create
```

**Location**: Inside `(onboarding)` route group — full-screen, no sidebar/nav, same visual treatment as user onboarding.

**Entry point**: `AgencyOrganizationSwitcher` → "Create Organization" button → `/${locale}/app/create-organization`

### Layout Guard (Server-Side)

The `layout.tsx` performs these checks:
- **Require `userId`** — redirect to sign-in if not authenticated
- **Require completed onboarding** — redirect to `/app/onboard` if not
- **Check user is not INACTIVE** — redirect to `/app/inactive`
- **No `orgId` check** — users may already belong to other orgs (this is expected)

### Wizard State

```typescript
interface CreateOrgWizardData {
  // Step 1: Org Info
  orgName: string;
  orgSlug: string;

  // Step 2: Data Policy
  dataOwnershipMode: "AGENCY" | "AGENT" | null;

  // Step 3: Encryption (matches Prisma EncryptionMode enum: STANDARD | E2EE)
  encryptionMode: "STANDARD" | "E2EE" | null;
  // UI displays "Enhanced" as the label for E2EE mode
  // PIN handled separately via existing E2EE PIN setup flow

  // Step 4: Teammates
  teammates: Array<{
    type: "connection" | "manual";
    userId?: string;       // for connections
    email: string;
    name?: string;
    role: "ADMIN" | "AGENT" | "VIEWER";
  }>;

  // Step 5: Partnerships
  partnerOrgIds: string[];  // selected agency org IDs for bilateral requests
}
```

### Step Flow

| Step | Name | Required | Validation |
|------|------|----------|------------|
| 1 | Organization Info | Yes | Name 2-50 chars, slug available, not reserved |
| 2 | Data Policy | Yes | Ownership mode selected |
| 3 | Encryption Policy | Yes | Mode selected; if E2EE + no existing PIN, PIN must be created |
| 4 | Add Teammates | No (skippable) | Email format validation on manual entries, no duplicates |
| 5 | Establish Partnerships | No (skippable) | None — selection only |
| 6 | Review | Yes | All required fields present |

**Navigation**: "Back" and "Next" buttons on all steps (no Back on step 1). Steps 4-5 also have a "Skip" button. Step 6 has "Create Organization" instead of "Next".

**Progress bar**: Visible on all steps, shows 6 total steps.

**Animations**: Framer Motion spring transitions with direction awareness (forward: right-to-left slide, back: left-to-right), matching the existing onboarding pattern. Spring config: `stiffness: 300, damping: 30`.

### Step Details

#### Step 1 — Organization Info (`OrgInfoStep.tsx`)

- **Name input**: Text field, required, 2-50 characters
- **Slug input**: Auto-generated from name (using `generateOrgSlug()` from `types/onboarding.ts`), manually overridable
- **Availability checks**: Debounced (500ms) calls to `/api/organization/check-name` and `/api/organization/check-slug` on both name change (for auto-slug) and manual slug edit
- **Visual feedback**: Check/X icons + colored borders (green for available, red for taken/reserved)
- **Slug collision**: Show suggestion with incrementing suffix (e.g., `my-agency-2`)
- **Zod validation**: Name 2-50 chars, slug lowercase alphanumeric + hyphens only

#### Step 2 — Data Policy (`DataPolicyStep.tsx`)

- **Reuses** the existing `DataOwnershipSelector` component (AGENCY vs AGENT radio cards)
- **Icons**: Building2 (AGENCY) / UserCircle (AGENT)
- **Translations**: `dataOwnership.selector` namespace
- **Brief explanation** of what each mode means for data retention on agent departure

#### Step 3 — Encryption Policy (`EncryptionPolicyStep.tsx`)

Two radio cards:
- **Standard** (Shield icon): Server-side encryption at rest with org-level DEK. All sensitive fields encrypted automatically. No user action needed.
- **Enhanced** (ShieldCheck icon): Standard + client-side E2EE with passphrase-derived key. Additional protection layer — even server administrators cannot read encrypted fields.

**PIN flow when Enhanced is selected:**
- Check if user already has an E2EE PIN via existing `useE2EE` hook or API
- **No existing PIN**: Show inline PIN creation form (reuse/adapt `E2EEPinSetup` component). Display messaging that this PIN is app-wide across all orgs and contexts.
- **Existing PIN**: Show confirmation text that their existing PIN will be used for this org's E2EE.
- **Standard selected**: No PIN interaction.

"Next" button stays disabled until encryption mode is selected AND (if Enhanced + no PIN) PIN is successfully created.

#### Step 4 — Add Teammates (`AddTeammatesStep.tsx`)

Two sections:

**Personal Connections section:**
- Fetches user's ACCEPTED `AgentConnection` records where the connection's org has `publicMetadata.type === "personal"` (personal workspace users only)
- Displays as selectable cards: avatar, name, role dropdown (ADMIN / AGENT / VIEWER)
- Multi-select with checkboxes
- Empty state: section hidden, only manual invite shown

**Manual Invite section:**
- Email input + role dropdown (ADMIN / AGENT / VIEWER)
- "Add another" button for multiple entries
- Basic email format validation
- Deduplication against both other manual entries and selected connections

#### Step 5 — Establish Partnerships (`EstablishPartnershipsStep.tsx`)

- Fetches user's ACCEPTED `AgentConnection` records where the connection belongs to an agency (`publicMetadata.type !== "personal"`)
- Groups connections by their agency org
- Displays agency cards: agency name, member count, connection's name shown as "Your contact: [name]"
- Multi-select with checkboxes
- If a connection belongs to multiple agency orgs, show all of them (each as a separate selectable card)
- Each selected agency will receive an `OrgNetworkPartner` request (PENDING status) from the new org
- Empty state: "No agency connections yet. You can establish partnerships later from Settings → Network."

#### Data Fetching Strategy for Steps 4-5

The `AgentConnection` model only has user IDs — no org information. Determining which org type each connection belongs to requires Clerk API calls. To avoid N+1 client-side calls:

**Server action `getConnectionsWithOrgInfo()`:**
1. Fetch all ACCEPTED connections for the current user from DB
2. Batch-fetch connected user details from Clerk backend API (`clerkClient.users.getUserList({ userId: [...ids] })`)
3. For each connected user, fetch their org memberships (`clerkClient.organizations.getOrganizationMembershipList`)
4. Classify each connection: personal-only users (teammates) vs agency-affiliated users (partnerships)
5. Return pre-classified data with org metadata (name, slug, member count, publicMetadata)

This server action runs once when the wizard mounts (or lazily when step 4 is first reached). The result is cached in wizard state and shared between steps 4 and 5. Loading state shown while fetching.

#### Step 6 — Review (`ReviewStep.tsx`)

Card-based summary layout:
- **Organization**: Name + slug
- **Data Policy**: Ownership mode with icon
- **Encryption**: Mode with icon
- **Teammates**: Count + list of names/emails with assigned roles (or "None — you can invite later")
- **Partnerships**: Count + list of agency names (or "None — you can establish later")
- **"Create Organization" button** with loading state and spinner

### Creation Flow (Client + Server Split)

The creation flow is split between client-side Clerk SDK calls and a server action, following the same pattern as the existing `OnboardingSteps.tsx`:

**Phase 1 — Client-side (Clerk SDK, in `CreateOrganizationWizard.tsx`):**
1. **Create Clerk organization** — `createOrganization({ name, slug })` via `useOrganizationList` hook
2. **Set as active** — `setActive({ organization: orgId })` to switch session context

**Phase 2 — Server action `finalizeOrganizationSetup(orgId, wizardData)`:**
3. **Create OrganizationSettings** — upsert with `encryptionMode`, `dataOwnershipMode`, `dataOwnershipSetAt`, `policyHistory`, `policyVersion`
4. **Update Clerk metadata** — set `publicMetadata.type = "agency"` via Clerk backend API
5. **Send teammate invitations** — Clerk org invitations for each teammate (email + role)
6. **Create partnership requests** — `OrgNetworkPartner` records with PENDING status for each selected agency (requires new org ID from Phase 1)
7. **Associate E2EE** — if E2EE mode, ensure org DEK is created and associated

Steps 5-6 are best-effort — partial failures don't block org creation. The server action returns a result object indicating which sub-steps succeeded/failed for UI feedback.

### State Persistence

Wizard state is persisted to `sessionStorage` (session-scoped, not cross-tab) under a fixed key. On mount, the wizard checks for existing state and restores it if found. State is cleared on successful org creation. This prevents data loss from accidental refresh, which is especially important for steps 4-5 where connection selections involve fetched external data.

A `beforeunload` event listener is registered when the wizard has any non-default values, warning the user before navigating away.

### Post-Creation Redirect

After successful org creation, the user is redirected to `/${locale}/app` (the main dashboard). Since `setActive({ organization: newOrgId })` has already switched the Clerk session context, the dashboard will render in the context of the newly created org.

### Error Handling

| Scenario | Behavior |
|----------|----------|
| Browser refresh mid-wizard | State lost, wizard restarts. `beforeunload` warning if any field is filled. |
| Network error during creation | Toast error, "Create Organization" re-enables for retry. No partial state cleanup needed. |
| Reserved name/slug | Inline error from availability check endpoints |
| Slug collision | Auto-suggest with incrementing suffix |
| PIN creation failure | Inline error, user retries. "Next" stays disabled. |
| Connection fetch failure (steps 4-5) | Error message with retry button. Manual invite / skip still work. |
| Duplicate email entries | Deduplicate silently, show toast |
| Clerk org creation fails | Full error displayed, no cleanup needed |
| OrganizationSettings fails after Clerk org | Retry settings creation (upsert is idempotent) |
| Invitation sending partially fails | Org created, warning: "3 of 5 invitations sent — resend from Settings" |
| Partnership creation partially fails | Org created, warning with partial success details |

---

## Part 2: Onboarding Slimming

### Current Steps (9)

0. Language Selection
1. Welcome
2. Theme
3. Username + Org (name, slug)
4. Data Ownership (AGENCY/AGENT)
5. Notifications What
6. Notifications How
7. Privacy
8. Review

### New Steps (7)

0. Language Selection
1. Welcome
2. Theme
3. Username (firstName, lastName, username only — no org fields)
4. Notifications (merged: what + how in single step)
5. Privacy
6. Review

### Changes Required

#### Step 3: `UsernameOrgStep.tsx` → `UsernameStep.tsx`

- Remove org name and slug input fields
- Remove org availability checks
- Remove `orgName` and `orgSlug` from step data
- Keep: firstName, lastName, username with availability check
- Rename component and file

#### Step 4: `DataOwnershipStep.tsx` — Remove

- Delete this step component entirely
- It now lives in the org creation wizard (Step 2: DataPolicyStep)

#### Steps 5+6: Merge into `NotificationsStep.tsx`

- Merge `NotificationsWhatStep.tsx` and `NotificationsHowStep.tsx` into a single `NotificationsStep.tsx`
- Top section: checkboxes for notification categories (tasks, calendar, deals, team activity, documents)
- Bottom section: delivery method toggles (email, in-app)
- Both sections in one scrollable step

#### Step 7 → Step 5: `PrivacyStep.tsx` — Unchanged

- Same component, just renumbered

#### Step 8 → Step 6: `ReviewStep.tsx` — Update

- Remove org name, slug, and data ownership from summary display
- Update step count references
- Show personal workspace as the destination

#### `OnboardingSteps.tsx` — Orchestrator Updates

- Remove org-related state from `OnboardingData`
- Remove `DataOwnershipStep` from step array
- Merge notification steps
- Update step count (9 → 7)
- Update progress bar calculation
- Update step index references throughout

#### `OnboardingData` Type (`types/onboarding.ts`)

- Remove `organization: { name, slug }` field
- Remove any data ownership references from the type

#### `completeOnboarding()` Server Action

- Still auto-creates personal workspace (Clerk org with `publicMetadata.type = "personal"`)
- No longer creates an agency org
- No longer sets data ownership mode
- No longer prompts for org name/slug — personal workspace uses a default name (e.g., user's full name + "'s Workspace")

#### Post-Onboarding Redirect

- User lands in personal workspace dashboard
- "Create Organization" available from `AgencyOrganizationSwitcher` in sidebar

---

## Navigation & Routing Changes

| Component | Current | New |
|-----------|---------|-----|
| `AgencyOrganizationSwitcher` "Create Organization" | `/${locale}/create-organization` (broken 404) | `/${locale}/app/create-organization` |
| `proxy.ts` Clerk org route intercept | Includes `/:locale/app/create-organization(.*)` | Removed from intercept list |
| Create org layout `orgId` redirect | Redirects to `/app` if user has orgId | No redirect — users may have existing orgs |
| Create org page `orgId` redirect | Client-side redirect if orgId exists | Removed |
| Old create-organization route | `app/[locale]/app/(routes)/create-organization/` | Delete — replaced by `(onboarding)` route |

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/[locale]/app/(onboarding)/create-organization/layout.tsx` | Auth guard, chrome-free layout |
| `app/[locale]/app/(onboarding)/create-organization/page.tsx` | Page shell |
| `.../create-organization/components/CreateOrganizationWizard.tsx` | Orchestrator |
| `.../create-organization/components/OrgInfoStep.tsx` | Step 1 |
| `.../create-organization/components/DataPolicyStep.tsx` | Step 2 |
| `.../create-organization/components/EncryptionPolicyStep.tsx` | Step 3 |
| `.../create-organization/components/AddTeammatesStep.tsx` | Step 4 |
| `.../create-organization/components/EstablishPartnershipsStep.tsx` | Step 5 |
| `.../create-organization/components/ReviewStep.tsx` | Step 6 |
| `actions/organization/finalize-organization-setup.ts` | Server action for post-Clerk-creation setup (settings, invites, partnerships) |
| `actions/organization/get-connections-with-org-info.ts` | Server action to batch-fetch connections with org classification |
| `locales/en/createOrganization.json` | English translations for wizard |
| `locales/el/createOrganization.json` | Greek translations for wizard |
| Merged `NotificationsStep.tsx` in onboarding | Replaces NotificationsWhat + NotificationsHow |
| Renamed `UsernameStep.tsx` in onboarding | Replaces UsernameOrgStep |

## Files to Modify

| File | Change |
|------|--------|
| `components/workspace/AgencyOrganizationSwitcher.tsx` | Fix route: `/${locale}/create-organization` → `/${locale}/app/create-organization` |
| `proxy.ts` | Remove `/:locale/app/create-organization(.*)` from `isClerkOrgRoute` matcher |
| `app/[locale]/app/(onboarding)/onboard/components/OnboardingSteps.tsx` | Remove org steps, merge notifications, update step count. Also clean up debug `fetch('http://127.0.0.1:7242/ingest/...')` logging calls. |
| `types/onboarding.ts` | Remove `organization` from `OnboardingData` |
| `actions/onboarding/complete-onboarding.ts` (or equivalent) | Remove agency org creation, keep personal workspace |
| `app/[locale]/app/(onboarding)/onboard/components/ReviewStep.tsx` | Remove org/data-ownership from summary |
| `app/[locale]/app/(routes)/create-organization/layout.tsx` | Remove `orgId` redirect guard (users may have existing orgs) |
| `app/[locale]/app/(routes)/create-organization/page.tsx` | Remove client-side `orgId` redirect |
| Clerk dashboard redirect URLs | Update post-signup redirects to point to `/app/onboard` instead of `/create-organization` |
| `docs/setup/clerk-setup.md`, `docs/setup/clerk-account-portal-setup.md`, `docs/architecture/authentication.md` | Update references to post-signup redirect paths |

## Files to Delete

| File | Reason |
|------|--------|
| `app/[locale]/app/(routes)/create-organization/` (entire directory) | Replaced by `(onboarding)` route |
| `components/organization/CreateOrganizationForm.tsx` | Replaced by wizard |
| `app/[locale]/app/(onboarding)/onboard/components/DataOwnershipStep.tsx` | Moved to org wizard |
| `app/[locale]/app/(onboarding)/onboard/components/NotificationsWhatStep.tsx` | Merged into NotificationsStep |
| `app/[locale]/app/(onboarding)/onboard/components/NotificationsHowStep.tsx` | Merged into NotificationsStep |
| `app/[locale]/app/(onboarding)/onboard/components/UsernameOrgStep.tsx` | Replaced by UsernameStep |

---

## Translations

New translation file: `locales/{en,el}/createOrganization.json` (dedicated file per project convention).

Key namespaces within the file:

- `wizard.*` — wizard titles, step descriptions, button labels
- `orgInfo.*` — name/slug labels, placeholders, availability messages
- `encryption.*` — Standard/Enhanced descriptions, PIN messaging
- `teammates.*` — section headers, empty states, role labels
- `partnerships.*` — section headers, empty states, agency card labels
- `review.*` — summary section headers, create button, success/error messages

Existing namespaces reused:
- `dataOwnership.selector` — AGENCY/AGENT cards (unchanged)
- `onboarding.*` — updated to reflect slimmed steps

---

## Dependencies

No new packages required. Uses existing:
- `framer-motion` — animations
- `@clerk/nextjs` — org creation, invitations, auth
- `zod` — validation
- `react-hook-form` — form state (if used, otherwise controlled components)
- `sonner` — toast notifications
- Existing E2EE components and hooks
