# Demo Sandbox & Onboarding Tour — Design Spec

**Date:** 2026-05-15  
**Status:** Approved  
**Branch target:** staging

---

## Overview

After a user completes profile onboarding, they are placed into a pre-seeded demo organisation and guided through an interactive tour built with Driver.js. The tour covers three topic areas: orientation, editing/linking entities, and importing. The demo sandbox persists after the tour for free exploration. A sticky `DemoBanner` surfaces the "Create my agency" CTA at all times.

---

## Goals

- Reduce time-to-value for new users by showing the real UI with realistic data before they commit to setting up an org.
- Teach the three core actions (navigating, editing/linking, importing) through a mix of observational and action-required tour steps.
- Keep the demo sandbox alive after the tour so users can explore freely before converting.
- Guard destructive writes in demo mode to preserve sandbox data integrity.

---

## Non-Goals

- No A/B test infrastructure — tour is shown to all new users unconditionally.
- No analytics instrumentation in this spec (PostHog events can be layered on later).
- No per-step undo / replay — the tour is linear with a skip option.
- The "Create my agency" flow is not modified — it is the existing `create-organization` wizard.

---

## Architecture & Data Flow

```
Profile Onboarding Complete
         │
         ▼
complete-onboarding.ts action
         │
         ├─► Promise.all:
         │     ├─ Update Clerk user profile (existing)
         │     └─ Create Clerk demo org (isDemo: true, demoSeededAt: ISO timestamp)
         │
         ├─► seedDemoOrg(orgId, userId, locale)   ← new, runs after org exists
         │
         └─► Set user publicMetadata:
               onboardingCompleted: true
               demoOrgId: <org_id>
               tourStep: 0
         │
         ▼
Redirect → /{locale}/app   (active org = demo org)
         │
         ▼
app/[locale]/app/(routes)/layout.tsx
         │
         └─ DemoModeProvider
              ├─ DemoBanner      (sticky, below top nav)
              └─ TourController  (mounts Driver.js, manages step state)
```

**Key principles:**

1. The demo org is a real Clerk org and a real DB org. All reads use existing SWR hooks, real API routes, and real per-org encryption — no fake data layer.
2. Write simulation lives at the API layer. Guarded routes check `org.publicMetadata.isDemo` and return a mock success payload. The UI sees a normal `200`.
3. Tour state is stored in Clerk `publicMetadata.tourStep` (integer). Survives page refresh, back navigation, and tab reload with no DB table or localStorage.
4. `DemoModeProvider` is a no-op when the active org has `isDemo !== true`. Zero overhead for real orgs.

---

## Section 1: Demo Org Creation

### Trigger

Inside `actions/user/complete-onboarding.ts`, after all existing validation passes, add a `createDemoOrgAndSeed()` helper that runs as part of the same request.

### Clerk org

```typescript
const demoOrg = await clerkClient.organizations.createOrganization({
  name: "Demo Agency",           // locale-aware: "Demo Οργανισμός" for el
  createdBy: userId,
  publicMetadata: {
    isDemo: true,
    demoSeededAt: new Date().toISOString(),
  },
});

await clerkClient.users.updateUser(userId, {
  publicMetadata: {
    ...existingMeta,
    onboardingCompleted: true,
    demoOrgId: demoOrg.id,
    tourStep: 0,
  },
});
```

### Parallelisation

The Clerk user profile update and the Clerk org creation run concurrently via `Promise.all`. The Prisma seed inserts run after both resolve (they need `orgId` and the DEK must be initialised first).

### Schema addition

Add `isDemo Boolean @default(false)` to the `Organization` model in `prisma/schema.prisma`. This mirrors the Clerk `publicMetadata.isDemo` flag server-side so the cleanup cron can query stale demo orgs without hitting the Clerk API per-row.

Migration name: `add_is_demo_to_organization`

---

## Section 2: Demo Org Seeding

### Module

