# Network Subsystem Feature Flag — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Disable the Network subsystem by default for all orgs and let Platform Admins enable it per-org from the Admin Portal.

**Architecture:** Add `"network"` to the existing `ModuleId` type system, check the existing `OrganizationFeature` table inside `getUserModuleAccess` to strip `"network"` from any org without an enabled record, add a layout-level redirect for hard gating, and surface a toggle in the Platform Admin orgs table.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma (PostgreSQL), Clerk auth, server actions, `next-intl`, shadcn/ui. No schema migration required — `OrganizationFeature` table already has a generic `feature: String` column.

**Design doc:** `docs/plans/2026-03-04-network-feature-flag-design.md`

---

## Task 1: Add `"network"` to the type system

**Files:**
- Modify: `lib/permissions/types.ts` (line 47 — end of ModuleId union)
- Modify: `lib/permissions/defaults.ts` (ALL_MODULES, RESTRICTED_MODULES, MODULE_DISPLAY_NAMES)

### Step 1: Edit `lib/permissions/types.ts`

Find the `ModuleId` type (currently ends at line 47 with `"admin"`). Add `"network"` as the last member:

```ts
export type ModuleId =
  | "dashboard"
  | "feed"
  | "mls"
  | "crm"
  | "calendar"
  | "documents"
  | "reports"
  | "deals"
  | "social"
  | "audiences"
  | "employees"
  | "admin"
  | "network";   // ← add this line
```

### Step 2: Edit `lib/permissions/defaults.ts`

**Add to `ALL_MODULES` array** (currently ends with `"admin"` at line 83):

```ts
export const ALL_MODULES: ModuleId[] = [
  "dashboard",
  "feed",
  "mls",
  "crm",
  "calendar",
  "documents",
  "reports",
  "deals",
  "social",
  "audiences",
  "employees",
  "admin",
  "network",   // ← add this line
];
```

**Add to `RESTRICTED_MODULES`** (after the `admin` entry):

```ts
export const RESTRICTED_MODULES: Record<ModuleId, keyof PermissionConfig | null> = {
  // ... existing entries ...
  admin: "canManageRoles",
  network: null,   // ← add this line (no special permission needed beyond org flag)
};
```

**Add to `MODULE_DISPLAY_NAMES`** (after the `admin` entry):

```ts
export const MODULE_DISPLAY_NAMES: Record<ModuleId, string> = {
  // ... existing entries ...
  admin: "Admin Settings",
  network: "Network",   // ← add this line
};
```

Do **not** add `"network"` to `DEFAULT_VIEWER_MODULES` — the feature is opt-in at the org level.

### Step 3: Verify TypeScript compiles

```bash
pnpm lint
```

Expected: no new errors. The `RESTRICTED_MODULES` and `MODULE_DISPLAY_NAMES` records are typed as `Record<ModuleId, ...>`, so TypeScript will error if `"network"` is missing — confirm it passes after your additions.

### Step 4: Commit

```bash
git add lib/permissions/types.ts lib/permissions/defaults.ts
git commit -m "feat(network): add 'network' module to permission type system"
```

---

## Task 2: Strip `"network"` from orgs without the feature flag

**Files:**
- Modify: `lib/permissions/service.ts` (`getUserModuleAccess` function, lines 99–153)

### Step 1: Read the current `getUserModuleAccess` function

It currently lives at `lib/permissions/service.ts:99`. It returns `[...ALL_MODULES]` for OWNER/LEAD, `ALL_MODULES.filter(m => m !== "admin")` for MEMBER, and role/user-level overrides for VIEWER.

### Step 2: Add org-level network feature check

After the existing module list is computed (before the `return Array.from(modules)` or inline returns), add a check against `OrganizationFeature`. Replace the function body with this:

