# Nav Active State Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the sidebar so that when a nested sub-item is the current page, only the sub-item is highlighted — not its parent nav button.

**Architecture:** Derive `isParentButtonActive` inside `NavMainMenuItem` by checking whether any sub-item URL exactly matches the current path. If yes, suppress the parent button's active highlight. The `Collapsible defaultOpen` continues to use `item.isActive` (prefix match) so the group still auto-expands. No changes to the nav config or route-utils.

**Tech Stack:** React, Next.js App Router, shadcn/ui Sidebar primitives, next-intl

---

### Task 1: Fix parent button active state in NavMainMenuItem

**Files:**
- Modify: `components/nav-main.tsx` (inside `NavMainMenuItem`, ~lines 148–227)

**Context:**
- `currentPath` (`normalizedCurrentPath` after line 207) is the raw pathname from `usePathname()` — next-intl strips the locale prefix so it's already `/app/mls/listings` (no `/el/` prefix)
- Sub-items already compute `isSubItemActive` with exact string match at line 209
- The new `hasActiveSubItem` reuses the same comparison pattern
- `item.isActive` comes from `isRouteActive` (prefix match) in `config/navigation.tsx` — we keep it for `defaultOpen`

**Step 1: Locate the insertion point**

Open `components/nav-main.tsx`. Find `NavMainMenuItem`. The relevant lines are:

```tsx
const normalizedCurrentPath = currentPath.split('?')[0].split('#')[0].replace(/\/$/, '')
```

This appears at line ~207, inside the `.map()` over sub-items. We need to compute `hasActiveSubItem` and `isParentButtonActive` **before** the return statement, in the outer function body (before the sub-item map).

**Step 2: Add the derived active state computation**

In `NavMainMenuItem`, after line 153 (`const notificationCount = ...`), add:

```tsx
// Derive parent button active state:
// When a sub-item exactly matches the current path, suppress parent highlight.
// The Collapsible defaultOpen still uses item.isActive (prefix match) for auto-expand.
const normalizedCurrentPathForParent = currentPath.split('?')[0].split('#')[0].replace(/\/$/, '')
const hasActiveSubItem =
  (item.items ?? []).some(
    (sub) => normalizedCurrentPathForParent === sub.url.replace(/\/$/, '')
  )
const isParentButtonActive = item.items?.length
  ? !hasActiveSubItem && !!item.isActive
  : !!item.isActive
```

**Step 3: Use `isParentButtonActive` in SidebarMenuButton**

Find the `SidebarMenuButton` in `NavMainMenuItem` (line ~158–193). Change:

```tsx
// BEFORE
<SidebarMenuButton
  asChild
  tooltip={item.title}
  isActive={item.isActive}
  ...
>
```

to:

```tsx
// AFTER
<SidebarMenuButton
  asChild
  tooltip={item.title}
  isActive={isParentButtonActive}
  ...
>
```

**Step 4: Verify `defaultOpen` is unchanged**

Confirm the `Collapsible` still uses `item.isActive` (NOT `isParentButtonActive`):

```tsx
<Collapsible asChild defaultOpen={item.isActive}>
```

This must remain as-is so the group auto-expands when navigating to any sub-page.

**Step 5: Manual verification**

Start dev server with `pnpm dev` and test these scenarios in the browser:

| Navigate to | Expected |
|---|---|
| `/app/mls/listings` | "Properties" parent: not highlighted. "Listings" sub-item: highlighted |
| `/app/mls` | "Properties" parent: not highlighted. "All Properties" sub-item: highlighted |
| `/app/documents/templates` | "Documents" parent: not highlighted. "Templates" sub-item: highlighted |
| `/app/crm` (no sub-items) | "Clients" parent: highlighted |

Also verify the collapsible auto-expands correctly for all above routes.

**Step 6: Commit**

```bash
git add components/nav-main.tsx
git commit -m "fix(nav): suppress parent highlight when a sub-item is the active page

When navigating to a nested route like /app/mls/listings, the parent
nav button (Properties) was also highlighted via prefix match. Now the
parent button is suppressed when any sub-item exactly matches the current
path. The Collapsible defaultOpen still uses prefix match for auto-expand."
```
