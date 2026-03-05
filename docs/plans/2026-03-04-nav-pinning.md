# Nav Pinning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users right-click any sidebar nav item to pin it to a persistent "Pinned" section at the top of the sidebar (max 5, stored in DB).

**Architecture:** `pinnedNavUrls String[]` added to the `Users` Prisma model. The layout server component reads it and passes it as a prop to `AppSidebar`, which owns the optimistic state and calls a server action to persist changes. State + handlers flow down to `NavMain` via props.

**Tech Stack:** Prisma (`prismadb.users.update`), Next.js Server Actions (`"use server"`), React `useState` for optimistic UI, shadcn `ContextMenu`, `next-intl` for i18n.

---

## Task 1: Schema — add `pinnedNavUrls` to Users

**Files:**
- Modify: `prisma/schema.prisma` (find the `Users` model, around line 888)

**Step 1: Add field to Users model**

In the `Users` model, add this line alongside the other preference fields (e.g. near `layoutPreference` and `dashboardConfig`):

```prisma
pinnedNavUrls  String[]  @default([])
```

**Step 2: Create and apply the migration**

```bash
pnpm db:migrate
```

When prompted for a migration name, enter: `add_pinned_nav_urls`

Expected: Prisma creates `prisma/migrations/YYYYMMDDHHMMSS_add_pinned_nav_urls/migration.sql` and applies it. The `Users` table gets a new `pinnedNavUrls` column.

**Step 3: Regenerate Prisma client**

```bash
pnpm prisma generate
```

Expected: Client regenerates with `pinnedNavUrls: string[]` on the `Users` type.

**Step 4: Verify**

```bash
pnpm prisma studio
```

Open the `Users` table — you should see a `pinnedNavUrls` column with default `{}` (empty array in Postgres).

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(nav): add pinnedNavUrls field to Users model"
```

---

## Task 2: Server Action — `updatePinnedNavUrls`

**Files:**
- Create: `actions/user/pin-nav.ts`

**Step 1: Create the server action**

```typescript
"use server"

import { getCurrentUser } from "@/lib/get-current-user"
import { prismadb } from "@/lib/prisma"

const MAX_PINS = 5

export async function updatePinnedNavUrls(
  urls: string[]
): Promise<{ success: boolean; pinnedNavUrls?: string[]; error?: string }> {
  try {
    const user = await getCurrentUser()

    if (urls.length > MAX_PINS) {
      return { success: false, error: `Maximum ${MAX_PINS} pins allowed` }
    }

    const updated = await prismadb.users.update({
      where: { id: user.id },
      data: { pinnedNavUrls: urls },
      select: { pinnedNavUrls: true },
    })

    return { success: true, pinnedNavUrls: updated.pinnedNavUrls }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update pinned nav items",
    }
  }
}
```

**Step 2: Commit**

```bash
git add actions/user/pin-nav.ts
git commit -m "feat(nav): add updatePinnedNavUrls server action"
```

---

## Task 3: i18n — add pin-related strings

**Files:**
- Modify: `locales/en/navigation.json`
- Modify: `locales/el/navigation.json`

**Step 1: Add to `locales/en/navigation.json`**

Inside the `"ModuleMenu"` object, add four keys (e.g. after `"platformAdmin"`):

```json
"pinnedSection": "Pinned",
"pinToTop": "Pin to top",
"unpin": "Unpin",
"pinLimitReached": "Maximum 5 pins"
```

**Step 2: Add to `locales/el/navigation.json`**

Same location inside `"ModuleMenu"`:

```json
"pinnedSection": "Καρφιτσωμένα",
"pinToTop": "Καρφίτσωσε στην κορυφή",
"unpin": "Ξεκαρφίτσωσε",
"pinLimitReached": "Μέγιστο 5 καρφιτσώματα"
```

**Step 3: Commit**

```bash
git add locales/en/navigation.json locales/el/navigation.json
git commit -m "feat(nav): add i18n strings for nav pinning"
```

---

## Task 4: Layout — pass `pinnedNavUrls` to AppSidebar

**Files:**
- Modify: `app/[locale]/app/(routes)/layout.tsx`

**Step 1: Read the current layout**

Note: `user` is already fetched via `getCachedUserSafe()` and its full Prisma record is available. After the migration in Task 1, `user.pinnedNavUrls` will be a `string[]`.

**Step 2: Pass the prop to AppSidebar**

Find the `<AppSidebar ...>` JSX block (around line 192) and add the `pinnedNavUrls` prop:

```tsx
<AppSidebar
  modules={modules}
  dict={dict}
  user={{
    name: user.name as string,
    email: user.email as string,
    avatar: user.avatar as string,
  }}
  isPlatformAdmin={userIsPlatformAdmin}
  referralBoxDismissed={user.referralBoxDismissed ?? false}
  hasReferralCode={!!referralCode}
  referralApplicationStatus={user.referralApplicationStatus as "PENDING" | "APPROVED" | "DENIED" | null}
  accessibleModules={permissionContext?.moduleAccess}
  pinnedNavUrls={user.pinnedNavUrls ?? []}