**`lib/demo/seed-demo-org.ts`** — exports `seedDemoOrg(orgId: string, userId: string, locale: string): Promise<void>`.

All inserts run inside a single `prismadb.$transaction()` to keep the seed atomic. If any insert fails, nothing is left in a partial state.

Encryption uses the existing `encryptClientForOrg(data, orgId)` and `encryptPropertyForOrg(data, orgId)` from `lib/model-encryption.ts` — the org DEK is created as part of org setup before `seedDemoOrg` is called.

### Seeded entities

| Entity | Count | Notes |
|---|---|---|
| Contacts | 8 | Mix of BUYER / SELLER / INVESTOR types; realistic Greek names for `el`, English for `en`; encrypted phone + email on all; 2 linked as referrals via a `ContactRelationship` row |
| Properties | 7 | Athens neighbourhoods (Kolonaki, Glyfada, Piraeus, Kifissia, Pagkrati, Marousi, Thessaloniki); mix of APARTMENT / HOUSE / COMMERCIAL; price + sqm + bedrooms set; stub image URL |
| Requests | 3 | Demand-side (2 BUYER, 1 RENTER); linked to contacts; budget + area criteria populated so matchmaking scores render |
| Messages | 10 | Oikosync feed; authored as the seeded user; mix of team-style commentary, 2 with file attachments (stubs), 3 with reactions |
| Documents | 4 | 2 on properties (Energy Certificate, Floor Plan), 2 on contacts (Client Agreement, ID Copy); stub file URLs; `systemType` set correctly |
| Comments | 6 | 2 per document; written as agent review commentary |

### Performance target

Under 3 seconds total (org creation + DEK init + all inserts). The transaction is batched — no N+1 individual calls.

---

## Section 3: Tour Library & Step Definitions

### Library

**`driver.js` v1.x** — installed as a production dependency. Operates directly on the real DOM via CSS class/ID selectors. No React-specific wrapper needed. Supports `onNextClick` / `onPrevClick` hooks for action-gating.

### Step config

**`lib/demo/tour-steps.ts`** — exports `getTourSteps(locale: string): TourStep[]`. Returns locale-aware popover text for all 12 steps.

### Tour chapters

#### Chapter 1 — Orientation (steps 1–3, observational)

| Step | Selector | Popover content |
|---|---|---|
| 1 | `[data-tour="sidebar-nav"]` | "This is your command centre. CRM, MLS, messages, and documents — all in one place." |
| 2 | `[data-tour="oikosync-feed"]` | "Your team's live activity feed. Messages, updates, property pins, and reactions appear here in real time." |
| 3 | `[data-tour="first-message"]` | "Your demo workspace already has team activity. Click any message to expand it." |

#### Chapter 2 — Editing & Linking Entities (steps 4–7, mixed)

| Step | Selector | Interactivity |
|---|---|---|
| 4 | `[data-tour="crm-nav"]` | Observational — explain contacts module |
| 5 | `[data-tour="first-contact-row"]` | **Action-required** — Next disabled until user clicks the contact open |
| 6 | `[data-tour="contact-edit-btn"]` | **Action-required** — Next disabled until user clicks Edit and the edit panel opens |
| 7 | `[data-tour="link-entity-btn"]` | Observational — explain cross-entity linking, Next proceeds freely |

#### Chapter 3 — Importing (steps 8–10, mixed)

| Step | Selector | Interactivity |
|---|---|---|
| 8 | `[data-tour="import-nav"]` | Observational — "Bulk-import contacts or properties from a CSV." |
| 9 | `[data-tour="import-upload-zone"]` | **Action-required** — Next disabled until user clicks "Choose file" or the file input receives a file |
| 10 | `[data-tour="import-execute-btn"]` | User clicks → demo guard intercepts → mock success shown → tour auto-advances |

#### Chapter 4 — Create Your Organisation (steps 11–12, CTA)

