# Organization Creation Wizard & Onboarding Slimming — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-page org creation form with a 6-step wizard and slim the user onboarding from 9 to 7 steps by removing org-related steps.

**Architecture:** Standalone wizard component following the same Framer Motion animation patterns as the existing onboarding. Two-phase creation: client-side Clerk org creation + server action for settings/invites/partnerships. Onboarding slimmed by removing org fields from UsernameOrgStep, deleting DataOwnershipStep, and merging two notification steps into one.

**Tech Stack:** Next.js 16 App Router, Clerk (`useOrganizationList`, backend API), Prisma, Framer Motion (`motion/react` import path), Zod, next-intl, shadcn/ui, sonner

**Important conventions:**
- Import animations from `motion/react` (NOT `framer-motion`) — matches `OnboardingSteps.tsx`
- `AgentConnection.followerId`/`followingId` reference internal `Users.id`, NOT Clerk user IDs — always resolve via `prismadb.users.findUnique({ where: { clerkUserId } })` first
- Tasks 12-14 are an **atomic group** — the build will be broken between them. Implement all three before running `pnpm build`.
- `actions/CLAUDE.md` says never accept `organizationId` from client. `finalizeOrganizationSetup` is an exception because the org was just created client-side — add a code comment explaining why this is safe (caller verified as org owner via Clerk backend).

**Spec:** `docs/decisions/2026-03-20-org-creation-wizard-and-onboarding-slimming-design.md`

---

## File Structure

### New Files

```
app/[locale]/app/(onboarding)/create-organization/
├── layout.tsx                              # Auth guard, chrome-free layout
├── page.tsx                                # Page shell (client component)
└── components/
    ├── CreateOrganizationWizard.tsx         # Orchestrator (state, nav, creation)
    ├── OrgInfoStep.tsx                     # Step 1: name + slug
    ├── DataPolicyStep.tsx                  # Step 2: AGENCY/AGENT
    ├── EncryptionPolicyStep.tsx            # Step 3: Standard/E2EE + PIN
    ├── AddTeammatesStep.tsx                # Step 4: connections + manual emails
    ├── EstablishPartnershipsStep.tsx       # Step 5: bilateral agency requests
    └── ReviewStep.tsx                      # Step 6: summary + create

actions/organization/
├── finalize-organization-setup.ts          # Phase 2 server action
└── get-connections-with-org-info.ts        # Batch connection fetcher

locales/en/createOrganization.json          # English translations
locales/el/createOrganization.json          # Greek translations

app/[locale]/app/(onboarding)/onboard/components/
├── UsernameStep.tsx                        # Replaces UsernameOrgStep (no org fields)
└── NotificationsStep.tsx                   # Merged What + How
```

### Modified Files

```
proxy.ts                                                    # Remove create-org from intercept
components/workspace/AgencyOrganizationSwitcher.tsx          # Fix route URL
types/onboarding.ts                                         # Remove org from OnboardingData
app/[locale]/app/(onboarding)/onboard/components/
  OnboardingSteps.tsx                                       # Slim to 7 steps, remove org logic
  ReviewStep.tsx                                            # Remove org from summary
locales/en/onboarding.json                                  # Remove org keys, merge notifications
locales/el/onboarding.json                                  # Same
i18n.ts                                                     # Register createOrganization namespace
```

### Deleted Files

```
app/[locale]/app/(onboarding)/create-organization/  (existing layout.tsx + page.tsx — replaced by new wizard)
components/organization/CreateOrganizationForm.tsx
app/[locale]/app/(onboarding)/onboard/components/DataOwnershipStep.tsx
app/[locale]/app/(onboarding)/onboard/components/NotificationsWhatStep.tsx
app/[locale]/app/(onboarding)/onboard/components/NotificationsHowStep.tsx
app/[locale]/app/(onboarding)/onboard/components/UsernameOrgStep.tsx
```

---

## Task 1: Routing Fixes & Old Route Cleanup

**Files:**
- Modify: `proxy.ts:41-48`
- Modify: `components/workspace/AgencyOrganizationSwitcher.tsx:87-89`
- Delete: `app/[locale]/app/(routes)/create-organization/` (entire directory)
- Delete: `components/organization/CreateOrganizationForm.tsx`

- [ ] **Step 1: Fix proxy.ts — remove create-organization from Clerk intercept**

In `proxy.ts`, remove `"/:locale/app/create-organization(.*)"` from the `isClerkOrgRoute` matcher array (currently line 45). Keep the other three Clerk org routes.

- [ ] **Step 2: Fix AgencyOrganizationSwitcher route**

In `components/workspace/AgencyOrganizationSwitcher.tsx` line 88, change:
```typescript
// FROM:
router.push(`/${locale}/create-organization`);
// TO:
router.push(`/${locale}/app/create-organization`);
```

- [ ] **Step 3: Delete old create-organization files**