/>
```

**Step 3: Commit**

```bash
git add app/[locale]/app/\(routes\)/layout.tsx
git commit -m "feat(nav): pass pinnedNavUrls from layout to AppSidebar"
```

---

## Task 5: AppSidebar — accept prop, manage state, pass to NavMain

**Files:**
- Modify: `app/[locale]/app/(routes)/components/AppSidebar.tsx`

**Step 1: Read the current file**

Familiarise yourself with `AppSidebarProps` and the `<NavMain>` usage before editing.

**Step 2: Add import**

At the top of the file, add:

```typescript
import { updatePinnedNavUrls } from "@/actions/user/pin-nav"
```

**Step 3: Update AppSidebarProps**

Add `pinnedNavUrls` to the interface:

```typescript
interface AppSidebarProps {
  modules: any
  dict: any
  user: {
    name: string
    email: string
    avatar: string
  }
  isPlatformAdmin?: boolean
  referralBoxDismissed?: boolean
  hasReferralCode?: boolean
  referralApplicationStatus?: "PENDING" | "APPROVED" | "DENIED" | null
  accessibleModules?: ModuleId[]
  pinnedNavUrls?: string[]          // ← add this
}
```

**Step 4: Add state and handler inside AppSidebar component**

After the existing `const [feedbackOpen, ...]` line, add:

```typescript
const [pinnedUrls, setPinnedUrls] = React.useState<string[]>(
  pinnedNavUrls ?? []
)