| Step | Selector | Interactivity |
|---|---|---|
| 11 | `[data-tour="demo-banner-cta"]` | Spotlight the DemoBanner CTA. "When you're ready, create your real agency and import your actual data." |
| 12 | No target (full-screen popover) | Completion overlay — two CTAs: "Create my agency" and "Keep exploring" |

### Action-required gating

```typescript
const completedActions = new Set<number>();

driver.setConfig({
  onNextClick: () => {
    const step = driver.getActiveIndex();
    if (ACTION_REQUIRED_STEPS.includes(step) && !completedActions.has(step)) {
      // visually shake the Next button — CSS animation class toggle
      return;
    }
    driver.moveNext();
  },
});
```

`ACTION_REQUIRED_STEPS = [4, 5, 8]` (0-indexed; steps in the table above are 1-indexed for readability — implementation uses 0-indexed throughout). `completedActions` is populated by event listeners:

- Contact row click → `markActionComplete(4)`
- Edit panel opens → `markActionComplete(5)`
- File input `change` event → `markActionComplete(8)`

### `data-tour` attribute placement

All target selectors use `data-tour` attributes added to existing components — no structural changes to layouts. This decouples the tour config from component internals and makes selectors refactor-proof.

---

## Section 4: Demo Mode Context & Write Simulation

### `DemoModeProvider`

**`components/demo/DemoModeProvider.tsx`** — client component wrapping `(routes)/layout.tsx`. Reads `org.publicMetadata.isDemo` via `useOrganization()` from Clerk. When `isDemo` is false, renders children unchanged.

```typescript
interface DemoModeContext {
  isDemoMode: boolean;
  tourStep: number;           // -1 = completed / skipped
  advanceTour: () => void;    // PATCH /api/user/tour-progress
  completeTour: () => void;
  skipTour: () => void;
  markActionComplete: (step: number) => void;
}
```

### `TourController`

**`components/demo/TourController.tsx`** — client component, mounted inside `DemoModeProvider` when `isDemoMode === true`. Initialises Driver.js on mount (`useEffect` with no SSR), reads `tourStep` from context, and calls `driver.drive(tourStep)` to resume at the correct step after navigation.

Destroys and reinitialises Driver.js on route change (via `usePathname`) so that step targets are always present in the current page's DOM before highlighting begins.

### `DemoBanner`

**`components/demo/DemoBanner.tsx`** — sticky bar positioned below the top nav (`top: <nav-height>`). Uses `data-tour="demo-banner-cta"` on the CTA button for step 11 targeting.

```
┌─────────────────────────────────────────────────────────────┐
│  Demo workspace  ·  You're exploring a pre-loaded sandbox.  │  [Create my agency →]  │
└─────────────────────────────────────────────────────────────┘
```

After tour completion or skip, banner text changes to: "Demo workspace — " (shorter, less prominent).

### Tour progress API

**`app/api/user/tour-progress/route.ts`** — `PATCH` only.

```typescript
// Body: { step: number }
// Updates publicMetadata.tourStep on the authed Clerk user.
// No DB write needed.
```

Called on every step advance, on skip, and on complete.

### Write simulation — guarded routes

**`lib/demo/demo-guard.ts`** — exports `isDemoOrg(orgId: string): Promise<boolean>`. Reads Clerk org `publicMetadata.isDemo`. Result is not cached (Clerk SDK handles its own caching).

Three routes guarded:

| Route | Real behaviour | Demo response |
|---|---|---|
| `POST /api/import/execute` | Full import pipeline | `{ success: true, imported: 12, skipped: 0, errors: [] }` |
| `POST /api/organizations` | Creates Clerk org + DB row | `{ success: true, orgId: "demo_preview" }` — no real creation |
| `DELETE /api/[entity]/[id]` (all entity types) | Hard/soft delete | `{ success: true }` — no DB write, preserves sandbox data |

All other routes (edits to seeded entities, message sends, reactions) are real writes and are encouraged — they make the sandbox feel personal and alive.

---

## Section 5: Post-Tour UX & Cleanup

