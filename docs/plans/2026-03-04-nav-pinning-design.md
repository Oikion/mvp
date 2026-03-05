# Nav Pinning — Design Document

**Date:** 2026-03-04
**Status:** Approved

## Problem

Users have different daily workflows. A CRM-heavy agent reaches for the CRM item every time they open the app; a listing-focused agent goes straight to MLS. The current nav has no personalization — every item sits in its fixed group position.

## Solution

A "Pinned" section at the top of the sidebar. Users right-click any nav item to pin it. Pins are persisted to the database and sync across devices. Max 5 pins.

## Decisions

| Question | Decision |
|---|---|
| Persistence | Database (`pinnedNavUrls String[]` on `Users`) |
| Pin UX | Right-click context menu on nav items |
| Unpin UX | Right-click context menu in the Pinned section |
| Max pins | 5 |
| Identifier | `NavItem.url` (e.g. `"/app/mls"`) |
| Architecture | Option B — prop drilling via AppSidebar → NavMain |

## Data Layer

### Schema

Add one field to the `Users` model in `prisma/schema.prisma`:

```prisma
pinnedNavUrls  String[]  @default([])
```

URLs are the stable identifier. They already exist on every `NavItem` and are not locale-prefixed (locale is added at render time by `@/navigation`).

### Server Action

`actions/user/pin-nav.ts` — exports `updatePinnedNavUrls(clerkUserId, urls[])`:
- Validates: max 5 URLs, each must be a non-empty string
- Writes to DB via `prismadb.users.update`
- Returns the updated `pinnedNavUrls` array

### Layout

`app/[locale]/app/(routes)/layout.tsx` already fetches user data for `referralBoxDismissed`, `hasReferralCode`, etc. Add `pinnedNavUrls` to the same user fetch and pass it as a prop to `AppSidebar`.

## Component Flow

```
layout.tsx (server)
  → fetches user.pinnedNavUrls from DB
  → passes as prop to <AppSidebar pinnedNavUrls={...} />

AppSidebar (client)
  → const [pinnedUrls, setPinnedUrls] = useState<string[]>(pinnedNavUrls)
  → handleTogglePin(url): optimistic setState, then call server action
  → passes pinnedUrls + onTogglePin to <NavMain>

NavMain
  → derives pinnedItems[] from navGroups where item.url ∈ pinnedUrls
  → renders <NavPinnedSection> first (only when pinnedItems.length > 0)
  → wraps each NavMainMenuItem in shadcn <ContextMenu>
```

### NavPinnedSection

A sub-component inside `components/nav-main.tsx`. Renders identically to a group's item list but:
- No collapsible wrapper — always visible
- Label: i18n `navigation.pinnedSection` ("Pinned" / "Καρφιτσωμένα")
- Uses a pin icon instead of a category icon
- Each item's context menu shows "Unpin" instead of "Pin to top"
- Styled with a neutral border (not colour-coded to a category)

### Context Menu

Each `NavMainMenuItem` is wrapped in shadcn `ContextMenu`. The menu is minimal and does not change normal item appearance or behaviour.

| Item state | Menu entry | Enabled |
|---|---|---|
| Not pinned, count < 5 | "Pin to top" | Yes |
| Not pinned, count = 5 | "Pin to top" (+ limit hint) | No |
| Pinned | "Unpin" | Yes |

## i18n

Four keys added to both `locales/en/navigation.json` and `locales/el/navigation.json` under the `ModuleMenu` namespace:

```json
"pinnedSection": "Pinned",
"pinToTop": "Pin to top",
"unpin": "Unpin",
"pinLimitReached": "Maximum 5 pins"
```

Greek:
```json
"pinnedSection": "Καρφιτσωμένα",
"pinToTop": "Καρφίτσωσε στην κορυφή",
"unpin": "Ξεκαρφίτσωσε",
"pinLimitReached": "Μέγιστο 5 καρφιτσώματα"
```

## Files Changed

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `pinnedNavUrls String[] @default([])` to `Users` |
| `prisma/migrations/…` | Migration for the new field |
| `actions/user/pin-nav.ts` | New server action |
| `app/[locale]/app/(routes)/layout.tsx` | Fetch + pass `pinnedNavUrls` |
| `app/[locale]/app/(routes)/components/AppSidebar.tsx` | Accept prop, manage state, pass to NavMain |
| `components/nav-main.tsx` | NavPinnedSection sub-component + ContextMenu wrappers |
| `locales/en/navigation.json` | 4 new keys |
| `locales/el/navigation.json` | 4 new keys |

## Out of Scope

- Reordering pinned items (drag-and-drop)
- Pinning sub-items (e.g. MLS > Listings individually)
- Per-organisation pin presets set by admins