const handleTogglePin = React.useCallback(async (url: string) => {
  const isCurrentlyPinned = pinnedUrls.includes(url)
  const next = isCurrentlyPinned
    ? pinnedUrls.filter((u) => u !== url)
    : [...pinnedUrls, url].slice(0, 5)

  // Optimistic update
  setPinnedUrls(next)

  // Persist to DB (fire-and-forget with rollback on error)
  const result = await updatePinnedNavUrls(next)
  if (!result.success) {
    // Roll back optimistic update
    setPinnedUrls(pinnedUrls)
  }
}, [pinnedUrls])
```

**Step 5: Add the destructured prop**

In the function signature, destructure `pinnedNavUrls`:

```typescript
export function AppSidebar({
  modules,
  dict,
  user,
  isPlatformAdmin = false,
  referralBoxDismissed = false,
  hasReferralCode = false,
  referralApplicationStatus = null,
  accessibleModules,
  pinnedNavUrls,         // ← add
}: AppSidebarProps) {
```

**Step 6: Pass to NavMain**

Update the `<NavMain>` call inside the JSX:

```tsx
<NavMain
  groups={navGroups}
  pathname={normalizePath(pathname, locale)}
  notificationCounts={notificationCounts}
  pinnedUrls={pinnedUrls}
  onTogglePin={handleTogglePin}
/>
```

**Step 7: Commit**

```bash
git add app/[locale]/app/\(routes\)/components/AppSidebar.tsx
git commit -m "feat(nav): manage pin state in AppSidebar and pass to NavMain"
```

---

## Task 6: NavMain — NavPinnedSection + ContextMenu wrappers

This is the largest task. Read `components/nav-main.tsx` fully before starting.

**Files:**
- Modify: `components/nav-main.tsx`

**Step 1: Add ContextMenu imports**

At the top of the file, add:

```typescript
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Pin, PinOff } from "lucide-react"
```

**Step 2: Update NavMainItem interface**

The interface is already defined at the top of the file. No changes needed — pinning is handled by the parent via `pinnedUrls`.

**Step 3: Add `NavPinnedSection` component**

Add this new component between the existing `getCategoryStyle` function and the `NavMainMenuItem` component:

```typescript
function NavPinnedSection({
  items,
  pathname,
  notificationCounts = {},
  onTogglePin,
  dict,
}: {
  readonly items: NavMainItem[]
  readonly pathname: string
  readonly notificationCounts?: NotificationCounts
  readonly onTogglePin: (url: string) => void
  readonly dict?: any
}) {
  const label = dict?.navigation?.ModuleMenu?.pinnedSection ?? "Pinned"

  return (
    <SidebarGroup className="py-0 mb-1">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Pin className="h-4 w-4 text-sidebar-foreground/50" />
        <span className="text-[13px] font-bold tracking-normal text-sidebar-foreground group-data-[collapsible=icon]:hidden">
          {label}
        </span>
      </div>
      <SidebarMenu className="mt-0.5 border-l-2 ml-2 pl-1 border-l-sidebar-foreground/20">
        {items.map((item, index) => (
          <PinnableNavItem
            key={item.url || `pinned-${index}`}
            item={item}
            pathname={pathname}
            notificationCounts={notificationCounts}
            isPinned={true}
            pinsCount={items.length}
            onTogglePin={onTogglePin}
            dict={dict}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
```

**Step 4: Create `PinnableNavItem` wrapper**

Add this component directly above `NavPinnedSection`. It wraps `NavMainMenuItem` with a right-click context menu:

```typescript
function PinnableNavItem({
  item,
  pathname,
  notificationCounts = {},
  isPinned,
  pinsCount,
  onTogglePin,
  dict,
}: {
  readonly item: NavMainItem
  readonly pathname: string
  readonly notificationCounts?: NotificationCounts
  readonly isPinned: boolean
  readonly pinsCount: number
  readonly onTogglePin: (url: string) => void
  readonly dict?: any
}) {
  const MAX_PINS = 5
  const canPin = !isPinned && pinsCount < MAX_PINS
  const atLimit = !isPinned && pinsCount >= MAX_PINS

  const pinLabel = dict?.navigation?.ModuleMenu?.pinToTop ?? "Pin to top"
  const unpinLabel = dict?.navigation?.ModuleMenu?.unpin ?? "Unpin"
  const limitLabel = dict?.navigation?.ModuleMenu?.pinLimitReached ?? "Maximum 5 pins"

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>
          <NavMainMenuItem
            item={item}
            pathname={pathname}
            notificationCounts={notificationCounts}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {isPinned ? (
          <ContextMenuItem
            onSelect={() => onTogglePin(item.url)}
            className="gap-2"
          >
            <PinOff className="h-4 w-4 text-muted-foreground" />
            {unpinLabel}
          </ContextMenuItem>
        ) : canPin ? (
          <ContextMenuItem
            onSelect={() => onTogglePin(item.url)}
            className="gap-2"
          >
            <Pin className="h-4 w-4 text-muted-foreground" />
            {pinLabel}
          </ContextMenuItem>
        ) : (
          <ContextMenuItem disabled className="gap-2">
            <Pin className="h-4 w-4 text-muted-foreground" />
            {limitLabel}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
```

**Step 5: Update `CollapsibleNavGroup` to use `PinnableNavItem`**

Find the `CollapsibleNavGroup` component. Its props interface needs two additions:

```typescript
// Add to CollapsibleNavGroup props:
readonly pinnedUrls?: string[]
readonly onTogglePin?: (url: string) => void
readonly dict?: any
```

Inside the component, replace the `NavMainMenuItem` render with `PinnableNavItem`:

```tsx
{group.items.map((item, index) => (
  <PinnableNavItem
    key={item.url || `${item.title}-${index}`}
    item={item}
    pathname={pathname}
    notificationCounts={notificationCounts}
    isPinned={pinnedUrls?.includes(item.url) ?? false}
    pinsCount={pinnedUrls?.length ?? 0}
    onTogglePin={onTogglePin ?? (() => {})}
    dict={dict}
  />
))}
```

**Step 6: Update `NavMain` props and rendering**

Find the `NavMain` function. Update its props to accept the new values:

```typescript
export function NavMain({
  groups,
  pathname = "",
  notificationCounts = {},
  pinnedUrls = [],
  onTogglePin,
  dict,
}: {
  readonly groups: NavGroup[]
  readonly pathname?: string
  readonly notificationCounts?: NotificationCounts
  readonly pinnedUrls?: string[]
  readonly onTogglePin?: (url: string) => void
  readonly dict?: any
}) {
```

Inside `NavMain`, derive the pinned items and render the section. Replace the existing `return` block:

```tsx
const currentPath = pathname || ""

const pinnedItems = React.useMemo(() => {
  if (!pinnedUrls.length) return []
  const allItems = groups.flatMap((g) => g.items)
  return pinnedUrls
    .map((url) => allItems.find((item) => item.url === url))
    .filter((item): item is NavMainItem => item !== undefined)
}, [pinnedUrls, groups])

const shouldShowAlphaBadge = (label: string) => {
  const alphaLabels = ["Tools", "Network", "Εργαλεία", "Δίκτυο"]
  return alphaLabels.includes(label)
}

return (
  <>
    {pinnedItems.length > 0 && (
      <NavPinnedSection
        items={pinnedItems}
        pathname={currentPath}
        notificationCounts={notificationCounts}
        onTogglePin={onTogglePin ?? (() => {})}
        dict={dict}
      />
    )}
    {groups.map((group, groupIndex) => (
      <CollapsibleNavGroup
        key={group.label || `group-${groupIndex}`}
        group={group}
        pathname={currentPath}
        defaultOpen={true}
        showAlphaBadge={shouldShowAlphaBadge(group.label)}
        notificationCounts={notificationCounts}
        pinnedUrls={pinnedUrls}
        onTogglePin={onTogglePin}
        dict={dict}
      />
    ))}
  </>
)
```

**Step 7: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | head -40
```

Expected: No TypeScript errors. If there are errors, fix them before committing.

**Step 8: Commit**

```bash
git add components/nav-main.tsx
git commit -m "feat(nav): add NavPinnedSection and context menu pin/unpin UI"
```

---

## Task 7: Pass `dict` through AppSidebar → NavMain

The `dict` prop already exists in `AppSidebar` but was not previously forwarded to `NavMain`. This task wires it through.

**Files:**
- Modify: `app/[locale]/app/(routes)/components/AppSidebar.tsx`

**Step 1: Update the NavMain call**

In `AppSidebar`, the `<NavMain>` call already has `groups`, `pathname`, `notificationCounts` after Task 5. Add `dict`:

```tsx
<NavMain
  groups={navGroups}
  pathname={normalizePath(pathname, locale)}
  notificationCounts={notificationCounts}
  pinnedUrls={pinnedUrls}
  onTogglePin={handleTogglePin}
  dict={dict}
/>
```

**Step 2: Commit**

```bash
git add app/[locale]/app/\(routes\)/components/AppSidebar.tsx
git commit -m "feat(nav): forward dict to NavMain for pin i18n strings"
```

---

## Task 8: Smoke test

**Step 1: Start the dev server**

```bash
pnpm dev:http
```

**Step 2: Manual test checklist**

1. Open the app sidebar
2. Right-click the "Properties" (MLS) nav item → menu should show "Pin to top"
3. Click "Pin to top" → a "Pinned" section appears at the top of the sidebar containing Properties
4. Right-click "Clients" (CRM) → "Pin to top" → CRM appears in Pinned section
5. Refresh the page → both pins are still there (DB persistence confirmed)
6. Right-click the Properties item in the **Pinned** section → "Unpin" → Properties is removed from Pinned
7. Pin 5 items → right-click a 6th unpinned item → menu should show disabled "Maximum 5 pins"
8. Switch locale (en ↔ el) → Pinned section label and context menu strings update correctly
9. Right-click a nav item in the sidebar collapsed (icon-only) mode → context menu should still appear

**Step 3: Commit (if any fixes were needed during smoke test)**

```bash
git add -p
git commit -m "fix(nav): address smoke test findings"
```

---

## Task 9: Final verification

```bash
pnpm build
pnpm lint
```

Expected: Clean build and lint. Fix any issues before proceeding.

```bash
git add -p
git commit -m "fix(nav): lint and build clean-up"
```