The existing create-organization route is at `app/[locale]/app/(onboarding)/create-organization/` (NOT under `(routes)`). Delete the existing layout.tsx and page.tsx there — they will be replaced by the new wizard in Task 4. Also delete the old form component:
- `app/[locale]/app/(onboarding)/create-organization/layout.tsx` (will be recreated in Task 4)
- `app/[locale]/app/(onboarding)/create-organization/page.tsx` (will be recreated in Task 4)
- `components/organization/CreateOrganizationForm.tsx`

- [ ] **Step 4: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds (no imports reference deleted files). If `CreateOrganizationForm` is imported elsewhere, find and remove those imports.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove old create-organization route, fix switcher URL and proxy intercept"
```

---

## Task 2: Translation Files

**Files:**
- Create: `locales/en/createOrganization.json`
- Create: `locales/el/createOrganization.json`
- Modify: `i18n.ts` (register new namespace)

- [ ] **Step 1: Create English translation file**

Create `locales/en/createOrganization.json` with all wizard keys. Structure:
```json
{
  "wizard": {
    "title": "Create Agency",
    "description": "Set up your agency with policies, team members, and partnerships",
    "back": "Back",
    "next": "Next",
    "skip": "Skip for now",
    "stepOf": "Step {current} of {total}"
  },
  "orgInfo": {
    "title": "Organization Info",
    "description": "Choose a name and URL for your agency",
    "nameLabel": "Organization Name",
    "namePlaceholder": "My Real Estate Agency",
    "slugLabel": "Organization URL",
    "slugPlaceholder": "my-agency",
    "slugHint": "This will be your organization's unique identifier",
    "available": "Available",
    "taken": "Already taken",
    "reserved": "This name is reserved",
    "checking": "Checking availability...",
    "suggestion": "Try: {slug}"
  },
  "dataPolicy": {
    "title": "Data Ownership Policy",
    "description": "Choose how data is handled when team members leave your agency"
  },
  "encryption": {
    "title": "Encryption Policy",
    "description": "Choose the level of data protection for your agency",
    "standardTitle": "Standard Encryption",
    "standardDescription": "All sensitive data is encrypted at rest with your organization's dedicated key. Automatic and transparent — no action needed from your team.",
    "enhancedTitle": "Enhanced Encryption (E2EE)",
    "enhancedDescription": "Standard encryption plus an additional client-side encryption layer. Even server administrators cannot read protected fields.",
    "pinRequired": "Enhanced encryption requires a PIN. This PIN is personal and works across all your organizations.",
    "pinExists": "Your existing PIN will be used for this organization's encryption.",
    "pinCreateTitle": "Create Your Encryption PIN"
  },
  "teammates": {
    "title": "Add Teammates",
    "description": "Invite people to join your agency",
    "connectionsTitle": "Your Connections",
    "connectionsDescription": "Invite people from your personal network",
    "manualTitle": "Invite by Email",
    "emailLabel": "Email address",
    "emailPlaceholder": "colleague@example.com",
    "roleLabel": "Role",
    "addAnother": "Add another",
    "remove": "Remove",
    "roles": {
      "ADMIN": "Admin",
      "AGENT": "Agent",
      "VIEWER": "Viewer"
    },
    "emptyConnections": "No personal connections to invite. You can invite teammates by email below.",
    "duplicateEmail": "This email has already been added"
  },
  "partnerships": {
    "title": "Establish Partnerships",
    "description": "Connect your new agency with agencies in your network",
    "yourContact": "Your contact: {name}",
    "members": "{count} members",
    "emptyState": "No agency connections yet. You can establish partnerships later from Settings → Network.",
    "selected": "{count} selected"
  },
  "review": {
    "title": "Review & Create",
    "description": "Review your agency setup before creating",
    "orgSection": "Organization",
    "dataPolicySection": "Data Policy",
    "encryptionSection": "Encryption",
    "teammatesSection": "Teammates",
    "partnershipsSection": "Partnerships",
    "noneYet": "None — you can add later",
    "invitations": "{count} invitation(s)",
    "partnerRequests": "{count} partnership request(s)",
    "createButton": "Create Organization",
    "creating": "Creating your agency...",
    "success": "Organization created successfully!",
    "partialSuccess": "{sent} of {total} invitations sent. You can resend from Settings.",
    "error": "Failed to create organization. Please try again."
  }
}
```

- [ ] **Step 2: Create Greek translation file**

Create `locales/el/createOrganization.json` with the same JSON structure as the English file. For Greek translations:
- Reference `locales/el/onboarding.json` and `locales/el/dataOwnership.json` for established terminology and tone
- Key terms: "Organization" = "Οργανισμός", "Agency" = "Μεσιτικό Γραφείο", "Create" = "Δημιουργία", "Encryption" = "Κρυπτογράφηση", "Teammates" = "Μέλη Ομάδας", "Partnerships" = "Συνεργασίες"
- If uncertain about specific translations, add the English text as placeholder with a `// TODO: translate` comment — a native speaker can refine later

- [ ] **Step 3: Register namespace in i18n.ts**