```ts
async function getUserModuleAccess(
  organizationId: string,
  userId: string,
  role: OrgRole
): Promise<ModuleId[]> {
  // Build the base module list from role
  let modules: Set<ModuleId>;

  if (role === OrgRole.OWNER || role === OrgRole.LEAD) {
    modules = new Set([...ALL_MODULES]);
  } else if (role === OrgRole.MEMBER) {
    modules = new Set(ALL_MODULES.filter((m) => m !== "admin"));
  } else {
    // VIEWER: role-level and user-level overrides
    const [roleAccess, userAccess] = await Promise.all([
      prismadb.roleModuleAccess.findMany({ where: { organizationId, role } }),
      prismadb.userModuleAccess.findMany({ where: { organizationId, userId } }),
    ]);

    if (roleAccess.length === 0) {
      modules = new Set(DEFAULT_VIEWER_MODULES);
    } else {
      modules = new Set(
        roleAccess.filter((r) => r.hasAccess).map((r) => r.moduleId as ModuleId)
      );
    }

    for (const access of userAccess) {
      if (access.hasAccess) {
        modules.add(access.moduleId as ModuleId);
      } else {
        modules.delete(access.moduleId as ModuleId);
      }
    }
  }

  // Org-level feature gate: strip "network" if not enabled for this org
  const networkFeature = await prismadb.organizationFeature.findUnique({
    where: {
      organizationId_feature: {
        organizationId,
        feature: "network",
      },
    },
    select: { isEnabled: true },
  });

  if (!networkFeature?.isEnabled) {
    modules.delete("network");
  }

  return Array.from(modules);
}
```

**Why this is safe:** The original OWNER/LEAD path used early `return` statements. We convert to a `Set` approach so the org-level gate always applies at the end, regardless of role.

### Step 3: Verify no TypeScript errors

```bash
pnpm lint
```

Expected: no errors. The `organizationId_feature` compound unique is defined in `prisma/schema.prisma` on `OrganizationFeature`.

### Step 4: Commit

```bash
git add lib/permissions/service.ts
git commit -m "feat(network): strip 'network' module for orgs without feature flag"
```

---

## Task 3: Add navigation group gate for Network

**Files:**
- Modify: `config/navigation.tsx` (Network group, lines ~146–186)

### Step 1: Find the `networkItems` block

Look for the block starting at around line 146:

```ts
const networkItems: NavItem[] = [
  ...(canAccess("social") ? [...] : []),
  ...
]
```

### Step 2: Wrap entire block with `canAccess("network")`

Replace the block so the outer array is only populated when the org has network enabled:

```ts
const networkItems: NavItem[] = canAccess("network")
  ? [
      ...(canAccess("social")
        ? [
            {
              title: dict.navigation.ModuleMenu.social?.feed || "Feed",
              url: "/app/network/feed",
              icon: SocialFeedIcon,
              isActive: isRouteActive(pathname, "/app/network/feed", locale),
              moduleId: "social" as ModuleId,
              notificationKey: "socialFeed",
            },
            {
              title: dict.navigation.ModuleMenu.social?.profile || "Profile",
              url: "/app/network/profile",
              icon: UserCogIcon,
              isActive: isRouteActive(pathname, "/app/network/profile", locale),
              moduleId: "social" as ModuleId,
              notificationKey: "connections",
            },
            {
              title: dict.navigation.ModuleMenu.social?.messages || "Messages",
              url: "/app/network/messages",
              icon: MessageCircleIcon,
              isActive: isRouteActive(pathname, "/app/network/messages", locale),
              moduleId: "social" as ModuleId,
              notificationKey: "messages",
            },
          ]
        : []),
      ...(canAccess("audiences")
        ? [
            {
              title: dict.navigation.ModuleMenu.social?.audiences || "Audiences",
              url: "/app/network/audiences",
              icon: UsersIcon,
              isActive: isRouteActive(pathname, "/app/network/audiences", locale),
              moduleId: "audiences" as ModuleId,
            },
          ]
        : []),
      ...(canAccess("social")
        ? [
            {
              title: dict.navigation.ModuleMenu.social?.sharedWithMe || "Shared With Me",
              url: "/app/network/shared",
              icon: InboxIcon,
              isActive: isRouteActive(pathname, "/app/network/shared", locale),
              moduleId: "social" as ModuleId,
              notificationKey: "sharedWithMe",
            },
          ]
        : []),
    ]
  : [];
```

The inner `canAccess("social")` / `canAccess("audiences")` checks remain intact — they enforce per-user/per-role access within an org that has network enabled.

### Step 3: Lint

```bash
pnpm lint
```

### Step 4: Commit

```bash
git add config/navigation.tsx
git commit -m "feat(network): gate Network nav group behind canAccess('network')"
```

---

## Task 4: Add route-level hard gate (network layout)

**Files:**
- Create: `app/[locale]/app/(routes)/network/layout.tsx`

### Step 1: Create the file

```tsx
// app/[locale]/app/(routes)/network/layout.tsx
import { redirect } from "next/navigation";
import { canAccessModule } from "@/lib/permissions/service";

export default async function NetworkLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const hasAccess = await canAccessModule("network");
  if (!hasAccess) {
    redirect(`/${locale}/app/dashboard`);
  }

  return <>{children}</>;
}
```

### Step 2: Verify the layout is placed correctly

