# Item Visibility Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `ItemVisibility` enum to add `HIDDEN` (excluded from automated systems) and rename `PERSONAL → PRIVATE`, with immediate cross-org match cleanup on visibility downgrade.

**Architecture:** Two Prisma migrations: first adds `HIDDEN` to `ItemVisibility` (non-transactional `ADD VALUE`), second renames `PERSONAL → PRIVATE` in both `ItemVisibility` and `ProfileVisibility` enums. Matchmaking queries add `visibility: { not: "HIDDEN" }` filter. Visibility update actions clean up stale `CrossOrgMatch` rows on downgrade (transactionally). The `ItemVisibilitySelector` slider expands from 3 to 4 stops. ~51 files get a mechanical `PERSONAL → PRIVATE` rename.

**Tech Stack:** Prisma ORM, PostgreSQL, Next.js 16, React 19, TypeScript, next-intl

**Spec:** `docs/superpowers/specs/2026-03-13-item-visibility-redesign-design.md`

---

## Chunk 1: Schema, Migration & Prisma Client

### Task 1: Update Prisma schema enums and defaults

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update `ItemVisibility` enum** — add `HIDDEN` before `PERSONAL`, rename `PERSONAL` to `PRIVATE`

```prisma
enum ItemVisibility {
  HIDDEN
  PRIVATE
  SECURE
  PUBLIC
}
```

- [ ] **Step 2: Update `ProfileVisibility` enum** — rename `PERSONAL` to `PRIVATE`

```prisma
enum ProfileVisibility {
  PRIVATE
  SECURE
  PUBLIC
}
```

- [ ] **Step 3: Update all `@default(PERSONAL)` to `@default(PRIVATE)`** — 5 occurrences:
  - `Client.visibility` (line ~279)
  - `Properties.visibility` (line ~713)
  - `Mandate.visibility` (line ~1625)
  - `AgentProfile.visibility` (line ~42)
  - `AgencyProfile.visibility` (line ~2971)

**IMPORTANT:** Do NOT touch `ConversationScope.PERSONAL` — that is a different enum entirely.

- [ ] **Step 4: Commit schema changes**

```bash
git add prisma/schema.prisma
git commit -m "chore: update ItemVisibility and ProfileVisibility enums in schema"
```

### Task 2: Create migration 1 — Add HIDDEN to ItemVisibility (non-transactional)

**Files:**
- Create: `prisma/migrations/<timestamp>_add_hidden_to_item_visibility/migration.sql`

**IMPORTANT:** PostgreSQL's `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block. Prisma supports non-transactional migrations — the migration file must NOT be wrapped in `BEGIN`/`COMMIT`.

- [ ] **Step 1: Create empty migration**

```bash
pnpm prisma migrate dev --create-only --name add_hidden_to_item_visibility
```

- [ ] **Step 2: Replace the auto-generated SQL**

```sql
-- AlterEnum (non-transactional — ADD VALUE cannot run in a transaction)
ALTER TYPE "ItemVisibility" ADD VALUE 'HIDDEN' BEFORE 'PERSONAL';
```

- [ ] **Step 3: Apply the migration**

```bash
pnpm prisma migrate dev
```

Expected: Migration applies successfully.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/
git commit -m "feat: add HIDDEN value to ItemVisibility enum"
```

### Task 3: Create migration 2 — Rename PERSONAL → PRIVATE in both enums

**Files:**
- Create: `prisma/migrations/<timestamp>_rename_personal_to_private/migration.sql`

- [ ] **Step 1: Create empty migration**

```bash
pnpm prisma migrate dev --create-only --name rename_personal_to_private
```

- [ ] **Step 2: Replace the auto-generated SQL**

`RENAME VALUE` and `UPDATE` are transaction-safe, so these can run in the same migration:

```sql
-- Rename PERSONAL → PRIVATE in ItemVisibility
UPDATE "Property" SET "visibility" = 'PRIVATE' WHERE "visibility" = 'PERSONAL';
UPDATE "Client" SET "visibility" = 'PRIVATE' WHERE "visibility" = 'PERSONAL';
UPDATE "Mandate" SET "visibility" = 'PRIVATE' WHERE "visibility" = 'PERSONAL';
ALTER TYPE "ItemVisibility" RENAME VALUE 'PERSONAL' TO 'PRIVATE';