Open `i18n.ts`. The registration requires multiple changes — follow the exact pattern used by `"onboarding"` or `"dataOwnership"`:
1. Add a static import for both EN and EL at the top of the file (e.g., `import createOrganizationEN from "@/locales/en/createOrganization.json"`)
2. In the `loadMessages()` function (or equivalent), assign `messages.createOrganization` in both the `el` and `en` locale branches
3. If there's a type definition for message namespaces, add `createOrganization` there too

Search for how `"onboarding"` is registered and replicate the same pattern exactly.

- [ ] **Step 4: Verify translations load**

Run: `pnpm dev`
Check that the dev server starts without i18n errors about missing namespaces.

- [ ] **Step 5: Commit**

```bash
git add locales/en/createOrganization.json locales/el/createOrganization.json i18n.ts
git commit -m "feat(i18n): add createOrganization translations for EN and EL"
```

---

## Task 3: Server Actions

**Files:**
- Create: `actions/organization/finalize-organization-setup.ts`
- Create: `actions/organization/get-connections-with-org-info.ts`

- [ ] **Step 1: Create `get-connections-with-org-info.ts`**

This server action fetches the user's ACCEPTED connections and classifies them by org type for the wizard's steps 4-5.

```typescript
"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { actionError } from "@/lib/action-response";
import { requireAuth } from "@/lib/permissions/action-guards";
```

**Logic:**
1. `requireAuth()` guard
2. Get Clerk `userId` from `auth()`
3. **Resolve to internal DB user ID** — `AgentConnection.followerId`/`followingId` reference `Users.id` (internal), NOT Clerk user IDs:
   ```typescript
   const dbUser = await prismadb.users.findUnique({ where: { clerkUserId: userId } });
   if (!dbUser) return actionError("User not found");
   const internalUserId = dbUser.id;
   ```
4. Fetch all ACCEPTED `AgentConnection` records:
   ```typescript
   const connections = await prismadb.agentConnection.findMany({
     where: {
       OR: [
         { followerId: internalUserId, status: "ACCEPTED" },
         { followingId: internalUserId, status: "ACCEPTED" },
       ],
     },
   });
   ```
5. Extract connected user IDs (the OTHER user in each connection)
5. Batch-fetch users from Clerk: `(await clerkClient()).users.getUserList({ userId: connectedUserIds })`
6. For each user, fetch their org memberships: `(await clerkClient()).users.getOrganizationMembershipList({ userId })`
7. Classify:
   - **teammates**: users whose ONLY orgs have `publicMetadata.type === "personal"` (no agency membership)
   - **agencies**: for users with agency org membership, return one entry per agency org with: `{ connectionUserId, connectionName, connectionEmail, orgId, orgName, orgSlug, memberCount }`
8. Return `{ teammates, agencies }`

**Important:**
- Only return: name, email, avatar URL, org name, org slug, member count — no private org details
- Handle Clerk API pagination if user has many connections (batch in groups of 100)
- Filter out connections where the other user no longer exists in Clerk (deleted accounts)

- [ ] **Step 2: Create `finalize-organization-setup.ts`**

This server action handles Phase 2 of org creation (after Clerk org is created client-side).

```typescript
"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { z } from "zod";
```

**Input validation schema:**
```typescript
const wizardDataSchema = z.object({
  encryptionMode: z.enum(["STANDARD", "E2EE"]),
  dataOwnershipMode: z.enum(["AGENCY", "AGENT"]),
  teammates: z.array(z.object({
    email: z.string().email(),
    role: z.enum(["ADMIN", "AGENT", "VIEWER"]),
  })).max(50),
  partnerOrgIds: z.array(z.string().min(1)).max(20),
});
```

**Logic:**
1. `requireAuth()` guard
2. Get `userId` from `auth()`
3. Validate input with Zod schema
4. Verify caller is org owner via Clerk backend. Since Phase 1 just created the org, the caller should be the only member with `org:admin` role. Verify membership exists:
   ```typescript
   const clerk = await clerkClient();
   const memberships = await clerk.organizations.getOrganizationMembershipList({ organizationId: orgId });
   const callerMembership = memberships.data.find(m => m.publicUserData?.userId === userId);
   if (!callerMembership || callerMembership.role !== "org:admin") {
     return actionError("Not org owner", "FORBIDDEN");
   }
   ```
   Add code comment: `// orgId accepted from client because we verify caller is the org owner via Clerk backend — see spec security section`
5. Check per-user org creation quota. Note: the just-created org from Phase 1 is already in the membership list, so count includes it:
   ```typescript
   const userOrgs = await clerk.users.getOrganizationMembershipList({ userId });
   const agencyCount = userOrgs.data.filter(m =>
     (m.organization.publicMetadata as any)?.type === "agency"
   ).length;
   // Count already includes the org just created in Phase 1, so >= 5 means limit reached
   // (current org not yet marked as agency, so this checks pre-existing agencies)
   if (agencyCount >= 5) return actionError("Organization limit reached (max 5 agencies)", "FORBIDDEN");
   ```
