# Local Code Review — 2026-05-16

**Reviewed**: 2026-05-16
**Branch**: staging
**Changed files**: 30 (29 modified + 1 new untracked)
**Decision**: APPROVE with comments

## Summary

Session-authored changes (CMD+K path fixes, keyboard shortcuts, bulk-archive action) are well-implemented: correct multi-tenant auth guards, atomic `$transaction`, proper React patterns. Two pre-existing HIGH issues found in auth pages (missing `organizationId` filter leaking admin contacts across tenants). All validation passes — 0 TypeScript errors, 0 ESLint errors.

---

## Findings

### CRITICAL
None.

### HIGH

**1. Multi-tenant data leak in auth gate pages**
- Files: [inactive/page.tsx](app/[locale]/app/(auth)/inactive/page.tsx#L17), [pending/page.tsx](app/[locale]/app/(auth)/pending/page.tsx#L17)
- The `adminUsers` query fetches all `is_admin: true` users without filtering by `organizationId`. In a multi-tenant system, a user from Org A could see admin contacts from Org B.
- Fix: The Users model has no `organizationId`, so filter by Clerk org membership. Get the user's `organizationId` from `getCurrentUser()`, then find org members via Clerk and cross-reference. Or at minimum, store the org relationship and filter. Given `Users` has no orgId, the simplest fix is to fetch only the current user's org admins via Clerk:
  ```ts
  const { orgId } = await auth();
  const clerkMembers = await clerkClient.organizations.getOrganizationMembershipList({ organizationId: orgId });
  const adminClerkIds = clerkMembers.data
    .filter(m => m.role === "org:admin")
    .map(m => m.publicUserData?.userId).filter(Boolean);
  const adminUsers = await prismadb.users.findMany({
    where: { clerkUserId: { in: adminClerkIds }, userStatus: "ACTIVE" },
  });
  ```

### MEDIUM

**2. `window.open` without opener isolation**
- File: [DocumentsWidget.tsx](app/[locale]/app/(routes)/components/dashboard/DocumentsWidget.tsx#L119)
- `window.open(doc.url, "_blank")` allows the opened tab to access `window.opener`. If `doc.url` is an external or user-controlled URL, this is a tabnapping vector.
- Fix: `window.open(doc.url, "_blank", "noopener,noreferrer")`

**3. Legacy delete endpoint in QuickViewList**
- File: [QuickViewList.tsx](app/[locale]/app/(routes)/components/dashboard/QuickViewList.tsx#L140)
- `deleteEndpoint` for contacts uses `/api/crm/account/${item.id}` — this is the old client-model API route that is fully legacy per project memory. Should use the modern archive pattern (server action `bulkArchiveEntities`) or the correct contacts API route.

**4. Hardcoded `ft²` units**
- File: [QuickViewList.tsx](app/[locale]/app/(routes)/components/dashboard/QuickViewList.tsx#L319)
- Greek real estate uses m² (metric), not ft². Hardcoded `ft²` is incorrect for this market.
- Fix: Change to `m²` or derive from locale/unit setting.

**5. Silent error swallow in `deleteUserOwnedOrganizations`**
- File: [clerk-sync.ts](lib/clerk-sync.ts#L359)
- Empty `catch (error)` block at the per-organization loop level silently discards org deletion failures. Should at minimum `console.error("[deleteUserOwnedOrganizations] org deletion failed", organizationId, error)`.

### LOW

**6. Unused imports**
- [register/[[...rest]]/page.tsx:2](app/[locale]/app/(auth)/register/%5B%5B...rest%5D%5D/page.tsx#L2) — `getTranslations` imported but unused.
- [sign-in/[[...rest]]/page.tsx:2](app/[locale]/app/(auth)/sign-in/%5B%5B...rest%5D%5D/page.tsx#L2) — `getTranslations` imported but unused.

**7. Hardcoded English strings in auth forms**
- [AccessCodeForm.tsx](app/[locale]/app/(auth)/access/AccessCodeForm.tsx) — "Access Code", "Verifying…", "Continue" are not translated.
- [RegisterForm.tsx](app/[locale]/app/(auth)/register/components/RegisterForm.tsx) — Toast messages use hardcoded English.
- [SignInForm.tsx](app/[locale]/app/(auth)/sign-in/components/SignInForm.tsx) — Toast messages use hardcoded English.
- Per project convention, all user-facing strings must use `useTranslations`.

**8. Missing newline at end of `.claude/settings.json`**

---

## Session-authored code: specific review notes

### `bulk-archive-entities.ts` ✅
- Auth guard present: `await auth()` before any DB access
- Permission check: `hasPermission("canDelete")` 
- `$transaction` for atomicity — correct
- Correct Prisma model names after fix: `calendarEvent`, `documents`
- Short-circuit on empty `ids` array avoids unnecessary auth round-trips

### `GlobalSearch.tsx` ✅
- Path prefix bug fixed — `handleQuickAction` prepends `/${locale}/app`, paths now correctly omit `/app`
- Non-existent create routes replaced with list-page routes (correct — creation is sheet-based)
- New Network and Activity sections properly structured

### `KeyboardShortcutsProvider.tsx` ✅
- All route targets verified against file system
- `n` + `u` sequence handlers correctly check `activeSequence === ""` before acting
- Sequence conflict between table-scope `x` and global `g x` correctly scoped

### `PropertyDataTable` / `RequestDataTable` ✅
- `containerRef` + `useTableKeyboard` integration correctly wired
- `DataTableBulkActions` floating pill correctly receives `table` + `actions`
- Keyboard hint bar (J/K/X) rendered below pagination

### `ContactsPageView.tsx` ✅
- Uses shared `DataTable` which already has `useTableKeyboard` — no duplicate implementation
- `handleBulkDelete` correctly wrapped in `useCallback` with stable `[router]` dep
- `contactBulkActions` correctly wrapped in `useMemo`

---

## Validation Results

| Check | Result |
|---|---|
| TypeScript (`pnpm exec tsc --noEmit`) | ✅ Pass — 0 errors |
| ESLint (`pnpm lint`) | ✅ Pass — 0 errors (683 pre-existing warnings) |

---

## Files Reviewed

| File | Type | Notes |
|---|---|---|
| `actions/archive/bulk-archive-entities.ts` | Added | Clean |
| `components/GlobalSearch.tsx` | Modified | Path fixes |
| `hooks/use-keyboard-shortcuts.ts` | Modified | New shortcuts |
| `components/providers/KeyboardShortcutsProvider.tsx` | Modified | Route fixes |
| `app/.../crm/contacts/components/ContactsPageView.tsx` | Modified | Bulk delete |
| `app/.../mls/components/PropertiesPageView.tsx` | Modified | Bulk delete |
| `app/.../requests/components/RequestsPageView.tsx` | Modified | Bulk delete |
| `app/.../mls/.../data-table.tsx` | Modified | Keyboard + bulk |
| `app/.../requests/.../data-table.tsx` | Modified | Keyboard + bulk |
| `app/.../auth/access/AccessCodeForm.tsx` | Modified | LOW: i18n |
| `app/.../auth/inactive/page.tsx` | Modified | HIGH: tenant leak |
| `app/.../auth/pending/page.tsx` | Modified | HIGH: tenant leak |
| `app/.../auth/register/[[...rest]]/page.tsx` | Modified | LOW: unused import |
| `app/.../auth/register/components/RegisterComponent.tsx` | Modified | OK |
| `app/.../auth/register/components/RegisterForm.tsx` | Modified | LOW: i18n |
| `app/.../auth/sign-in/[[...rest]]/page.tsx` | Modified | LOW: unused import |
| `app/.../auth/sign-in/components/LoginComponent.tsx` | Modified | OK |
| `app/.../auth/sign-in/components/SignInForm.tsx` | Modified | LOW: i18n |
| `app/.../dashboard/DashboardHeader.tsx` | Modified | Clean |
| `app/.../dashboard/DocumentsWidget.tsx` | Modified | MEDIUM: opener |
| `app/.../dashboard/MetricCard.tsx` | Modified | Clean |
| `app/.../dashboard/QuickViewList.tsx` | Modified | MEDIUM: legacy API, ft² |
| `app/.../upcoming/components/FeedPage.tsx` | Modified | Clean |
| `app/.../upcoming/page.tsx` | Modified | Clean |
| `locales/en/feed.json` | Modified | Clean |
| `locales/el/feed.json` | Modified | Clean |
| `lib/clerk-sync.ts` | Modified | MEDIUM: silent catch |
| `package.json` | Modified | Clerk version pinned |
| `pnpm-lock.yaml` | Modified | Lock file update |
| `.claude/settings.json` | Modified | ESLint hook added |