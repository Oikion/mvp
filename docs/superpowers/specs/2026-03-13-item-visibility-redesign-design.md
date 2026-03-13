# Item Visibility Redesign — HIDDEN + PERSONAL→PRIVATE Rename

**Date:** 2026-03-13
**Status:** Approved
**Scope:** Schema migration, matchmaking/analytics filtering, UI selector, 51-file rename

---

## Problem

The current `ItemVisibility` enum (`PERSONAL`, `SECURE`, `PUBLIC`) has no way to exclude an item from automated systems (matchmaking, analytics, cross-org matching) while keeping it browsable in org lists. Users need an opt-out mechanism — e.g. a mandate that should not appear in match scoring or dashboard analytics.

Additionally, the label "PERSONAL" is ambiguous. "PRIVATE" better communicates "agency-only" semantics.

## Solution

Redesign the `ItemVisibility` enum from 3 to 4 values, with a rename:

```
enum ItemVisibility {
  HIDDEN    — New: excluded from all automated systems, still browsable in org
  PRIVATE   — Renamed from PERSONAL: agency-only, participates in matching
  SECURE    — Unchanged: shared within app (bilateral + Polis)
  PUBLIC    — Unchanged: shared + can be showcased on public profile
}
```

### Visibility Matrix

| Value | Browsable in org | Matching/Analytics | Polis/Network sharing | Public Showcase |
|-------|------------------|--------------------|-----------------------|-----------------|
| HIDDEN | Yes | No | No | No |
| PRIVATE | Yes | Yes | No | No |
| SECURE | Yes | Yes | Yes | No |
| PUBLIC | Yes | Yes | Yes | Yes |

### Default

Remains `PRIVATE` (previously `PERSONAL`) for all entities (Property, Client, Mandate).

---

## Affected Entities

### ItemVisibility (items — get HIDDEN + rename)

- **Property** — `prisma/schema.prisma` (line ~713)
- **Client** — `prisma/schema.prisma` (line ~279)
- **Mandate** — `prisma/schema.prisma` (line ~1625)

### ProfileVisibility (profiles — rename only, no HIDDEN)

- **AgentProfile** — `prisma/schema.prisma` (line ~42)
- **AgencyProfile** — `prisma/schema.prisma` (line ~2971)

`ProfileVisibility` is a **separate enum** from `ItemVisibility`. It also has `PERSONAL` which must be renamed to `PRIVATE` for consistency. However, `HIDDEN` is **not** added to `ProfileVisibility` — profiles don't participate in matchmaking/analytics, so the opt-out concept doesn't apply.

All defaults change from `@default(PERSONAL)` to `@default(PRIVATE)` in both enums.

---

## Database Migration

Single migration performing:

1. Add `HIDDEN` value to the `ItemVisibility` PostgreSQL enum
2. Rename `PERSONAL` → `PRIVATE` in **both** enums:
   - `UPDATE "Property" SET visibility = 'PRIVATE' WHERE visibility = 'PERSONAL'`
   - `UPDATE "Client" SET visibility = 'PRIVATE' WHERE visibility = 'PERSONAL'`
   - `UPDATE "Mandate" SET visibility = 'PRIVATE' WHERE visibility = 'PERSONAL'`
   - `ALTER TYPE "ItemVisibility" RENAME VALUE 'PERSONAL' TO 'PRIVATE'`
   - `UPDATE "AgentProfile" SET visibility = 'PRIVATE' WHERE visibility = 'PERSONAL'`
   - `UPDATE "AgencyProfile" SET visibility = 'PRIVATE' WHERE visibility = 'PERSONAL'`
   - `ALTER TYPE "ProfileVisibility" RENAME VALUE 'PERSONAL' TO 'PRIVATE'`

**Note:** `ALTER TYPE ... RENAME VALUE` is supported in PostgreSQL 10+. Prisma Postgres (used in production) supports this.

**Important:** `HIDDEN` is only added to `ItemVisibility`, not `ProfileVisibility`. Profiles don't participate in automated matching systems.

---

## Matchmaking & Analytics Filtering

HIDDEN items must be excluded from all automated processing. Changes needed:

### `actions/matchmaking/get-mandate-matches.ts`

Add `visibility: { not: "HIDDEN" }` to both:
- `fetchActiveMandates()` query (line ~106)
- `fetchActiveProperties()` query