-- Rename PERSONAL → PRIVATE in ProfileVisibility
UPDATE "AgentProfile" SET "visibility" = 'PRIVATE' WHERE "visibility" = 'PERSONAL';
UPDATE "AgencyProfile" SET "visibility" = 'PRIVATE' WHERE "visibility" = 'PERSONAL';
ALTER TYPE "ProfileVisibility" RENAME VALUE 'PERSONAL' TO 'PRIVATE';
```

- [ ] **Step 3: Apply the migration**

```bash
pnpm prisma migrate dev
```

Expected: Migration applies successfully, Prisma client regenerated.

- [ ] **Step 4: Verify Prisma client types**

```bash
pnpm prisma generate
```

Check that `node_modules/.prisma/client/index.d.ts` now exports `ItemVisibility` with `HIDDEN | PRIVATE | SECURE | PUBLIC` and `ProfileVisibility` with `PRIVATE | SECURE | PUBLIC`.

- [ ] **Step 5: Commit**

```bash
git add prisma/migrations/
git commit -m "feat: rename PERSONAL→PRIVATE in ItemVisibility and ProfileVisibility enums"
```

---

## Chunk 2: Global PERSONAL → PRIVATE Rename (~51 files)

### Task 4: Rename in Zod schemas and form validation

**Files:**
- Modify: `lib/validations/mls.ts`
- Modify: `app/[locale]/app/(routes)/mls/properties/components/NewPropertyWizard.tsx`
- Modify: `app/[locale]/app/(routes)/mls/properties/[slug]/components/EditPropertyForm.tsx`
- Modify: `app/[locale]/app/(routes)/settings/agency-profile/components/AgencyProfileEditor.tsx`
- Modify: `app/[locale]/app/(routes)/profile/public/components/ProfileEditor.tsx`
- Modify: `app/[locale]/app/(routes)/network/profile/components/tabs/ProfileEditTab.tsx`
- Modify: `actions/organization/agency-profile.ts`

- [ ] **Step 1a: In `ItemVisibility` files, replace Zod enum references with 4 values**

Files: `lib/validations/mls.ts`, `NewPropertyWizard.tsx`, `EditPropertyForm.tsx`

Replace: `z.enum(["PERSONAL", "SECURE", "PUBLIC"])` → `z.enum(["HIDDEN", "PRIVATE", "SECURE", "PUBLIC"])`

- [ ] **Step 1b: In `ProfileVisibility` files, replace Zod enum references with 3 values (NO HIDDEN)**

Files: `AgencyProfileEditor.tsx`, `ProfileEditor.tsx`, `ProfileEditTab.tsx`, `actions/organization/agency-profile.ts`

Replace: `z.enum(["PERSONAL", "SECURE", "PUBLIC"])` → `z.enum(["PRIVATE", "SECURE", "PUBLIC"])`

`ProfileVisibility` does not have a `HIDDEN` value — do NOT add it to these schemas.

- [ ] **Step 2: In NewPropertyWizard.tsx and EditPropertyForm.tsx, update `<SelectItem>` values**

Replace: `<SelectItem value="PERSONAL">` → `<SelectItem value="PRIVATE">`

Add before the PRIVATE option:
```tsx
<SelectItem value="HIDDEN">{t("visibility.HIDDEN")}</SelectItem>
```

- [ ] **Step 3: Commit**

```bash
git add lib/validations/ app/[locale]/app/(routes)/mls/ app/[locale]/app/(routes)/settings/ app/[locale]/app/(routes)/profile/ app/[locale]/app/(routes)/network/profile/ actions/organization/
git commit -m "refactor: rename PERSONAL→PRIVATE in Zod schemas and form selects"
```

### Task 5: Rename in TypeScript type literals

**Files:**
- Modify: `hooks/useAbly.ts`
- Modify: `lib/ably.ts`
- Modify: `actions/social-feed/get-social-posts.ts`
- Modify: `actions/social-feed/get-post-by-id.ts`
- Modify: `actions/social-feed/create-social-post.ts`
- Modify: `app/[locale]/app/(routes)/network/profile/components/tabs/PendingRequestsTab.tsx`
- Modify: `app/[locale]/app/(routes)/network/profile/components/tabs/ConnectionsTab.tsx`
- Modify: `app/[locale]/app/(routes)/network/profile/components/tabs/FindAgentsTab.tsx`
- Modify: `app/[locale]/app/(routes)/network/components/PendingRequestsList.tsx`
- Modify: `app/[locale]/app/(routes)/network/components/ConnectionsList.tsx`

- [ ] **Step 1: In each file, replace type literal unions**

Replace: `"PERSONAL" | "SECURE" | "PUBLIC"` → `"PRIVATE" | "SECURE" | "PUBLIC"`

**Note:** These files use `ProfileVisibility` context (agent profiles), so they do NOT get `"HIDDEN"` in their union types. Only `ItemVisibility`-scoped types would include HIDDEN.

- [ ] **Step 2: Commit**

```bash
git add hooks/ lib/ably.ts actions/social-feed/ app/[locale]/app/(routes)/network/
git commit -m "refactor: rename PERSONAL→PRIVATE in TypeScript type literals"
```

### Task 6: Rename in API routes

**Files:**
- Modify: `app/api/v1/mls/properties/route.ts`
- Modify: `app/api/mls/properties/draft/route.ts`
- Modify: `app/api/profile/social/route.ts`
- Modify: `app/api/connections/search/route.ts`
- Modify: `app/api/messaging/messages/route.ts`
- Modify: `app/api/mls/properties/bulk-publish/route.ts`
- Modify: `app/api/agent/[slug]/route.ts`

- [ ] **Step 1: Replace all `"PERSONAL"` references with `"PRIVATE"`**

Key changes:
- `app/api/v1/mls/properties/route.ts:215` — `portalVisibility || "PERSONAL"` → `portalVisibility || "PRIVATE"`
- Other files: same pattern for defaults and comparisons

- [ ] **Step 2: Commit**

```bash
git add app/api/
git commit -m "refactor: rename PERSONAL→PRIVATE in API routes"
```

### Task 7: Rename in views, actions, and components

**Files:**
- Modify: `app/[locale]/app/(routes)/mls/properties/[slug]/components/PropertyView.tsx`
- Modify: `app/[locale]/app/(routes)/properties/[slug]/components/PropertyViewEditable.tsx`
- Modify: `app/[locale]/app/(routes)/mandates/[slug]/components/MandateView.tsx`
- Modify: `app/[locale]/app/(routes)/mls/properties/table-components/cells/VisibilityCell.tsx`
- Modify: `app/[locale]/app/(routes)/settings/agency-profile/components/AgencyProfileClient.tsx`
- Modify: `app/[locale]/app/(routes)/settings/agency-profile/components/AgencyProfilePreview.tsx`
- Modify: `app/[locale]/app/(routes)/profile/public/components/ProfilePublicClient.tsx`
- Modify: `app/[locale]/app/(routes)/profile/components/PrivacySecurityTab.tsx`
- Modify: `app/[locale]/app/(routes)/profile/social/page.tsx`
- Modify: `app/[locale]/app/(routes)/network/profile/components/ProfileHeader.tsx`
- Modify: `app/[locale]/app/(routes)/network/sharing-hub/page.tsx`
- Modify: `app/[locale]/app/(routes)/network/feed/components/FeedPostCard.tsx`
- Modify: `app/[locale]/app/(routes)/network/feed/components/FeedPostComposer.tsx`
- Modify: `app/[locale]/app/(routes)/network/feed/components/FeedPage.tsx`
- Modify: `app/[locale]/(public)/post/[postId]/components/PostPageView.tsx`
- Modify: `app/[locale]/(public)/property/[propertyId]/components/PublicPropertyView.tsx`
- Modify: `app/[locale]/(public)/agent/[slug]/page.tsx`
- Modify: `app/sitemap.ts`
- Modify: `actions/social/profile.ts`
- Modify: `actions/social/connections.ts`
- Modify: `actions/social/contact-form.ts`
- Modify: `actions/social/showcase.ts`
- Modify: `actions/mls/get-listings.ts`
- Modify: `actions/mls/get-public-property.ts`
- Modify: `actions/mls/get-public-property-by-org.ts`
- Modify: `actions/xe/sync.ts`
- Modify: `actions/network/get-my-network-items.ts`
- Modify: `actions/network/compute-cross-org-matches.ts`
- Modify: `actions/network/discover-agents.ts`
- Modify: `actions/network/discover-posts.ts`
- Modify: `actions/network/discover-agencies.ts`
- Modify: `actions/organization/agency-contact-form.ts`

- [ ] **Step 1: Replace all `"PERSONAL"` with `"PRIVATE"` in each file**

Pattern replacements:
- `=== "PERSONAL"` → `=== "PRIVATE"`
- `|| "PERSONAL"` → `|| "PRIVATE"`
- `!== "PERSONAL"` → `!== "PRIVATE"`
- `visibility: "PERSONAL"` → `visibility: "PRIVATE"`

**IMPORTANT:** Do NOT change `ConversationScope.PERSONAL` if it appears in any of these files. Only change visibility-related references.

- [ ] **Step 2: Commit**

```bash
git add app/ actions/
git commit -m "refactor: rename PERSONAL→PRIVATE in views, actions, and components"
```

### Task 8: Rename in onboarding, imports, and conversion

**Files:**
- Modify: `types/onboarding.ts`
- Modify: `actions/user/complete-onboarding.ts`
- Modify: `app/[locale]/(onboarding)/onboard/components/PrivacyStep.tsx`
- Modify: `lib/import/client-import-config.ts`
- Modify: `lib/import/property-import-config.ts`
- Modify: `lib/import/mandate-import-config.ts`
- Modify: `lib/import/property-import-schema.ts`
- Modify: `lib/import/enum-normalizer.ts`
- Modify: `lib/import/index.ts`
- Modify: `components/conversion/ConversionTransformStep.tsx`

- [ ] **Step 1: Replace `"PERSONAL"` → `"PRIVATE"` in onboarding files**

Files: `types/onboarding.ts`, `actions/user/complete-onboarding.ts`, `PrivacyStep.tsx`

- [ ] **Step 2: Update `lib/import/enum-normalizer.ts` — fix visibility mappings**

The enum normalizer (line ~295-320) maps user-entered strings to enum values. Current mappings must change:

```typescript
// BEFORE (wrong after rename):
// "private" → "PERSONAL"
// "hidden" → "PERSONAL"

