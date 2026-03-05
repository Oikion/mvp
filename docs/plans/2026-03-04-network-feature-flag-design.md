# Network Subsystem Feature Flag — Design

**Date:** 2026-03-04
**Status:** Approved
**Branch:** feat/property-location-model (implement on top)

## Problem

The Network subsystem (`/app/network/*`) — social feed, profile, messages, audiences, shared — should be **disabled by default** for all organizations. Platform Admins need a way to enable it per org from the Admin Portal.

## Decision

**Hard gate via Option A:** hook the org-level feature flag into the existing module/permission system so that a single check point drives both nav hiding and route blocking.

## Architecture

### 1. Type System (`lib/permissions/types.ts`, `lib/permissions/defaults.ts`)

- Add `"network"` to `ModuleId` union type
- Add `"network"` to `ALL_MODULES` array
- Add `"network": null` to `RESTRICTED_MODULES` (no extra permission required beyond org flag)
- Add `"network": "Network"` to `MODULE_DISPLAY_NAMES`
- Do **not** add `"network"` to `DEFAULT_VIEWER_MODULES` (opt-in only)

### 2. Permission Service (`lib/permissions/service.ts`)

In `getUserModuleAccess`, after computing role-based modules, query:

```ts
OrganizationFeature.findUnique({ where: { organizationId_feature: { organizationId, feature: "network" } } })
```

If the record doesn't exist **or** `isEnabled === false`, remove `"network"` from the returned array regardless of role. This is the single source of truth for org-level network access.

### 3. Navigation (`config/navigation.tsx`)

Wrap the entire `networkItems` block in a top-level `canAccess("network")` guard:

```ts
const networkItems: NavItem[] = canAccess("network") ? [
  ...(canAccess("social") ? [feed, profile, messages, sharedWithMe] : []),
  ...(canAccess("audiences") ? [audiences] : []),
] : [];
```

Existing per-item `canAccess("social")` / `canAccess("audiences")` checks stay for per-user/per-role control within orgs that have network enabled. Layered: org gate → user gate.

### 4. Route Hard Gate (new file)

**File:** `app/[locale]/app/(routes)/network/layout.tsx`

Server component that:
1. Gets locale from params
2. Calls `canAccessModule("network")`
3. If `false` → `redirect(/${locale}/app/dashboard)`
4. If `true` → renders `{children}`

### 5. Platform Admin UI

**`actions/platform-admin/get-organizations.ts`**
- Join `OrganizationFeature` for `feature: "network"` in the org fetch
- Add `networkEnabled: boolean` to the `PlatformOrganization` type

**`actions/platform-admin/toggle-network-feature.ts`** (new)
- Server action `toggleNetworkFeature({ organizationId, isEnabled })`
- Upserts `OrganizationFeature` with `feature: "network"`, tracks `grantedBy` admin userId
- Returns `{ success: boolean, error?: string }`

**`OrganizationsDataTable.tsx`**
- Add "Enable Network" / "Disable Network" item to the existing row-actions `DropdownMenu`
- Inline loading state per row during toggle
- Calls `toggleNetworkFeature`, then `router.refresh()`

## Data Flow

```
Platform Admin toggles Network for Org X
  → toggleNetworkFeature() upserts OrganizationFeature { feature: "network", isEnabled }
  → Next request for any user in Org X
  → getUserModuleAccess() queries OrganizationFeature → strips/keeps "network"
  → canAccess("network") = false/true
  → Nav hides/shows Network group
  → /network/layout.tsx redirects or renders children
```

## No Schema Migration Required

`OrganizationFeature` table already exists with a generic `feature: String` field. No Prisma migration needed.

## Files Changed

| File | Change |
|------|--------|
| `lib/permissions/types.ts` | Add `"network"` to `ModuleId` |
| `lib/permissions/defaults.ts` | Add `"network"` to ALL_MODULES, RESTRICTED_MODULES, MODULE_DISPLAY_NAMES |
| `lib/permissions/service.ts` | Check OrganizationFeature in getUserModuleAccess |
| `config/navigation.tsx` | Wrap networkItems with `canAccess("network")` |
| `app/[locale]/app/(routes)/network/layout.tsx` | New — hard gate redirect |
| `actions/platform-admin/get-organizations.ts` | Include networkEnabled per org |
| `actions/platform-admin/toggle-network-feature.ts` | New — server action |
| `app/[locale]/app/(platform_admin)/platform-admin/organizations/components/OrganizationsDataTable.tsx` | Add toggle to row actions |