6. Create OrganizationSettings (upsert):
   ```typescript
   await prismadb.organizationSettings.upsert({
     where: { organizationId: orgId },
     create: {
       organizationId: orgId,
       createdBy: userId,
       encryptionMode: validated.encryptionMode,
       dataOwnershipMode: validated.dataOwnershipMode,
       dataOwnershipSetAt: new Date(),
       dataOwnershipChangedBy: userId,
       policyVersion: 1,
       policyHistory: [{ mode: validated.dataOwnershipMode, from: new Date().toISOString(), to: null }],
     },
     update: {},
   });
   ```
7. Update Clerk metadata: `clerk.organizations.updateOrganization({ organizationId: orgId, publicMetadata: { type: "agency" } })`
8. Send invitations (best-effort, track successes/failures):
   ```typescript
   const inviteResults = await Promise.allSettled(
     validated.teammates.map(t =>
       clerk.organizations.createOrganizationInvitation({
         organizationId: orgId,
         emailAddress: t.email,
         role: `org:${t.role.toLowerCase()}`,
         inviterUserId: userId,
       })
     )
   );
   ```
9. Create partnership records (best-effort):
   ```typescript
   for (const partnerOrgId of validated.partnerOrgIds) {
     if (partnerOrgId === orgId) continue; // self-prevention
     const existing = await prismadb.orgNetworkPartner.findFirst({
       where: {
         OR: [
           { initiatorOrgId: orgId, partnerOrgId },
           { initiatorOrgId: partnerOrgId, partnerOrgId: orgId },
         ],
       },
     });
     if (!existing) {
       await prismadb.orgNetworkPartner.create({
         data: { initiatorOrgId: orgId, partnerOrgId, status: "PENDING" },
       });
     }
   }
   ```
10. If E2EE mode, initialize DEK (import from `lib/key-management.ts`)
11. Return result with warnings for partial failures

- [ ] **Step 3: Verify actions compile**

Run: `pnpm build`
Expected: No TypeScript errors in new action files.

- [ ] **Step 4: Commit**

```bash
git add actions/organization/finalize-organization-setup.ts actions/organization/get-connections-with-org-info.ts
git commit -m "feat(org): add server actions for org creation wizard (finalize setup + connection fetcher)"
```

---

## Task 4: Wizard Layout & Page Shell

**Files:**
- Create: `app/[locale]/app/(onboarding)/create-organization/layout.tsx`
- Create: `app/[locale]/app/(onboarding)/create-organization/page.tsx`

- [ ] **Step 1: Create layout.tsx**

Server component with auth guards. Follow the pattern from the onboarding layout (`app/[locale]/app/(onboarding)/onboard/layout.tsx`) but without the "redirect if onboarding completed + has orgId" check. Guards:
- Require `userId` → redirect to `/${locale}/app/sign-in`
- Sync user if not in DB (`getCurrentUserSafe` → `syncClerkUser`)
- Check `userStatus !== "INACTIVE"` → redirect to `/${locale}/app/inactive`
- Check onboarding completed (`getOnboardingStatus`) → redirect to `/${locale}/app/onboard` if not
- Render children in minimal chrome-free wrapper: `<div className="min-h-screen">{children}</div>`

- [ ] **Step 2: Create page.tsx**

Client component (`"use client"`) that renders the `CreateOrganizationWizard` component. Follow the onboarding page pattern:
```tsx
"use client";

import { CreateOrganizationWizard } from "./components/CreateOrganizationWizard";

export default function CreateOrganizationPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-background to-muted/20">
      <CreateOrganizationWizard />
    </div>
  );
}
```

- [ ] **Step 3: Verify route resolves**