### `actions/matchmaking/get-match-analytics.ts`

This file is fully stubbed — `getMatchAnalytics()` returns `getEmptyAnalytics()` with no database queries. No changes needed.

### `actions/network/compute-cross-org-matches.ts`

Already filters `visibility: { in: ["SECURE", "PUBLIC"] }` — HIDDEN is naturally excluded. No change needed.

### `actions/network/get-my-network-items.ts`

Already filters `visibility: { in: ["SECURE", "PUBLIC"] }` — HIDDEN naturally excluded. No change needed.

### Cross-Org Match Cleanup on Visibility Change

When a user changes an item's visibility to `HIDDEN` or `PRIVATE`, any existing `CrossOrgMatch` rows referencing that item must be deleted immediately — otherwise stale matches persist until the next cron recompute (up to 24h).

Add to each visibility update action:
- `actions/mls/update-property-visibility.ts` — after updating visibility, if new value is `HIDDEN` or `PRIVATE`: `prismadb.crossOrgMatch.deleteMany({ where: { propertyId } })`
- `actions/mandates/update-mandate-visibility.ts` — same: `prismadb.crossOrgMatch.deleteMany({ where: { mandateId } })`
- `actions/crm/update-client-visibility.ts` — clients don't participate in cross-org matching, no cleanup needed

### Dashboard (MatchmakingDashboard.tsx)

No change needed — the dashboard displays whatever the server actions return. Filtering at the query level is sufficient.

---

## UI — ItemVisibilitySelector

**File:** `components/ItemVisibilitySelector.tsx`

### Changes

The slider expands from 3 stops (0–2) to 4 stops (0–3):

| Position | Value | Icon | Color | Description |
|----------|-------|------|-------|-------------|
| 0 | HIDDEN | `EyeOff` | muted/gray | Hidden from all systems |
| 1 | PRIVATE | `Lock` | gray | Only you and your org |
| 2 | SECURE | `Shield` | blue | App users & network peers |
| 3 | PUBLIC | `Globe` | green/primary | Everyone, shown on profile |

Specific math changes:
- `INDEX` map: `{ HIDDEN: 0, PRIVATE: 1, SECURE: 2, PUBLIC: 3 }`
- `FROM_INDEX` array: `["HIDDEN", "PRIVATE", "SECURE", "PUBLIC"]`
- Range: `pos / 3 * 100` instead of `pos / 2 * 100`
- Snap ticks: 4 positions at `[0, 33.3, 66.7, 100]`
- Color interpolation: 3 segments instead of 2
- Active pill styling: add `committedIdx === 0` case for HIDDEN (muted border)

---

## Rename Scope (PERSONAL → PRIVATE)

~51 files need updating. The list below names key files by category but is **non-exhaustive** — run `grep -r '"PERSONAL"' --include='*.ts' --include='*.tsx'` during implementation to catch all occurrences.

**Caution:** `ConversationScope.PERSONAL` is a separate enum — do NOT rename that value. Replacements must be scoped to `ItemVisibility` / `ProfileVisibility` contexts only.

### Prisma Schema
- `prisma/schema.prisma` — both enum definitions (`ItemVisibility` + `ProfileVisibility`), 5× `@default(PERSONAL)` → `@default(PRIVATE)`

### Zod Validation Schemas
- `lib/validations/mls.ts`
- `app/[locale]/app/(routes)/mls/properties/components/NewPropertyWizard.tsx`
- `app/[locale]/app/(routes)/mls/properties/[slug]/components/EditPropertyForm.tsx`
- `app/[locale]/app/(routes)/settings/agency-profile/components/AgencyProfileEditor.tsx`
- `app/[locale]/app/(routes)/profile/public/components/ProfileEditor.tsx`
- `app/[locale]/app/(routes)/network/profile/components/tabs/ProfileEditTab.tsx`
- `actions/organization/agency-profile.ts`

All `z.enum(["PERSONAL", "SECURE", "PUBLIC"])` → `z.enum(["HIDDEN", "PRIVATE", "SECURE", "PUBLIC"])`.

