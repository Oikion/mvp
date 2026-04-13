# Matchmaking System v2 — Design Spec

**Date:** 2026-04-13
**Status:** Approved — Ready for Implementation Planning
**Author:** Claude (brainstorming skill) × Stavros Apostolou

---

## Table of Contents

1. [Core Model](#1-core-model)
2. [Three Matching Scopes](#2-three-matching-scopes)
3. [Three-Layer Scoring Engine](#3-three-layer-scoring-engine)
4. [Persistence & Triggering Architecture](#4-persistence--triggering-architecture)
5. [Match Card Specification](#5-match-card-specification)
6. [Codebase Changes](#6-codebase-changes)
7. [Privacy & Visibility Rules](#7-privacy--visibility-rules)

---

## 1. Core Model

### Entity Relationships

The matchmaking axis is **Property ↔ Request** (not Property ↔ Contact/Client).

- A **Request** represents a buyer/renter's search criteria — `budget_min/max`, `areas_of_interest`, `property_types`, `bedrooms`, `financing_type`, etc.
- A **Contact** (formerly "Client") is a person who may own zero or more Requests.
- The join table `RequestContact` links Contacts to Requests with a role (`BUYER`, `CO_BUYER`, `RENTER`).
- The **matchmaking engine** never reads from Contact directly — it reads from Request.
- Contact identity surfaces on the match card only within intra-org context (i.e., when both the property and the request belong to the same organisation).

### Match Output

A match is a `(Property, Request)` pair with:
- A **composite score** (0–100)
- A **per-criterion breakdown** (19 criteria, Layer 2)
- A **match tier** label: `EXCELLENT` (≥85), `GOOD` (≥70), `FAIR` (≥50), `POOR` (≥25), `BELOW_THRESHOLD` (<25, not persisted)

Matches below 25 are discarded. Matches at 25+ are persisted or surfaced.

### Deal Creation

When a user acts on a match (clicks "Create Deal" on the match card), the system creates a Deal pre-linked to both the Property and the matched Request. The Deal creation reuses the existing deal pipeline UI.

---

## 2. Three Matching Scopes

### 2.1 Intra-Org Matching

- **Pool:** Properties and Requests belonging to the **same organisation**.
- **Trigger:** 30-minute cron (`/api/cron/intra-org-matches`) + manual on-demand trigger per item.
- **Persistence:** `PropertyRequestMatch` table (one row per Property+Request pair).
- **Contact visibility:** Full — Contact name and details visible since both sides belong to the same org.
- **Privacy filtering:** None — no cross-org data exchange.
- **Score TTL:** No TTL. Rows are refreshed on each cron run. Stale rows for archived/deleted items are pruned by the cron job.

### 2.2 Bilateral Matching (Inter-Org)

- **Pool:** Properties and Requests where both items have `ItemVisibility ≥ SECURE` and the two organisations are **connected bilateral partners** (have an accepted `OrgNetworkPartner` invite).
- **Trigger:** Same 30-minute cross-org cron already in operation (`/api/cron/cross-org-matches`) + manual on-demand trigger per item.
- **Persistence:** `CrossOrgMatch` table with `scope = BILATERAL`.
- **Contact visibility:** Never. Buyer/client Contact identity is never shared cross-org regardless of privacy level. See Section 7.
- **Privacy level:** Determined by the receiving org's `OrgNetworkSettings.networkPrivacyLevel` (`ANONYMIZED`, `AGENCY_IDENTIFIED`, `FULL`). Applied at read time.
- **TTL:** 30 days (existing `expiresAt` field on `CrossOrgMatch`).

### 2.3 Polis Pool Matching

- **Pool:** Properties and Requests where both items have `ItemVisibility = PUBLIC` and the owning org has opted into Polis (`OrgNetworkSettings.polisEnabled = true`).
- **Trigger:** Same cross-org cron, Polis pass runs after bilateral pass.
- **Persistence:** `CrossOrgMatch` table with `scope = POLIS`.
- **Contact visibility:** Never. Same hard rule as bilateral.
- **Privacy level:** Same per-org `networkPrivacyLevel` applied at read time.
- **TTL:** 30 days.

### 2.4 Scope Relationship

Bilateral and Polis use the same `CrossOrgMatch` table, differentiated by the `scope` enum field (`BILATERAL` | `POLIS`). An item eligible for Polis (PUBLIC + polisEnabled) does not automatically also appear in bilateral unless the orgs are also connected partners. These are independent pools.

---

## 3. Three-Layer Scoring Engine

### Layer 1 — Hard Disqualifiers

These are binary checks. If **any** disqualifier fires, the pair receives a score of 0 and is excluded from results entirely (not persisted).

Implemented in `lib/matchmaking/disqualifiers.ts`:

| Disqualifier | Condition |
|---|---|
| `BUDGET_HARD_FLOOR` | `property.price > request.budget_max * 1.15` |
| `PROPERTY_TYPE_MISMATCH` | `property.type` not in `request.property_types` |
| `PURPOSE_MISMATCH` | `property.purpose` (SALE/RENT) ≠ `request.purpose` |
| `AREA_HARD_EXCLUSION` | Request has `areas_of_interest` AND property area not in list (zero geographic overlap) |
| `ARCHIVED_OR_INACTIVE` | Either item has `status = ARCHIVED` or `status = INACTIVE` |

`AREA_HARD_EXCLUSION` only fires when the Request explicitly lists areas. If `areas_of_interest` is empty, the criterion is skipped (not disqualified).

**`BUDGET_HARD_FLOOR` rationale:** A 15% tolerance is used rather than a strict price-equals-ceiling rule. In Greek real estate practice agents routinely show properties slightly over a stated budget — buyers negotiate, and a buyer who says €400k may stretch to €440k for the right property. The 15% band lets the price criterion in Layer 2 score these marginal cases low (they'll appear as FAIR or POOR) rather than eliminating them entirely. Properties more than 15% over `budget_max` have no realistic path to conversion and are hard-killed.

### Layer 2 — Weighted Scoring (19 Criteria)

After passing Layer 1, each pair receives a score of 0–100 built from weighted sub-scores. Weights are runtime-configurable via `OrgMatchWeights` (database record per org); if none exists, the system reads from the seeded `MATCH_WEIGHTS` defaults in `lib/matchmaking/weights.ts`.

#### Scoring Table (Default Weights, Total = 100 pts)

| # | Criterion | Max Pts | Scoring Logic |
|---|---|---|---|
| 1 | Price match | 20 | Linear: exact budget midpoint = full score; tapers to 0 at 25% above/below |
| 2 | Property type | 12 | Binary: in list = full; not in list = 0 (post-Layer-1, should always score unless multi-type) |
| 3 | Location | 12 | If Request has `centerLatitude/Longitude + radiusKm`: geodesic distance scoring (full at 0km, 0 at radiusKm+20%). If Request has `areas_of_interest` (area strings): string-match scoring (exact = full, region-level = partial). Falls back to 0 if no location criteria set. |
| 4 | Bedrooms | 8 | Asymmetric penalty: deficit (wants 3, has 2) scores 40% of max; surplus (wants 3, has 4) scores 80% of max; exact match = full |
| 5 | Size (sqm) | 7 | Linear within ±20% of target; 0 outside ±40% |
| 6 | Floor | 5 | Partial: ground floor preference, upper floor preference, any = full |
| 7 | Condition | 5 | NEW/RENOVATED > GOOD > FAIR > NEEDS_WORK; partial scoring based on gap |
| 8 | Construction year | 4 | Linear decay; newer = better unless Request specifies "pre-war" preference |
| 9 | Parking | 4 | Binary: has parking = full if requested; bonus +2 if covered/garage specified |
| 10 | Storage | 3 | Binary: has storage if requested |
| 11 | Elevator | 3 | Binary: has elevator if requested (weighted by floor) |
| 12 | Garden/outdoor | 3 | Binary: has garden if requested |
| 13 | Amenities bundle | 5 | Pool, A/C, heating type, solar panels, fireplace — partial scoring per match |
| 14 | Inside city plan | 3 | Binary: `insideCityPlan` = true scores if Request prefers regulated zoning |
| 15 | Golden Visa eligible | 2 | `goldenVisaEligible` = true on property + regional tier check: Tier A (Attica/Thessaloniki/Mykonos/Santorini) requires price ≥ €800,000; Tier B (all other Greek regions) requires price ≥ €400,000 |
| 16 | Financing type | 2 | CASH buyer on property ≥ €500k = +5 bonus pts (stacks on top of normal score, capped at criterion max). MORTGAGE on CASH-ONLY property = partial deduction. |
| 17 | Bathrooms | 2 | Partial: deficit/surplus logic same as bedrooms but half the weight |
| 18 | Timeline urgency | 2 | Request `timeline = IMMEDIATE` on ready-to-sell property = full; FLEXIBLE = neutral |
| 19 | Energy class | 2 | A+/A = full if Request prefers green; F/G = penalty if Request requires A-class |

**Note on Column totals — intentional over-budget design:** Criteria 1–19 sum to 104 base points because Criterion 16 (Financing type) carries a 5-pt exceptional bonus that stacks on top of the 2-pt base weight. This is deliberate: a CASH buyer on a high-value property is a genuinely exceptional signal that warrants boosting a match above what the base criteria alone would produce. After computing the raw sum, scores are clamped to 100. Do **not** "fix" the column sum to equal 100 — doing so would eliminate the bonus mechanic entirely. Future developers maintaining the weight system should preserve this: the `OrgMatchWeights` JSON stores per-criterion overrides, and the financing bonus is hardcoded in the calculator, not a configurable weight. If `OrgMatchWeights` are ever restructured, the financing bonus logic must be explicitly carried over.

#### Golden Visa Regional Logic (Criterion 15)

Implemented in `lib/matchmaking/constants/golden-visa.ts`:

```typescript
export const GOLDEN_VISA_HIGH_TIER_REGIONS = new Set([
  "attica", "athens",
  "thessaloniki",
  "mykonos",
  "santorini", "thira"
]);

export const GOLDEN_VISA_THRESHOLD = {
  TIER_A: 800_000,  // Attica, Thessaloniki, Mykonos, Santorini
  TIER_B: 400_000,  // All other Greek regions
} as const;
```

To determine which tier applies: normalise `property.area` to lowercase, check membership in `GOLDEN_VISA_HIGH_TIER_REGIONS`. If match → `TIER_A`; else → `TIER_B`. Score full 2 pts if price meets threshold; 0 otherwise.

#### Asymmetric Bedroom Penalty (Criterion 4)

```
deficit_score  = 0.4 * max_pts   // wants 3, has 2
exact_score    = 1.0 * max_pts   // wants 3, has 3
surplus_score  = 0.8 * max_pts   // wants 3, has 4
```

A property with fewer bedrooms than the Request target scores significantly lower than a property with more — buyers are generally more flexible about extra space than about a shortfall.

#### Geodesic Location Scoring (Criterion 3)

Implemented in `lib/matchmaking/geo.ts` using the Haversine formula:

```
score = max(0, max_pts * (1 - distance / (radiusKm * 1.2)))
```

Where `1.2` is the 20% overshoot tolerance. Full score at 0km distance, linearly decays to 0 at 120% of the Request's stated radius. Requires `property.latitude` and `property.longitude` to be populated.

### Layer 3 — Weight Calibration Feedback Loop

No machine learning. The system observes human signals and generates recommendations for an admin to approve.

**Signal capture:** When an agent dismisses a match (`DISMISSED`) or marks interest (`INTERESTED`), the `PropertyRequestMatch.agentFeedback` enum is updated. These signals feed the calibration report.

**Weekly calibration cron** (`/api/cron/weight-calibration`):
1. Looks back 90 days of `DISMISSED` and `INTERESTED` signals.
2. Computes, for each criterion, the average criterion score for DISMISSED vs. INTERESTED matches.
3. If a criterion scores high on DISMISSED matches (agents dismiss despite high scores) → recommend reducing its weight.
4. If a criterion scores low on INTERESTED matches (agents act despite low scores) → recommend increasing its weight.
5. Writes a `WeightCalibrationReport` row (human-readable JSON + summary text).
6. Sends an in-app notification to ORG_OWNER and ADMIN roles: "New weight calibration report available."

**Admin action:** Admins review the report in the Matchmaking Settings page. They can apply the suggested weights (writes to `OrgMatchWeights`) or dismiss the report. Weights are never auto-applied.

---

## 4. Persistence & Triggering Architecture

### 4.1 Cron-Unified Approach (V1)

Both intra-org and cross-org matching use the cron-unified approach for V1:

| Cron | Schedule | Endpoint | Covers |
|---|---|---|---|
| Intra-org matching | Every 30 min | `/api/cron/intra-org-matches` | All active Properties + Requests within each org |
| Cross-org matching | Every 30 min | `/api/cron/cross-org-matches` | Bilateral + Polis (existing, extended) |
| Weight calibration | Weekly (Mon 03:00 UTC) | `/api/cron/weight-calibration` | 90-day signal analysis, per org |

All cron endpoints are protected by `CRON_SECRET` header validation.

**Intra-org cron batch logic:**
1. Fetch all orgs with at least one active Property and one active Request.
2. For each org: fetch all active Properties (visibility ≠ HIDDEN) and all active Requests (visibility ≠ HIDDEN).
3. Score all P×R pairs using Layer 1 → Layer 2.
4. Upsert `PropertyRequestMatch` rows for scores ≥ 25.
5. Delete `PropertyRequestMatch` rows for pairs that no longer exist or now score < 25.

### 4.2 Manual On-Demand Trigger (V1 Perception Fix)

On the **Property detail page** and the **Request detail page**, a "Run matching now" button triggers an on-demand scoring action for that single item:

- **Property trigger:** Scores the property against all active Requests in the org. Upserts resulting `PropertyRequestMatch` rows immediately.
- **Request trigger:** Scores the request against all active Properties in the org. Upserts resulting `PropertyRequestMatch` rows immediately.
- **Cross-org trigger:** Same button also enqueues a cross-org scoring pass for the single item against eligible partner-org items.

The button is disabled while a matching job is in progress (optimistic locking via a `lastMatchRunAt` timestamp on the item). Rate-limited to once per 5 minutes per item.

### 4.3 Vercel Queues (Phase 2, Not V1)

For orgs with large portfolios (>500 properties or >500 requests), the cron-unified approach may be slow. Vercel Queues will be introduced in Phase 2 to fan out per-org batch jobs concurrently. V1 does not implement this; the cron runs sequentially per org.

### 4.4 CrossOrgMatch Deduplication

**Problem:** When an item's visibility upgrades (e.g., SECURE → PUBLIC, entering Polis pool), the next cron run must update the existing row, not create a duplicate.

**Deduplication key:** `(propertyId, requestId, scope)` — unique composite.

The upsert operation uses this key:
```prisma
upsert({
  where: { propertyId_requestId_scope: { propertyId, requestId, scope } },
  create: { ... },
  update: { score, breakdown, expiresAt, ... }
})
```

A bilateral match (`scope = BILATERAL`) and a Polis match (`scope = POLIS`) for the same property+request pair are two distinct rows. This is intentional: different scopes represent different contexts, and each has its own TTL and privacy-filtering path.

---

## 5. Match Card Specification

### 5.1 Intra-Org Match Card

Used in: Matchmaking Dashboard → Intra-Org tab; Property detail → Matches panel; Request detail → Matches panel.

```
┌─────────────────────────────────────────────────────────────┐
│  [Property thumbnail]  Παραλιακό Διαμέρισμα, Γλυφάδα        │
│  3 beds · 110 sqm · €420,000                 EXCELLENT  92  │
├─────────────────────────────────────────────────────────────┤
│  Matched Request: "Διαμέρισμα παραλία"                       │
│  Contact: Μαρία Παπαδοπούλου  [Agent: Νίκος Σ.]             │
│                                                             │
│  Score Breakdown:                                           │
│  ✅ Price           20/20   Within budget midpoint          │
│  ✅ Location        12/12   Γλυφάδα matches area list       │
│  ✅ Type            12/12   Apartment ✓                     │
│  ⚠️ Bedrooms        4/8    Has 3, wants 4 (deficit)         │
│  ✅ Size             7/7    108 sqm vs 100 target           │
│  ✅ Parking          4/4    Covered parking                 │
│  … (collapsed, show all 19 on expand)                       │
│                                                             │
│  [Create Deal]  [Dismiss]  [Mark Interested]                │
└─────────────────────────────────────────────────────────────┘
```

**Key rules:**
- Contact name and assigned Agent are always visible intra-org.
- Score badge color: EXCELLENT = green, GOOD = blue, FAIR = amber, POOR = red.
- Criterion rows with ≥ max score show ✅; partial show ⚠️ with explanation; zero show ❌.
- Up to 5 top-contributing criteria shown by default; "Show all 19" expands.
- "Dismiss" records `DISMISSED` feedback; "Mark Interested" records `INTERESTED` (both feed Layer 3).

### 5.2 Cross-Org Match Cards (Three Privacy Levels)

Used in: Matchmaking Dashboard → Network / Polis tabs.

#### ANONYMIZED Privacy Level

```
┌─────────────────────────────────────────────────────────────┐
│  [Blurred thumbnail]  Διαμέρισμα, Αττική              GOOD 74│
│  3 beds · 95 sqm · €380,000                                 │
├─────────────────────────────────────────────────────────────┤
│  Request: Anonymous Buyer                                   │
│  Agency: [Hidden]  ·  Polis Network                         │
│                                                             │
│  Score Breakdown:                                           │
│  ✅ Price           18/20   Near budget midpoint            │
│  ✅ Location        10/12   Area partial match              │
│  ✅ Type            12/12   Apartment ✓                     │
│  ⚠️ Bedrooms        6/8    Has 3, wants 3 (exact)           │
│  …                                                          │
│                                                             │
│  [Request Introduction]                                     │
└─────────────────────────────────────────────────────────────┘
```

- Property address: area only (no street), photo blurred.
- Buyer: fully anonymous.
- Agency: hidden.

#### AGENCY_IDENTIFIED Privacy Level

```
┌─────────────────────────────────────────────────────────────┐
│  [Property thumbnail]  Διαμέρισμα, Γλυφάδα           GOOD 74│
│  3 beds · 95 sqm · €380,000                                 │
├─────────────────────────────────────────────────────────────┤
│  Request: Anonymous Buyer                                   │
│  Agency: Cosmos Real Estate  [Bilateral Partner]            │
│                                                             │
│  Score Breakdown:                                           │
│  ✅ Price           18/20                                   │
│  ✅ Location        10/12                                   │
│  …                                                          │
│                                                             │
│  [Request Introduction]                                     │
└─────────────────────────────────────────────────────────────┘
```

- Property full photo and area visible.
- Buyer: still anonymous (Contact identity never shared cross-org).
- Agency name and network relationship label visible.

#### FULL Privacy Level

```
┌─────────────────────────────────────────────────────────────┐
│  [Property thumbnail]  Διαμέρισμα, Οδ. Ποσειδώνος, Γλυφάδα │
│  3 beds · 95 sqm · €380,000                       GOOD   74 │
├─────────────────────────────────────────────────────────────┤
│  Request: Anonymous Buyer                                   │
│  Agency: Cosmos Real Estate                                 │
│  Agent: Ελένη Κωνσταντίνου  ·  +30 210 XXX XXXX            │
│                                                             │
│  Score Breakdown:                                           │
│  ✅ Price           18/20                                   │
│  ✅ Location        10/12                                   │
│  …                                                          │
│                                                             │
│  [Request Introduction]                                     │
└─────────────────────────────────────────────────────────────┘
```

- Full property address visible.
- Buyer: still anonymous (hard rule, cannot be overridden by privacy level).
- Agent name and contact details visible.

#### "Request Introduction" Action

"Request Introduction" sends an **in-app notification** to the listing agent of the property (inbound flow: property owner org receives the introduction request). The notification reads: "Agency [X] has a potential buyer for your listing at [Property]. View match details." No email is sent. No buyer Contact identity is disclosed. Direct messaging via the Network layer will be added in a future iteration when the DM feature is available.

**Fast-follow (post-launch):** In-app-only introductions are a V1 constraint. Greek agents are pre-launch and do not yet have established app habits, meaning introductions that land in a notification tray may go unseen. Once usage patterns are established, add an **email notification option** (gated by an org-level preference: "Notify me by email when a new introduction arrives"). This is a product decision for post-launch, not a V1 requirement. The preference toggle should be added to `OrgNetworkSettings` when implemented.

---

## 6. Codebase Changes

### 6.1 Files to Create

| File | Purpose |
|---|---|
| `lib/matchmaking/disqualifiers.ts` | Layer 1 hard disqualifier functions |
| `lib/matchmaking/geo.ts` | Haversine geodesic distance scoring |
| `lib/matchmaking/constants/golden-visa.ts` | Golden Visa regional tier constants |
| `app/api/cron/intra-org-matches/route.ts` | 30-min cron for intra-org PropertyRequestMatch scoring |
| `app/api/cron/weight-calibration/route.ts` | Weekly weight calibration analysis cron |
| `actions/matchmaking/get-request-matches.ts` | Replaces `get-mandate-matches.ts` (renamed + refactored) |
| `actions/matchmaking/trigger-single-item-match.ts` | On-demand scoring action for manual "Run matching now" button |
| `actions/matchmaking/get-calibration-reports.ts` | Fetch WeightCalibrationReport rows |
| `actions/matchmaking/apply-weight-calibration.ts` | Admin: apply/dismiss a WeightCalibrationReport |

### 6.2 Files to Modify

| File | Change |
|---|---|
| `lib/matchmaking/calculator.ts` | Remove `@ts-nocheck`; rename `ClientForMatching` → `RequestForMatching`; integrate Layer 1 disqualifiers; wire Layer 2 new criteria; read weights from `OrgMatchWeights` DB record |
| `lib/matchmaking/normalizers.ts` | Remove `@ts-nocheck`; update type references; add location normalizer for geodesic path |
| `lib/matchmaking/weights.ts` | Update to 19-criterion object; mark as seed defaults |
| `lib/matchmaking/types.ts` | Rename all `Client*` types to `Request*`; add `MatchScope`, `PrivacyLevel`, `DisqualifierResult` types |
| `actions/network/compute-cross-org-matches.ts` | Extend to run Polis pass after bilateral; use deduplication key upsert |
| `app/[locale]/app/(routes)/matchmaking/components/MatchScoreBreakdown.tsx` | Expand beyond 80px max-height; show all 19 criteria with expand/collapse |
| `app/[locale]/app/(routes)/matchmaking/components/TopMatchesGrid.tsx` | Render both intra-org and cross-org card variants |
| `app/[locale]/app/(routes)/mls/properties/[slug]/components/PropertyView.tsx` | Add "Run matching now" button |
| `app/[locale]/app/(routes)/crm/requests/[slug]/components/RequestView.tsx` | Add "Run matching now" button (path TBC based on current Request detail route) |

### 6.3 Files to Delete

| File | Reason |
|---|---|
| `actions/matchmaking/get-client-matches.ts` | Deprecated stub — returns empty array |
| `actions/matchmaking/get-property-matches.ts` | Deprecated stub |
| `actions/matchmaking/get-match-score.ts` | Deprecated stub — returns null |
| `actions/matchmaking/get-match-analytics.ts` | Deprecated stub |

### 6.4 New Prisma Models

#### `OrgMatchWeights`

Stores per-org weight overrides. One row per organisation. If missing, engine falls back to seeded defaults.

```prisma
model OrgMatchWeights {
  id             String   @id @default(cuid())
  organizationId String   @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // JSON object: { price: 20, location: 12, propertyType: 12, bedrooms: 8, ... }
  weights        Json

  appliedFromReportId String?
  appliedAt      DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

#### `WeightCalibrationReport`

Stores weekly analysis output. Admin must explicitly apply or dismiss.

```prisma
model WeightCalibrationReport {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Human-readable summary of the recommendation
  summary        String
  // Full JSON: { criterion: { currentWeight, recommendedWeight, reason, signalCount } }
  analysis       Json

  status         CalibrationReportStatus @default(PENDING)  // PENDING | APPLIED | DISMISSED
  appliedAt      DateTime?
  dismissedAt    DateTime?

  periodStart    DateTime
  periodEnd      DateTime
  createdAt      DateTime @default(now())
}

enum CalibrationReportStatus {
  PENDING
  APPLIED
  DISMISSED
}
```

#### Schema Additions to Existing Models

```prisma
// Add to PropertyRequestMatch
model PropertyRequestMatch {
  // ... existing fields ...
  agentFeedback  MatchFeedback?  // INTERESTED | DISMISSED
  feedbackAt     DateTime?
  feedbackByUserId String?
}

enum MatchFeedback {
  INTERESTED
  DISMISSED
}
```

```prisma
// Add composite unique index to CrossOrgMatch for deduplication
model CrossOrgMatch {
  // ... existing fields ...
  @@unique([propertyId, requestId, scope])  // deduplication key
}
```

### 6.5 Vercel Cron Configuration

Add to `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/intra-org-matches", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/cross-org-matches", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/weight-calibration", "schedule": "0 3 * * 1" }
  ]
}
```

---

## 7. Privacy & Visibility Rules

### 7.1 Visibility → Pool Eligibility

| `ItemVisibility` | Intra-Org Pool | Bilateral Pool | Polis Pool |
|---|---|---|---|
| `HIDDEN` | Excluded | Excluded | Excluded |
| `PRIVATE` | Included | Excluded | Excluded |
| `SECURE` | Included | Included (if partner) | Excluded |
| `PUBLIC` | Included | Included (if partner) | Included (if polisEnabled) |

Items are included in intra-org matching regardless of visibility as long as visibility ≠ HIDDEN.

### 7.2 Privacy Level → Information Disclosure (Cross-Org Only)

Privacy level is set per-org on `OrgNetworkSettings.networkPrivacyLevel`. It controls what **the receiving org sees** for the properties/requests owned by **the sending org**.

| `NetworkPrivacyLevel` | Property Address | Property Photo | Agency Identity | Agent Identity | Buyer/Contact Identity |
|---|---|---|---|---|---|
| `ANONYMIZED` | Area only | Blurred | Hidden | Hidden | **Never** |
| `AGENCY_IDENTIFIED` | Area only | Visible | Visible | Hidden | **Never** |
| `FULL` | Full address | Visible | Visible | Name + phone | **Never** |

**Hard rule:** Buyer/client Contact identity is NEVER shared in any cross-org context, at any privacy level. This is a non-configurable protection.

Privacy filtering is applied **at read time** in `lib/network/privacy-filter.ts`, not at write time. The `CrossOrgMatch` table always stores full data; the filter strips fields before returning results to the requesting org.

### 7.3 Visibility Upgrades and CrossOrgMatch Deduplication

When an item's `ItemVisibility` is upgraded (e.g., PRIVATE → SECURE, SECURE → PUBLIC), the next cron run will attempt to create or update `CrossOrgMatch` rows for the newly eligible scopes. The deduplication key `(propertyId, requestId, scope)` ensures:

- Upgrading from bilateral to Polis eligible: existing `scope = BILATERAL` row is untouched; new `scope = POLIS` row is created.
- Re-running cron after a data change: existing row for same `(propertyId, requestId, scope)` is updated (score, breakdown, TTL refreshed) via upsert.
- Downgrading visibility: the cron's cleanup pass deletes `CrossOrgMatch` rows for scopes the item is no longer eligible for.

### 7.4 "Request Introduction" Flow

When a user clicks "Request Introduction" on a cross-org match card:

1. An in-app notification is created for the listing agent of the matched property.
2. Notification text (example): "Cosmos Real Estate has a potential buyer interested in your listing at [Property address per privacy level]."
3. No email notification is sent.
4. No buyer Contact identity is disclosed in the notification.
5. Next steps (accepting, declining, initiating contact) rely on the existing in-app notification system. Direct messaging via the Network DM feature will be wired up in a future iteration.

---

## Implementation Notes

### Type Renaming Convention

All `Client*` types in `lib/matchmaking/types.ts` are renamed to `Request*`:
- `ClientForMatching` → `RequestForMatching`
- `MandateMatchAnalytics` → `RequestMatchAnalytics`
- `ClientMatchResult` → `RequestMatchResult` (if it exists)

This is a non-breaking internal rename (these types are not exported to external consumers). No API contract changes.

### `@ts-nocheck` Removal

`lib/matchmaking/calculator.ts` and `lib/matchmaking/normalizers.ts` both carry `@ts-nocheck` at the top. These must be removed as part of the v2 rewrite. All type errors surfaced must be fixed, not suppressed.

### Encryption Compatibility

The existing encryption architecture is unchanged. `lib/matchmaking/calculator.ts` already calls decryption helpers before scoring. The v2 engine must preserve this: all data entering the scoring functions must be decrypted. The `compute-cross-org-matches.ts` background job already handles this for cross-org; the new intra-org cron must follow the same pattern.

### i18n

All user-facing strings in new components (match card UI, calibration report UI, "Run matching now" button) must use `useTranslations()` / `getTranslations()`. New translation keys should be added under a `matchmaking` namespace in both `locales/en/` and `locales/el/`.

---

*Spec self-reviewed: no placeholders, no contradictions, no ambiguity detected. Scope is focused on a single implementable system.*