Run: `pnpm dev`, navigate to `/en/app/create-organization` while logged in.
Expected: Page renders (even if wizard component doesn't exist yet — will show import error which confirms route works).

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/app/(onboarding)/create-organization/
git commit -m "feat(org): add create-organization route layout and page shell"
```

---

## Task 5: OrgInfoStep Component (Step 1)

**Files:**
- Create: `app/[locale]/app/(onboarding)/create-organization/components/OrgInfoStep.tsx`

- [ ] **Step 1: Create OrgInfoStep component**

Props interface:
```typescript
interface OrgInfoStepProps {
  data: { orgName: string; orgSlug: string };
  onDataChange: (data: { orgName: string; orgSlug: string }) => void;
  onValidationChange: (isValid: boolean) => void;
  dict: Record<string, any>; // translations from createOrganization.orgInfo namespace
}
```

**Features to implement:**
- Name input: text field, controlled via `data.orgName`
- Slug input: auto-generated from name via `generateOrgSlug()` (import from `types/onboarding.ts`), manually editable
- Track whether slug was manually edited (if yes, stop auto-generating)
- Debounced availability checks (500ms) using `useEffect` + `setTimeout`:
  - `/api/organization/check-name?name=${encodeURIComponent(name)}`
  - `/api/organization/check-slug?slug=${encodeURIComponent(slug)}`
- Availability state: `"idle" | "checking" | "available" | "taken" | "reserved" | "error"`
- Visual feedback: `Check` / `X` icons from lucide-react, green/red border colors
- Validation: name 2-50 chars, slug 2-50 lowercase alphanumeric + hyphens, both must be available
- Call `onValidationChange(true)` only when both name and slug are available + valid
- Framer Motion stagger animations on mount (match onboarding step pattern)

Reference the existing `UsernameOrgStep.tsx` for the debounce + availability check pattern — it does exactly this for username and org slug. Reuse the same approach.

- [ ] **Step 2: Verify component renders**

Temporarily import into page.tsx to confirm it renders. Remove after.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/app/(onboarding)/create-organization/components/OrgInfoStep.tsx
git commit -m "feat(org): add OrgInfoStep with name/slug validation and availability checks"
```

---

## Task 6: DataPolicyStep Component (Step 2)

**Files:**
- Create: `app/[locale]/app/(onboarding)/create-organization/components/DataPolicyStep.tsx`

- [ ] **Step 1: Create DataPolicyStep component**

Props:
```typescript
interface DataPolicyStepProps {
  data: { dataOwnershipMode: "AGENCY" | "AGENT" | null };
  onDataChange: (data: { dataOwnershipMode: "AGENCY" | "AGENT" }) => void;
  onValidationChange: (isValid: boolean) => void;
}
```

This is a thin wrapper that:
- Shows title + description using `createOrganization.dataPolicy` translations
- Renders the existing `DataOwnershipSelector` component from `@/components/data-ownership/DataOwnershipSelector`
- Passes the selected mode and onChange handler
- Calls `onValidationChange(mode !== null)` when selection changes
- Add Framer Motion entrance animation (match onboarding pattern)

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/app/(onboarding)/create-organization/components/DataPolicyStep.tsx
git commit -m "feat(org): add DataPolicyStep reusing DataOwnershipSelector"
```

---

## Task 7: EncryptionPolicyStep Component (Step 3)

**Files:**
- Create: `app/[locale]/app/(onboarding)/create-organization/components/EncryptionPolicyStep.tsx`

- [ ] **Step 1: Create EncryptionPolicyStep component**

Props:
```typescript
interface EncryptionPolicyStepProps {
  data: { encryptionMode: "STANDARD" | "E2EE" | null };
  onDataChange: (data: { encryptionMode: "STANDARD" | "E2EE" }) => void;
  onValidationChange: (isValid: boolean) => void;
}
```

**Features:**
- Two radio cards (same visual pattern as DataOwnershipSelector):
  - **Standard** — `Shield` icon from lucide-react, label from `createOrganization.encryption.standardTitle`
  - **Enhanced (E2EE)** — `ShieldCheck` icon, label from `createOrganization.encryption.enhancedTitle`
- When E2EE selected:
  - Check for existing PIN via the existing `useE2EE` hook (or check `/api/e2ee/identity`)
  - If no PIN exists: render `E2EEPinSetup` component inline (from `@/app/[locale]/app/(routes)/settings/security/components/E2EEPinSetup.tsx` — may need to extract to shared location)
  - If PIN exists: show confirmation text
  - Track PIN creation state: `pinReady: boolean`
- Validation: `onValidationChange(mode !== null && (mode === "STANDARD" || pinReady))`
- Framer Motion entrance + conditional expand animation for PIN setup section

Read the existing `E2EEPinSetup` component and `useE2EE` hook to understand the PIN creation flow and adapt accordingly. The PIN creation may need to be a standalone component importable from both settings and this wizard.

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/app/(onboarding)/create-organization/components/EncryptionPolicyStep.tsx
git commit -m "feat(org): add EncryptionPolicyStep with Standard/E2EE selection and PIN setup"
```

---

## Task 8: AddTeammatesStep Component (Step 4)

**Files:**
- Create: `app/[locale]/app/(onboarding)/create-organization/components/AddTeammatesStep.tsx`

- [ ] **Step 1: Create AddTeammatesStep component**

Props:
```typescript
interface AddTeammatesStepProps {
  data: {
    teammates: Array<{
      type: "connection" | "manual";
      userId?: string;
      email: string;
      name?: string;
      role: "ADMIN" | "AGENT" | "VIEWER";
    }>;
  };
  connectionsData: {
    teammates: Array<{ userId: string; name: string; email: string; avatarUrl?: string }>;
  } | null;
  isLoadingConnections: boolean;
  onDataChange: (data: { teammates: AddTeammatesStepProps["data"]["teammates"] }) => void;
  onValidationChange: (isValid: boolean) => void;
}
```

**Two sections:**

**Personal Connections section** (only if `connectionsData?.teammates.length > 0`):
- Selectable cards with checkbox, avatar, name, role dropdown (`Select` from shadcn/ui)
- Default role: `"AGENT"`
- Toggle selection adds/removes from teammates array with `type: "connection"`

**Manual Invite section** (always shown):
- Rows of: email `Input` + role `Select` + remove button
- "Add another" button appends empty row
- Email format validation (basic regex or Zod `.email()`)
- Deduplication: check against both other manual entries and selected connections
- On invalid email: show inline error, `onValidationChange(false)`

**Validation:** Always valid (step is skippable). Only invalid if a manual entry has a malformed email.

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/app/(onboarding)/create-organization/components/AddTeammatesStep.tsx
git commit -m "feat(org): add AddTeammatesStep with connection selection and manual email invite"
```

---

## Task 9: EstablishPartnershipsStep Component (Step 5)

**Files:**
- Create: `app/[locale]/app/(onboarding)/create-organization/components/EstablishPartnershipsStep.tsx`

- [ ] **Step 1: Create EstablishPartnershipsStep component**

Props:
```typescript
interface EstablishPartnershipsStepProps {
  data: { partnerOrgIds: string[] };
  connectionsData: {
    agencies: Array<{
      connectionUserId: string;
      connectionName: string;
      orgId: string;
      orgName: string;
      orgSlug: string;
      memberCount: number;
    }>;
  } | null;
  isLoadingConnections: boolean;
  onDataChange: (data: { partnerOrgIds: string[] }) => void;
}
```

**Features:**
- Group agency entries by `orgId` (deduplicate — a user in multiple connections to same agency should show once)
- Display as selectable cards:
  - Agency name (bold), slug (muted), member count badge
  - "Your contact: {connectionName}" subtitle
  - Checkbox for selection
- Toggle selection adds/removes orgId from `partnerOrgIds` array
- Empty state: message from `createOrganization.partnerships.emptyState`
- Loading state: skeleton cards while `isLoadingConnections`
- No validation — step is always skippable

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/app/(onboarding)/create-organization/components/EstablishPartnershipsStep.tsx
git commit -m "feat(org): add EstablishPartnershipsStep with agency connection cards"
```

---

## Task 10: ReviewStep Component (Step 6)

**Files:**
- Create: `app/[locale]/app/(onboarding)/create-organization/components/ReviewStep.tsx`

- [ ] **Step 1: Create ReviewStep component**

Props:
```typescript
interface ReviewStepProps {
  data: CreateOrgWizardData;
  isCreating: boolean;
  onCreateOrganization: () => void;
}
```

**Layout:** Card-based summary using shadcn `Card` components:
- **Organization** card: Name + slug, Building2 icon
- **Data Policy** card: Mode name + icon (Building2 for AGENCY, UserCircle for AGENT)
- **Encryption** card: Mode name + icon (Shield for STANDARD, ShieldCheck for E2EE)
- **Teammates** card: Count + list of names/emails with role badges. "None — you can add later" if empty.
- **Partnerships** card: Count + list of agency names. "None — you can establish later" if empty.
- **Create button**: `Button` with loading spinner when `isCreating`. Text: "Create Organization" / "Creating your agency..."
- All labels from `createOrganization.review` translations

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/app/(onboarding)/create-organization/components/ReviewStep.tsx
git commit -m "feat(org): add ReviewStep with summary cards and create button"
```

---

## Task 11: CreateOrganizationWizard Orchestrator

**Files:**
- Create: `app/[locale]/app/(onboarding)/create-organization/components/CreateOrganizationWizard.tsx`

- [ ] **Step 1: Create wizard orchestrator**

This is the main component. Reference `OnboardingSteps.tsx` for animation patterns.

**State:**
```typescript
const [currentStep, setCurrentStep] = useState(0);
const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
const [wizardData, setWizardData] = useState<CreateOrgWizardData>(defaultData);
const [stepValid, setStepValid] = useState(false);
const [isCreating, setIsCreating] = useState(false);
const [connectionsData, setConnectionsData] = useState(null);
const [isLoadingConnections, setIsLoadingConnections] = useState(false);
```

**Key features:**
- 6 steps: OrgInfo → DataPolicy → EncryptionPolicy → AddTeammates → EstablishPartnerships → Review
- Navigation: Back (not on step 0), Next (steps 0-2 require validation, steps 3-4 always allow), Skip (steps 3-4)
- Progress bar matching onboarding style
- Framer Motion `AnimatePresence` with slide variants (direction-aware) — import from `motion/react`
- `sessionStorage` persistence: save on every state change, restore on mount, clear on success
- `beforeunload` listener when data is non-default
- Connection data fetching: trigger `getConnectionsWithOrgInfo()` lazily when reaching step 3 (prefetch for steps 4-5)
- **Orphan detection on mount**: Check if the user has any Clerk orgs without corresponding `OrganizationSettings` records (Phase 1 completed but Phase 2 failed). If found, offer to resume setup (pre-fill wizard with org name/slug from the orphan) or delete the orphan org via Clerk API. Implement as a `useEffect` on mount that calls a lightweight server action to cross-check Clerk orgs vs Prisma settings.

**Creation flow (called from ReviewStep's onCreateOrganization):**
```typescript
async function handleCreateOrganization() {
  setIsCreating(true);
  try {
    // Phase 1: Client-side Clerk
    const org = await createOrganization({ name: wizardData.orgName, slug: wizardData.orgSlug });
    await setActive({ organization: org.id });

    // Phase 2: Server action
    const result = await finalizeOrganizationSetup(org.id, {
      encryptionMode: wizardData.encryptionMode!,
      dataOwnershipMode: wizardData.dataOwnershipMode!,
      teammates: wizardData.teammates.map(t => ({ email: t.email, role: t.role })),
      partnerOrgIds: wizardData.partnerOrgIds,
    });

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    // Clear sessionStorage
    sessionStorage.removeItem(STORAGE_KEY);

    // Show warnings for partial failures
    if (result.data?.warnings?.length) {
      result.data.warnings.forEach(w => toast.warning(w));
    } else {
      toast.success(t("review.success"));
    }

    // Redirect to dashboard
    router.push(`/${locale}/app`);
  } catch (error) {
    toast.error(t("review.error"));
  } finally {
    setIsCreating(false);
  }
}
```

- [ ] **Step 2: Wire up page.tsx to import the wizard**

Update `page.tsx` to properly import and render `CreateOrganizationWizard`.

- [ ] **Step 3: Manual smoke test**

Run: `pnpm dev`, navigate to `/en/app/create-organization`.
Verify: All 6 steps render, navigation works, animations play, sessionStorage persists on refresh.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/app/(onboarding)/create-organization/
git commit -m "feat(org): add CreateOrganizationWizard orchestrator with 6-step flow"
```

---

## Task 12: Onboarding Type Changes

**Files:**
- Modify: `types/onboarding.ts`

- [ ] **Step 1: Remove org fields from OnboardingData**

In `types/onboarding.ts`:
- Remove `OnboardingOrgData` interface (the `{ name: string; slug: string }` type)
- Remove `organization` field from `OnboardingData` interface
- Remove any `generateOrgSlug()` references that are ONLY used by the org field (keep the function itself — it's reused by the wizard)
- Update `UsernameOrgStepData` → rename to `UsernameStepData`, remove `orgName` and `orgSlug` fields

- [ ] **Step 2: Verify no broken imports**

Run: `pnpm build`
Expected: TypeScript errors in OnboardingSteps.tsx, UsernameOrgStep.tsx, ReviewStep.tsx (expected — they still reference old types). These will be fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add types/onboarding.ts
git commit -m "refactor(types): remove org fields from OnboardingData"
```

---

## Task 13: Slim Onboarding — New Step Components

**Files:**
- Create: `app/[locale]/app/(onboarding)/onboard/components/UsernameStep.tsx`
- Create: `app/[locale]/app/(onboarding)/onboard/components/NotificationsStep.tsx`

- [ ] **Step 1: Create UsernameStep.tsx**

Copy `UsernameOrgStep.tsx` as starting point, then:
- Rename component to `UsernameStep`
- Remove all org-related fields: orgName input, orgSlug input, org availability checks
- Remove org-related state: `orgNameAvailable`, `orgSlugAvailable`, `isOrgSlugManuallyEdited`
- Remove org-related callbacks from `useEffect` debounce checks
- Keep: firstName, lastName, username fields with availability check
- Update props type to use `UsernameStepData` (firstName, lastName, username only)
- Update validation: only validate username (not org slug)

- [ ] **Step 2: Create NotificationsStep.tsx**

Merge `NotificationsWhatStep.tsx` and `NotificationsHowStep.tsx`:
- **Top section**: "What to notify about" — 5 toggle cards (tasks, calendar, deals, team activity, documents) from NotificationsWhatStep
- **Divider**
- **Bottom section**: "How to receive notifications" — email + in-app toggles from NotificationsHowStep
- Single scrollable step with `space-y-8` between sections
- Same props interface combining both: `onDataChange` receives the full notification preferences object
- Framer Motion stagger on mount

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/app/(onboarding)/onboard/components/UsernameStep.tsx app/[locale]/app/(onboarding)/onboard/components/NotificationsStep.tsx
git commit -m "feat(onboarding): add UsernameStep (no org) and merged NotificationsStep"
```

---

## Task 14: Slim Onboarding — Orchestrator & Review Update

**Files:**
- Modify: `app/[locale]/app/(onboarding)/onboard/components/OnboardingSteps.tsx`
- Modify: `app/[locale]/app/(onboarding)/onboard/components/ReviewStep.tsx`

- [ ] **Step 1: Update OnboardingSteps.tsx**

This is the largest change. Work through systematically:

1. **Update TOTAL_STEPS**: `9` → `7`
2. **Update `onboardingData` initial state**: Remove `organization: { name: "", slug: "" }`
3. **Update step rendering** (`renderStep` switch):
   - Step 0: Language (unchanged)
   - Step 1: Welcome (unchanged)
   - Step 2: Theme (unchanged)
   - Step 3: Change from `UsernameOrgStep` → `UsernameStep` (new import)
   - Step 4: Change from `DataOwnershipStep` → `NotificationsStep` (merged, new import)
   - Step 5: `PrivacyStep` (was step 7, renumbered)
   - Step 6: `ReviewStep` (was step 8, renumbered)
   - Delete cases for old steps 4 (DataOwnership), 5 (NotificationsWhat), 6 (NotificationsHow)
4. **Update `canProceed` function**: Remove step 4 (DataOwnership) case, adjust step numbers
5. **Update `handleComplete` function** (the big one):
   - **KEEP** all personal workspace creation logic (lines ~442-474 approximately) — `ensurePersonalWorkspace()`, `setActive({ organization: personalOrgId })`, personal workspace metadata update. This is critical — do NOT accidentally remove it.
   - **REMOVE** agency org creation logic (lines ~476-539 approximately) — `createOrganization` for agency, `updateOrganizationMetadata` for agency, `OrganizationSettings` upsert for agency
   - **REMOVE** `setOwnershipMode()` call (line ~554)
   - Keep `completeOnboarding()` server action call
   - Redirect to `/${locale}/app` (personal workspace dashboard)
   - Also review `actions/user/complete-onboarding.ts` — if it contains any agency org references, remove them (currently it does NOT create orgs, but verify).
6. **Remove debug logging**: Delete all `fetch('http://127.0.0.1:7242/ingest/...')` calls
7. **Update imports**: Remove old step imports, add new ones
8. **Update `handleUsernameOrgChange`** → `handleUsernameChange`: Remove org data handling
9. **Update progress bar**: Adjust calculation for 7 steps (exclude language step = 6 visible)

- [ ] **Step 2: Update ReviewStep.tsx**

In the onboarding ReviewStep:
- Remove the "Organization" section from the `sections` array (was showing orgName + orgSlug)
- Remove the "Data Ownership" section
- Update step count references if any
- Keep: Profile, Preferences (notifications), Privacy sections

- [ ] **Step 3: Delete old step files**

```bash
rm app/[locale]/app/(onboarding)/onboard/components/DataOwnershipStep.tsx
rm app/[locale]/app/(onboarding)/onboard/components/NotificationsWhatStep.tsx
rm app/[locale]/app/(onboarding)/onboard/components/NotificationsHowStep.tsx
rm app/[locale]/app/(onboarding)/onboard/components/UsernameOrgStep.tsx
```

- [ ] **Step 4: Update onboarding translations**

In `locales/en/onboarding.json` and `locales/el/onboarding.json`:
- Remove org-related keys under `usernameOrg` (keep username keys, rename section)
- Remove `dataOwnership` step keys
- Merge notification step keys into single `notifications` section
- Update `review` section to remove org references

- [ ] **Step 5: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 6: Manual smoke test**

Run: `pnpm dev`
Test the onboarding flow (may need a fresh user or clear onboarding state):
- Confirm 7 steps (Language → Welcome → Theme → Username → Notifications → Privacy → Review)
- Confirm no org fields appear
- Confirm notifications step shows both What + How sections
- Confirm review does not show organization or data ownership
- Confirm completion lands in personal workspace

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(onboarding): slim from 9 to 7 steps, remove org creation from onboarding flow"
```

---

## Task 15: End-to-End Integration Test

**Files:**
- No new files — manual verification

- [ ] **Step 1: Test full onboarding → personal workspace flow**

1. Create new test user (or clear onboarding state)
2. Complete slimmed onboarding (7 steps)
3. Verify landing in personal workspace dashboard
4. Verify "Create Organization" button visible in sidebar switcher

- [ ] **Step 2: Test full org creation wizard flow**

1. Click "Create Organization" from switcher
2. Step 1: Enter org name, verify slug auto-generates, verify availability check
3. Step 2: Select AGENCY ownership mode
4. Step 3: Select Standard encryption
5. Step 4: Skip (or add manual email invite)
6. Step 5: Skip
7. Step 6: Review, click "Create Organization"
8. Verify redirect to new org's dashboard
9. Verify org appears in switcher

- [ ] **Step 3: Test sessionStorage persistence**

1. Start wizard, fill in steps 1-3
2. Refresh browser
3. Verify wizard restores state from sessionStorage
4. Complete wizard
5. Verify sessionStorage is cleared after creation

- [ ] **Step 4: Test E2EE flow (if applicable)**

1. Start wizard, reach step 3
2. Select Enhanced (E2EE)
3. Verify PIN setup appears if no PIN exists
4. Create PIN, verify "Next" becomes enabled

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: Clean build, no errors.

- [ ] **Step 6: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: integration fixes for org creation wizard and slimmed onboarding"
```

---

## Task 16: Documentation Updates

**Files:**
- Modify: `docs/setup/clerk-setup.md`
- Modify: `docs/architecture/authentication.md` (if exists)

- [ ] **Step 1: Update Clerk setup docs**

Update any references to post-signup redirecting to `/create-organization`. The new flow is: post-signup → `/app/onboard` → personal workspace → create org from switcher.

- [ ] **Step 2: Update architecture docs**

If `docs/architecture/authentication.md` references the old org creation flow, update to reflect the new two-phase approach.

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: update auth and setup docs for new org creation flow"
```