// AFTER (correct):
// "hidden" → "HIDDEN"     ← new enum value
// "private" → "PRIVATE"   ← renamed enum value
// "personal" → "PRIVATE"  ← backward compat for old value
```

Ensure all other mappings (`"secure"` → `"SECURE"`, `"public"` → `"PUBLIC"`) remain unchanged. Greek aliases (`"κρυφό"`, `"ιδιωτικό"`) should map to `"HIDDEN"` and `"PRIVATE"` respectively.

- [ ] **Step 3: Update `lib/import/property-import-schema.ts` — add HIDDEN to Zod enum**

Line ~79-83: Replace `ItemVisibilityEnum`:

```typescript
export const ItemVisibilityEnum = z.enum([
  "HIDDEN",
  "PRIVATE",
  "SECURE",
  "PUBLIC",
]);
```

Also update the field description (line ~593):
```typescript
description: "Item visibility (HIDDEN, PRIVATE, SECURE, PUBLIC)"
```

- [ ] **Step 4: Update import config defaults**

- `lib/import/property-import-config.ts:139` — `"PERSONAL"` → `"PRIVATE"`
- `lib/import/client-import-config.ts:129` — `"PERSONAL"` → `"PRIVATE"`
- `lib/import/mandate-import-config.ts:150` — `"PERSONAL"` → `"PRIVATE"`

- [ ] **Step 5: Update `components/conversion/ConversionTransformStep.tsx`**

Line ~46: Update the `ENUM_FIELDS` visibility array:

```typescript
visibility: ["HIDDEN", "PRIVATE", "SECURE", "PUBLIC"],
```

- [ ] **Step 6: Commit**

```bash
git add types/ actions/user/ app/[locale]/(onboarding)/ lib/import/ components/conversion/
git commit -m "refactor: rename PERSONAL→PRIVATE in onboarding, imports, and conversion"
```

### Task 9: Rename in seed/demo data and mock data

**Files:**
- Modify: `scripts/seed-test-data.ts`
- Modify: `scripts/seed-demo-data.ts`
- Modify: `scripts/seed-demo-showcase.ts`
- Modify: `lib/mock-data/properties.ts`

- [ ] **Step 1: Replace all `"PERSONAL"` → `"PRIVATE"` in seed scripts and mock data**

In `lib/mock-data/properties.ts`, check the type definition — it may use custom visibility strings like `"PRIVATE"` or `"NETWORK"` instead of the Prisma enum values. Update to match the new enum: `"HIDDEN" | "PRIVATE" | "SECURE" | "PUBLIC"`.

- [ ] **Step 2: Commit**

```bash
git add scripts/ lib/mock-data/
git commit -m "refactor: rename PERSONAL→PRIVATE in seed and mock data"
```

### Task 10: Verify no remaining PERSONAL references

- [ ] **Step 1: Run grep to find any remaining `"PERSONAL"` in visibility context**

```bash
grep -rn '"PERSONAL"' --include='*.ts' --include='*.tsx' --include='*.prisma' | grep -v 'ConversationScope' | grep -v node_modules | grep -v .next
```

Expected: No results (or only `ConversationScope.PERSONAL` which is correct).

- [ ] **Step 2: Run TypeScript compilation check**

```bash
pnpm tsc --noEmit 2>&1 | head -50
```

Expected: No type errors related to `"PERSONAL"` — the Prisma-generated types no longer include it, so any remaining references will fail.

---

## Chunk 3: Matchmaking Filtering & Cross-Org Cleanup

### Task 11: Add HIDDEN filter to matchmaking queries

**Files:**
- Modify: `actions/matchmaking/get-mandate-matches.ts`

- [ ] **Step 1: Add `visibility: { not: "HIDDEN" }` to `fetchActiveMandates()` query**

In `actions/matchmaking/get-mandate-matches.ts` (line ~106), add to the `where` clause:

```typescript
async function fetchActiveMandates(organizationId: string) {
  return prismadb.mandate.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      draft_status: { not: true },
      visibility: { not: "HIDDEN" },  // ← ADD THIS
    },
    // ... rest unchanged
  });
}
```

- [ ] **Step 2: Add `visibility: { not: "HIDDEN" }` to `fetchActiveProperties()` query**

In `actions/matchmaking/get-mandate-matches.ts` (line ~147), add to the `where` clause:

```typescript
async function fetchActiveProperties(organizationId: string) {
  return prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: {
        in: ["ACTIVE", "PENDING"],
      },
      visibility: { not: "HIDDEN" },  // ← ADD THIS
    },
    // ... rest unchanged
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add actions/matchmaking/get-mandate-matches.ts
git commit -m "feat: exclude HIDDEN items from matchmaking queries"
```

### Task 12: Add CrossOrgMatch cleanup to visibility update actions

**Files:**
- Modify: `actions/mls/update-property-visibility.ts`
- Modify: `actions/mandates/update-mandate-visibility.ts`

- [ ] **Step 1: Update `update-property-visibility.ts`**

Wrap the update and cleanup in a transaction so they are atomic:

```typescript
export async function updatePropertyVisibility(
  propertyId: string,
  visibility: ItemVisibility
): Promise<{ success: boolean; error?: string }> {
  try {
    const { orgId } = await auth();
    if (!orgId) return { success: false, error: "Unauthorized" };

    const property = await prismadb.properties.findFirst({
      where: { id: propertyId, organizationId: orgId },
      select: { id: true },
    });
    if (!property) return { success: false, error: "Property not found" };

    // Use transaction for atomicity: visibility update + match cleanup
    await prismadb.$transaction(async (tx) => {
      await tx.properties.update({
        where: { id: propertyId },
        data: { visibility },
      });

      // Clean up cross-org matches when visibility is downgraded
      if (visibility === "HIDDEN" || visibility === "PRIVATE") {
        await tx.crossOrgMatch.deleteMany({
          where: { propertyId },
        });
      }
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update visibility" };
  }
}
```

- [ ] **Step 2: Update `update-mandate-visibility.ts`**

Same transaction pattern:

```typescript
export async function updateMandateVisibility(
  mandateId: string,
  visibility: ItemVisibility
): Promise<{ success: boolean; error?: string }> {
  try {
    const { orgId } = await auth();
    if (!orgId) return { success: false, error: "Unauthorized" };

    const mandate = await prismadb.mandate.findFirst({
      where: { id: mandateId, organizationId: orgId },
      select: { id: true },
    });
    if (!mandate) return { success: false, error: "Mandate not found" };

    await prismadb.$transaction(async (tx) => {
      await tx.mandate.update({
        where: { id: mandateId },
        data: { visibility },
      });

      if (visibility === "HIDDEN" || visibility === "PRIVATE") {
        await tx.crossOrgMatch.deleteMany({
          where: { mandateId },
        });
      }
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update visibility" };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add actions/mls/update-property-visibility.ts actions/mandates/update-mandate-visibility.ts
git commit -m "feat: clean up CrossOrgMatch rows on visibility downgrade"
```

### Task 13: Add visibility input validation to external API routes

**Files:**
- Modify: `app/api/v1/mls/properties/route.ts`
- Modify: `app/api/v1/mls/properties/[propertyId]/route.ts`

**Security context:** These external API routes currently accept `portalVisibility` from the request body with NO validation — any API consumer with `MLS_WRITE` scope can set visibility to an arbitrary string. Now that HIDDEN exists, we must validate input against the enum.

- [ ] **Step 1: Add validation to POST `/api/v1/mls/properties`**

In `app/api/v1/mls/properties/route.ts`, after extracting `portalVisibility` from the request body, validate it:

```typescript
import { ItemVisibility } from "@prisma/client";

// Validate visibility if provided
const validVisibilities: ItemVisibility[] = ["HIDDEN", "PRIVATE", "SECURE", "PUBLIC"];
if (portalVisibility && !validVisibilities.includes(portalVisibility)) {
  return NextResponse.json(
    { error: "Invalid visibility value. Must be one of: HIDDEN, PRIVATE, SECURE, PUBLIC" },
    { status: 400 }
  );
}
```

- [ ] **Step 2: Add validation to PUT `/api/v1/mls/properties/[propertyId]`**

Same pattern in `app/api/v1/mls/properties/[propertyId]/route.ts` for the PUT handler.

- [ ] **Step 3: Commit**

```bash
git add app/api/v1/mls/properties/
git commit -m "fix: validate visibility input in external API property routes"
```

---

## Chunk 4: UI — ItemVisibilitySelector + Translations

### Task 14: Update ItemVisibilitySelector to 4 stops

**Files:**
- Modify: `components/ItemVisibilitySelector.tsx`

- [ ] **Step 1: Update OPTIONS array** — add HIDDEN as first option, rename PERSONAL to PRIVATE

```typescript
import { Lock, Shield, Globe, EyeOff } from "lucide-react";

const OPTIONS: {
  value: ItemVisibility;
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  trackColor: string;
}[] = [
  {
    value: "HIDDEN",
    icon: EyeOff,
    label: "Hidden",
    description: "Hidden from all systems",
    color: "text-muted-foreground",
    trackColor: "#9ca3af",
  },
  {
    value: "PRIVATE",
    icon: Lock,
    label: "Private",
    description: "Only you and your org",
    color: "text-muted-foreground",
    trackColor: "#6b7280",
  },
  {
    value: "SECURE",
    icon: Shield,
    label: "Secure",
    description: "App users & network peers",
    color: "text-blue-500",
    trackColor: "#3b82f6",
  },
  {
    value: "PUBLIC",
    icon: Globe,
    label: "Public",
    description: "Everyone, shown on profile",
    color: "text-primary",
    trackColor: "hsl(var(--primary))",
  },
];
```

- [ ] **Step 2: Update INDEX and FROM_INDEX** — range now 0–3

```typescript
const INDEX: Record<ItemVisibility, number> = { HIDDEN: 0, PRIVATE: 1, SECURE: 2, PUBLIC: 3 };
const FROM_INDEX: ItemVisibility[] = ["HIDDEN", "PRIVATE", "SECURE", "PUBLIC"];
```

- [ ] **Step 3: Update slider math** — all `/2` → `/3`, all `Math.min(2,` → `Math.min(3,`

Key changes:
- `const pct = (pos / 3) * 100;` (was `/2`)
- `const liveIdx = Math.min(3, Math.max(0, Math.round(pos)));` (was `Math.min(2,`)
- In `getPosFromEvent`: `return Math.min(3, Math.max(0, raw * 3));` (was `raw * 2` and `Math.min(2,`)
- In `onPointerUp`: `const snapped = Math.min(3, Math.max(0, Math.round(finalPos)));` (was `Math.min(2,`)

- [ ] **Step 4: Update snap tick marks** — 4 ticks instead of 3

```tsx
{[0, 33.33, 66.67, 100].map((p, i) => (
  <div
    key={i}
    className="absolute top-1/2 h-1.5 w-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
    style={{
      left: `${p}%`,
      backgroundColor: i <= liveIdx ? "transparent" : "hsl(var(--muted-foreground) / 0.3)",
    }}
  />
))}
```

- [ ] **Step 5: Update color interpolation** — `thumbColorAt` now has 3 segments

```typescript
function thumbColorAt(pos: number): string {
  if (pos <= 1) return lerpColor("#9ca3af", "#6b7280", pos);
  if (pos <= 2) return lerpColor("#6b7280", "#3b82f6", pos - 1);
  return lerpColor("#3b82f6", "#22c55e", pos - 2);
}
```

- [ ] **Step 6: Update gradient track** — 4 color stops

```tsx
style={{
  background: "linear-gradient(to right, #9ca3af 0%, #6b7280 33%, #3b82f6 67%, hsl(var(--primary)) 100%)",
  opacity: 0.2,
}}
```

Same for the filled progress track.

- [ ] **Step 7: Update active pill styling** — add case for `committedIdx === 0`

In the pill div's className:
```tsx
committedIdx === 0 && "border-border bg-muted/30",
committedIdx === 1 && "border-border bg-muted/30",
committedIdx === 2 && "border-blue-500/30 bg-blue-500/5",
committedIdx === 3 && "border-primary/30 bg-primary/5",
```

- [ ] **Step 8: Commit**

```bash
git add components/ItemVisibilitySelector.tsx
git commit -m "feat: expand ItemVisibilitySelector to 4 stops (HIDDEN, PRIVATE, SECURE, PUBLIC)"
```

### Task 15: Update translations

**Files:**
- Modify: `locales/en/mls.json`
- Modify: `locales/el/mls.json`
- Modify: `locales/en/profile.json` (if it has visibility keys)
- Modify: `locales/el/profile.json` (if it has visibility keys)

- [ ] **Step 1: Update English MLS translations**

In `locales/en/mls.json`, find the `"visibility"` section. **Delete the `"PERSONAL"` key** and replace with:

```json
"visibility": {
  "HIDDEN": "Hidden",
  "HIDDEN_DESC": "Hidden from all automated systems",
  "PRIVATE": "Private",
  "PRIVATE_DESC": "Only you and your agency",
  "SECURE": "Secure",
  "PUBLIC": "Public"
}
```

- [ ] **Step 2: Update Greek MLS translations**

In `locales/el/mls.json`, find the `"visibility"` section. **Delete the `"PERSONAL"` key** and replace with:

```json
"visibility": {
  "HIDDEN": "Κρυφό",
  "HIDDEN_DESC": "Κρυφό από όλα τα αυτοματοποιημένα συστήματα",
  "PRIVATE": "Ιδιωτικό",
  "PRIVATE_DESC": "Μόνο εσύ και η εταιρεία σου",
  "SECURE": "Ασφαλές",
  "PUBLIC": "Δημόσιο"
}
```

- [ ] **Step 3: Check and update any other locale files with visibility keys**

Run: `grep -rn '"PERSONAL"' locales/` and update any remaining references.

- [ ] **Step 4: Commit**

```bash
git add locales/
git commit -m "feat: add HIDDEN and rename PERSONAL→PRIVATE in translations"
```

---

## Chunk 5: Verification

### Task 16: Build and lint verification

- [ ] **Step 1: Run TypeScript compilation**

```bash
pnpm tsc --noEmit
```

Expected: No errors. Any remaining `"PERSONAL"` references will fail type checking.

- [ ] **Step 2: Run linter**

```bash
pnpm lint
```

Expected: No new lint errors.

- [ ] **Step 3: Run build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 4: Final grep check**

```bash
grep -rn '"PERSONAL"' --include='*.ts' --include='*.tsx' --include='*.prisma' --include='*.json' | grep -v 'ConversationScope' | grep -v node_modules | grep -v .next
```

Expected: No results (only `ConversationScope.PERSONAL` if that grep exclusion misses edge cases).

- [ ] **Step 5: Commit any fixes and create final commit**

If there were any fix-ups needed from build/lint:

```bash
git add -A
git commit -m "fix: address build/lint issues from visibility redesign"
```