The file must be at `app/[locale]/app/(routes)/network/layout.tsx`. In Next.js App Router, this layout wraps all routes under `/network/*` — `/network/feed`, `/network/profile`, `/network/messages`, `/network/audiences`, `/network/shared` — all get the gate automatically.

### Step 3: Lint

```bash
pnpm lint
```

### Step 4: Commit

```bash
git add app/[locale]/app/\(routes\)/network/layout.tsx
git commit -m "feat(network): add route-level hard gate to /network layout"
```

---

## Task 5: Add `networkEnabled` to org data and toggle server action

**Files:**
- Modify: `actions/platform-admin/get-organizations.ts`
- Create: `actions/platform-admin/toggle-network-feature.ts`

### Step 1: Edit `get-organizations.ts` — add `networkEnabled` to the type and fetch

**Add `networkEnabled: boolean` to `PlatformOrganization`:**

```ts
export interface PlatformOrganization {
  id: string;
  name: string;
  slug: string | null;
  memberCount: number;
  createdAt: Date;
  imageUrl: string | null;
  networkEnabled: boolean;   // ← add this field
}
```

**Import `prismadb`** at the top of the file (it currently only imports from Clerk and platform-admin):

```ts
import { prismadb } from "@/lib/prisma";
```

**Fetch network feature status in bulk** (efficient: one query for all org IDs on the page, not N+1):

Inside `getPlatformOrganizations`, after building `filteredOrgs` and before the `Promise.all` that maps to `PlatformOrganization[]`, add:

```ts
// Fetch network feature status for all orgs on this page in one query
const orgIds = filteredOrgs.map((org) => org.id);
const networkFeatures = await prismadb.organizationFeature.findMany({
  where: {
    organizationId: { in: orgIds },
    feature: "network",
  },
  select: { organizationId: true, isEnabled: true },
});
const networkEnabledByOrgId = new Map(
  networkFeatures.map((f) => [f.organizationId, f.isEnabled])
);
```

**Use it in the org map:**

```ts
return {
  id: org.id,
  name: org.name,
  slug: org.slug,
  memberCount,
  createdAt: new Date(org.createdAt),
  imageUrl: org.imageUrl,
  networkEnabled: networkEnabledByOrgId.get(org.id) ?? false,   // ← add this
};
```

### Step 2: Create `actions/platform-admin/toggle-network-feature.ts`

```ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";

export interface ToggleNetworkFeatureInput {
  organizationId: string;
  isEnabled: boolean;
}

export async function toggleNetworkFeature(
  input: ToggleNetworkFeatureInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requirePlatformAdmin();
    const { userId } = await auth();

    await prismadb.organizationFeature.upsert({
      where: {
        organizationId_feature: {
          organizationId: input.organizationId,
          feature: "network",
        },
      },
      create: {
        organizationId: input.organizationId,
        feature: "network",
        isEnabled: input.isEnabled,
        grantedBy: userId ?? admin.clerkId,
        grantedAt: input.isEnabled ? new Date() : null,
      },
      update: {
        isEnabled: input.isEnabled,
        grantedBy: input.isEnabled ? (userId ?? admin.clerkId) : undefined,
        grantedAt: input.isEnabled ? new Date() : null,
      },
    });

    await logAdminAction(
      admin.clerkId,
      input.isEnabled ? "ENABLE_NETWORK_FEATURE" : "DISABLE_NETWORK_FEATURE",
      input.organizationId
    );

    return { success: true };
  } catch (error) {
    console.error("[TOGGLE_NETWORK_FEATURE]", error);
    return { success: false, error: "Failed to toggle network feature" };
  }
}
```

### Step 3: Lint

```bash
pnpm lint
```

### Step 4: Commit

```bash
git add actions/platform-admin/get-organizations.ts actions/platform-admin/toggle-network-feature.ts
git commit -m "feat(network): add networkEnabled to org data and toggleNetworkFeature action"
```

---

## Task 6: Add Network toggle to Platform Admin orgs table

**Files:**
- Modify: `app/[locale]/app/(platform_admin)/platform-admin/organizations/components/OrganizationsDataTable.tsx`

### Step 1: Add imports at the top

```tsx
import { Network } from "lucide-react";
import { toggleNetworkFeature } from "@/actions/platform-admin/toggle-network-feature";
```

### Step 2: Add per-row loading state

Inside the component, alongside the existing `actionDialogOpen` state, add:

```tsx
const [networkTogglingOrgId, setNetworkTogglingOrgId] = React.useState<string | null>(null);
```

