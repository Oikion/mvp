# Nav Active State Fix — Design

**Date:** 2026-03-04
**Branch:** feat/property-location-model

## Problem

For nav items with sub-items (e.g. Properties → All Properties / Listings), visiting a sub-page like `/app/mls/listings` highlights both the parent "Properties" button AND the "Listings" sub-item. Only the deepest active page should be highlighted.

**Root cause:** `item.isActive` uses prefix matching (`isRouteActive`) which returns `true` for any path under `/app/mls/`. The `SidebarMenuButton` consumes this directly, so the parent button lights up even when a more-specific sub-item is the current page.

`isActive` currently serves two roles:
1. Visual highlight on the parent button (`SidebarMenuButton isActive`)
2. Auto-open the collapsible (`Collapsible defaultOpen`)

## Design

**Scope:** `components/nav-main.tsx`, `NavMainMenuItem` function only.

**Approach:** Derive `isParentButtonActive` at render time:

```ts
const hasActiveSubItem = item.items?.some(sub =>
  normalizedCurrentPath === sub.url.replace(/\/$/, '')
) ?? false

const isParentButtonActive = item.items?.length
  ? !hasActiveSubItem && !!item.isActive
  : !!item.isActive
```

Use `isParentButtonActive` for `<SidebarMenuButton isActive={...}>`.
Keep `defaultOpen={item.isActive}` (prefix match) for the `Collapsible` — ensures the group auto-expands when on any sub-page.

## Behaviour Matrix

| Current URL | Parent button | Sub-item highlighted |
|---|---|---|
| `/app/mls/listings` | ❌ | "Listings" ✅ |
| `/app/mls` | ❌ | "All Properties" ✅ |
| `/app/mls/properties/123` | ✅ (no sub-item match) | none |
| `/app/crm` (no sub-items) | ✅ | n/a |

## Files Changed

- `components/nav-main.tsx` — `NavMainMenuItem`: compute `hasActiveSubItem` and `isParentButtonActive`

No changes to `config/navigation.tsx`, `lib/navigation/route-utils.ts`, or any other file.