### TypeScript Type Literals
- `hooks/useAbly.ts`, `lib/ably.ts`
- `actions/social-feed/*.ts`
- Network component types (`PendingRequestsTab`, `ConnectionsTab`, `FindAgentsTab`, `PendingRequestsList`, `ConnectionsList`)

All `"PERSONAL" | "SECURE" | "PUBLIC"` → `"HIDDEN" | "PRIVATE" | "SECURE" | "PUBLIC"`.

### API Routes
- `app/api/v1/mls/properties/route.ts` — hardcoded `"PERSONAL"` default (line ~215)
- `app/api/mls/properties/draft/route.ts`
- `app/api/profile/social/route.ts`
- `app/api/connections/search/route.ts`
- `app/api/messaging/messages/route.ts`

### Onboarding
- `types/onboarding.ts`
- `actions/user/complete-onboarding.ts`
- `app/[locale]/(onboarding)/onboard/components/PrivacyStep.tsx`

### Comparisons & Defaults
- `=== "PERSONAL"` → `=== "PRIVATE"`
- `|| "PERSONAL"` → `|| "PRIVATE"`
- Across ~20 files (views, actions, API routes)

### Import Configs
- `lib/import/client-import-config.ts`
- `lib/import/property-import-config.ts`
- `lib/import/mandate-import-config.ts`
- `lib/import/property-import-schema.ts`
- `lib/import/enum-normalizer.ts`
- `components/conversion/ConversionTransformStep.tsx`

### Seed/Demo Data
- `scripts/seed-test-data.ts` (~40 occurrences)
- `scripts/seed-demo-data.ts`
- `scripts/seed-demo-showcase.ts`

### Select Options in Forms
- `NewPropertyWizard.tsx` — `<SelectItem value="PERSONAL">` → `"PRIVATE"` + add `"HIDDEN"`
- `EditPropertyForm.tsx` — same
- `VisibilityCell.tsx` — table cell component

---

## Translation Updates

### English (`locales/en/`)
- Add `visibility.HIDDEN`: "Hidden"
- Add `visibility.HIDDEN_DESC`: "Hidden from all automated systems"
- Rename `visibility.PERSONAL` → `visibility.PRIVATE`: "Private"
- Update `visibility.PRIVATE_DESC`: "Only you and your agency"

### Greek (`locales/el/`)
- Add `visibility.HIDDEN`: "Κρυφό"
- Add `visibility.HIDDEN_DESC`: "Κρυφό από όλα τα αυτοματοποιημένα συστήματα"
- Rename `visibility.PERSONAL` → `visibility.PRIVATE`: "Ιδιωτικό"
- Update `visibility.PRIVATE_DESC`: "Μόνο εσύ και η εταιρεία σου"

**Note:** Check which translation namespace(s) contain visibility keys and update all of them.

---

## What Does NOT Change

- **List views**: HIDDEN items remain visible in CRM client lists, MLS property tables, mandate lists. No filtering in list queries.
- **Dashboard counts**: Standard dashboard card counts (total clients, total properties) still include HIDDEN items — they are real items, just not processed.
- **SECURE and PUBLIC semantics**: Unchanged.
- **Sharing queries**: `visibility: { in: ["SECURE", "PUBLIC"] }` naturally excludes HIDDEN — no changes needed.
- **Public routes**: `/api/agent/[slug]`, public property views, sitemap — already filter for `PUBLIC` only.

---

## Risk Assessment

- **Migration safety**: `ALTER TYPE ... RENAME VALUE` is atomic. The UPDATE statements are idempotent. Rollback: rename `PRIVATE` back to `PERSONAL`, remove `HIDDEN`.
- **51-file rename**: Mechanical find-replace. Risk of missed occurrences mitigated by TypeScript compilation — any remaining `"PERSONAL"` reference will fail type checking since the Prisma enum no longer includes it.
- **Backward compatibility**: None needed — this is a breaking enum change, but all consumers are internal. The TypeScript compiler enforces completeness.

---

## Implementation Order

1. Prisma schema update + migration
2. Regenerate Prisma client
3. Global rename `PERSONAL → PRIVATE` (51 files)
4. Add `HIDDEN` to Zod schemas, form selects, type literals
5. Add `visibility: { not: "HIDDEN" }` to matchmaking queries
6. Update `ItemVisibilitySelector` component (4 stops)
7. Update translations (EN + EL)
8. Build + lint verification