### Tour completion overlay (step 12)

Full-screen Driver.js popover with no target element. Two actions:

- **"Create my agency"** — sets `tourStep: -1` via `completeTour()`, then navigates to `/{locale}/app/create-organization`.
- **"Keep exploring"** — sets `tourStep: -1` via `completeTour()`, dismisses overlay. `DemoBanner` remains. User browses freely.

### Tour skip

A "Skip tour" link is visible in the Driver.js progress footer from step 1 onwards. Calls `skipTour()` → sets `tourStep: -1` → dismisses Driver.js immediately. Banner persists.

### Demo org persistence

After tour completion, the demo org remains the user's active org until they either:
1. Create a real org via `create-organization` (Clerk org switcher then shows both).
2. Are purged by the cleanup cron (30 days of inactivity).

The demo org is excluded from cross-org matchmaking. `lib/matchmaking/get-matches.ts` gains an `isDemo` guard that filters out demo orgs from `CrossOrgMatch` queries.

### Cleanup cron

**`app/api/cron/cleanup-demo-orgs/route.ts`** — `GET` handler protected by `CRON_SECRET` header check (Vercel Cron standard pattern).

Schedule: `0 3 * * *` (3am UTC daily). Configured in `vercel.json`.

Logic:
1. Query `prismadb.organization.findMany({ where: { isDemo: true, createdAt: { lt: thirtyDaysAgo } } })`.
2. For each stale org: `prismadb.organization.delete({ where: { id } })` — Prisma cascades handle all seeded child rows.
3. Call `clerkClient.organizations.deleteOrganization({ organizationId: orgId })`.
4. Log count of purged orgs.

The user's `publicMetadata.demoOrgId` becomes stale after purge. This is harmless — middleware already handles the case where `orgId` is set but the org no longer exists.

---

## Files

### New files

| Path | Purpose |
|---|---|
| `lib/demo/seed-demo-org.ts` | Seeds all demo entities for a new demo org |
| `lib/demo/tour-steps.ts` | Locale-aware Driver.js step configuration (12 steps) |
| `lib/demo/demo-guard.ts` | `isDemoOrg()` helper for guarded API routes |
| `components/demo/DemoModeProvider.tsx` | React context provider + Driver.js initialisation |
| `components/demo/DemoBanner.tsx` | Sticky demo mode banner with CTA |
| `components/demo/TourController.tsx` | Mounts and drives the Driver.js tour |
| `app/api/user/tour-progress/route.ts` | `PATCH` — updates `publicMetadata.tourStep` |
| `app/api/cron/cleanup-demo-orgs/route.ts` | Daily stale demo org purge cron |

### Modified files

| Path | Change |
|---|---|
| `actions/user/complete-onboarding.ts` | Add `createDemoOrgAndSeed()` call after profile creation |
| `app/[locale]/app/(routes)/layout.tsx` | Wrap children with `DemoModeProvider` |
| `app/api/import/execute/route.ts` | Add `isDemoOrg` guard returning mock success |
| `app/api/organizations/route.ts` | Add `isDemoOrg` guard on `POST` |
| `app/api/[entity routes with DELETE]` | Add `isDemoOrg` guard on all entity DELETE handlers |
| `prisma/schema.prisma` | `isDemo Boolean @default(false)` on `Organization` model |
| `lib/matchmaking/get-matches.ts` | Exclude demo orgs from cross-org match queries |

### Dependencies added

| Package | Why |
|---|---|
| `driver.js` | Tour overlay library (production dependency) |

---

## Open Questions

- **Demo org name localisation**: "Demo Agency" (en) / "Demo Οργανισμός" (el) — confirm naming with product.
- **Seed data names**: Should contacts use fictional Greek names (e.g. Νίκος Παπαδόπουλος) or generic placeholders? Fictional names are more realistic; confirm.
- **Tour restart**: Should users be able to restart the tour after completing it? (Not in scope for this spec — can be added as a settings toggle later.)