### Step 3: Add toggle handler

```tsx
const handleToggleNetwork = React.useCallback(
  async (org: PlatformOrganization) => {
    setNetworkTogglingOrgId(org.id);
    try {
      const result = await toggleNetworkFeature({
        organizationId: org.id,
        isEnabled: !org.networkEnabled,
      });
      if (result.success) {
        router.refresh();
      } else {
        // surface error — use whatever toast pattern exists in the file
        console.error("Failed to toggle network:", result.error);
      }
    } finally {
      setNetworkTogglingOrgId(null);
    }
  },
  [router]
);
```

### Step 4: Add menu item in the actions column

Find the `DropdownMenuContent` in the `actions` column definition. Add a new item **above** the `DropdownMenuSeparator` that precedes the destructive actions:

```tsx
<DropdownMenuItem
  onClick={() => handleToggleNetwork(row.original)}
  disabled={networkTogglingOrgId === row.original.id}
>
  {networkTogglingOrgId === row.original.id ? (
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  ) : (
    <Network className="mr-2 h-4 w-4 text-muted-foreground" />
  )}
  {row.original.networkEnabled ? "Disable Network" : "Enable Network"}
</DropdownMenuItem>
```

`Loader2` is already imported in the file (used by `OrganizationActionDialog`). Check the imports at the top and add `Loader2` if it's missing — it comes from `lucide-react`.

### Step 5: Add `networkEnabled` to columns (optional visual indicator)

Optionally, add a status badge column between `createdAt` and `id` to make the state scannable at a glance. Only do this if it fits the table width — otherwise skip it, the dropdown is sufficient.

```tsx
{
  accessorKey: "networkEnabled",
  header: "Network",
  cell: ({ row }) => (
    <span
      className={
        row.original.networkEnabled
          ? "text-xs font-medium text-green-600"
          : "text-xs text-muted-foreground"
      }
    >
      {row.original.networkEnabled ? "Enabled" : "Disabled"}
    </span>
  ),
},
```

### Step 6: Lint

```bash
pnpm lint
```

### Step 7: Commit

```bash
git add "app/[locale]/app/(platform_admin)/platform-admin/organizations/components/OrganizationsDataTable.tsx"
git commit -m "feat(network): add Enable/Disable Network toggle in Platform Admin orgs table"
```

---

## Task 7: Smoke test end-to-end

### Manual verification checklist

1. **Default disabled:** Log in to an org that has no `OrganizationFeature` record for `"network"`. Confirm:
   - Network nav group is absent from the sidebar
   - Navigating to `/app/network/feed` (or any `/network/*` URL) redirects to `/app/dashboard`

2. **Platform Admin enable:** In the Platform Admin portal → Organizations, find the org, open the dropdown, click "Enable Network". Confirm:
   - Row refreshes and shows "Enabled" (if you added the badge column)
   - The dropdown now shows "Disable Network"

3. **Nav appears after enable:** Reload the app session for that org. Confirm Network nav group appears with Feed, Profile, Messages, Audiences, Shared With Me items.

4. **Routes accessible after enable:** Confirm navigating to `/app/network/feed` renders correctly instead of redirecting.

5. **Platform Admin disable:** Disable network for the org. Confirm nav hides again and direct URL access redirects.

6. **Other orgs unaffected:** Confirm orgs without a network feature record remain locked out.

### Build check

```bash
pnpm build
```

Expected: successful build with no TypeScript errors.

---

## Summary of changed files

| File | Type | Change |
|------|------|--------|
| `lib/permissions/types.ts` | Modify | Add `"network"` to `ModuleId` union |
| `lib/permissions/defaults.ts` | Modify | Add `"network"` to ALL_MODULES, RESTRICTED_MODULES, MODULE_DISPLAY_NAMES |
| `lib/permissions/service.ts` | Modify | Org-level network feature check in getUserModuleAccess |
| `config/navigation.tsx` | Modify | Wrap networkItems with `canAccess("network")` outer guard |
| `app/[locale]/app/(routes)/network/layout.tsx` | **Create** | Hard gate: redirect to dashboard if network not enabled |
| `actions/platform-admin/get-organizations.ts` | Modify | Add `networkEnabled` field to PlatformOrganization type + bulk fetch |
| `actions/platform-admin/toggle-network-feature.ts` | **Create** | Server action to upsert OrganizationFeature for "network" |
| `app/[locale]/app/(platform_admin)/platform-admin/organizations/components/OrganizationsDataTable.tsx` | Modify | Add Enable/Disable Network toggle in row actions dropdown |
