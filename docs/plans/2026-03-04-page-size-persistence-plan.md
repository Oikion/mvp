# Page Size Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist the user's "rows per page" preference globally across all data tables using a browser cookie.

**Architecture:** A `useTableWithPageSize` wrapper hook around TanStack's `useReactTable` reads a cookie on mount, injects the saved page size into `initialState`, and syncs changes back to the cookie. All 6 data tables swap `useReactTable` → `useTableWithPageSize`. All 5 pagination components extend their page size options to include 100, 250, 500.

**Tech Stack:** TanStack Table v8, native `document.cookie` API (follows existing sidebar.tsx pattern), React `useEffect`

**Design Doc:** `docs/plans/2026-03-04-page-size-persistence-design.md`

---

### Task 1: Create the `useTableWithPageSize` hook

**Files:**
- Create: `lib/hooks/use-table-with-page-size.ts`

**Step 1: Create the hook file**

```ts
// lib/hooks/use-table-with-page-size.ts
"use client";

import { useEffect } from "react";
import { useReactTable, type TableOptions } from "@tanstack/react-table";

const COOKIE_NAME = "oikion-page-size";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds
const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100, 250, 500] as const;

function getPageSizeFromCookie(): number {
  if (typeof document === "undefined") return DEFAULT_PAGE_SIZE;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return DEFAULT_PAGE_SIZE;
  const value = Number(match[1]);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value) ? value : DEFAULT_PAGE_SIZE;
}

function setPageSizeCookie(size: number): void {
  document.cookie = `${COOKIE_NAME}=${size}; path=/; max-age=${COOKIE_MAX_AGE}`;
}

export function useTableWithPageSize<TData>(options: TableOptions<TData>) {
  const savedPageSize = getPageSizeFromCookie();

  const table = useReactTable({
    ...options,
    initialState: {
      ...options.initialState,
      pagination: {
        ...options.initialState?.pagination,
        pageSize: savedPageSize,
      },
    },
  });

  const currentPageSize = table.getState().pagination.pageSize;

  useEffect(() => {
    setPageSizeCookie(currentPageSize);
  }, [currentPageSize]);

  return table;
}
```

**Step 2: Verify the file compiles**

Run: `pnpm exec tsc --noEmit lib/hooks/use-table-with-page-size.ts 2>&1 || echo "Check manually — tsc may need full project context"`

Expected: No errors (or verify via `pnpm build` later)

**Step 3: Commit**

```bash
git add lib/hooks/use-table-with-page-size.ts
git commit -m "feat: add useTableWithPageSize hook with cookie persistence"
```

---

### Task 2: Integrate hook into canonical shared DataTable

**Files:**
- Modify: `components/ui/data-table/data-table.tsx:16,71`

**Step 1: Swap import**

Replace line 16:
```ts
  useReactTable,
```
With:
```ts
  // useReactTable — replaced by useTableWithPageSize
```

Add import after line 24:
```ts
import { useTableWithPageSize } from "@/lib/hooks/use-table-with-page-size";
```

**Step 2: Swap usage**

Replace line 71:
```ts
  const table = useReactTable({
```
With:
```ts
  const table = useTableWithPageSize({
```

**Step 3: Clean up — remove unused `useReactTable` from the tanstack import**

The import block (lines 4-18) should no longer include `useReactTable`. Remove it from the destructured imports.

**Step 4: Commit**

```bash
git add components/ui/data-table/data-table.tsx
git commit -m "feat: integrate useTableWithPageSize into shared DataTable"
```

---

### Task 3: Integrate hook into Accounts DataTable

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/accounts/table-components/data-table.tsx:16,54`

**Step 1: Replace `useReactTable` import with `useTableWithPageSize`**

Remove `useReactTable` from the TanStack import block (line 16).

Add after the TanStack import block:
```ts
import { useTableWithPageSize } from "@/lib/hooks/use-table-with-page-size";
```

**Step 2: Swap usage**

Replace line 54:
```ts
  const table = useReactTable({
```
With:
```ts
  const table = useTableWithPageSize({
```

**Step 3: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/crm/accounts/table-components/data-table.tsx
git commit -m "feat: integrate useTableWithPageSize into Accounts DataTable"
```

---

### Task 4: Integrate hook into Contacts DataTable

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/contacts/table-components/data-table.tsx:16,51`

**Step 1: Replace `useReactTable` import with `useTableWithPageSize`**

Remove `useReactTable` from the TanStack import block (line 16).

Add after the TanStack import block:
```ts
import { useTableWithPageSize } from "@/lib/hooks/use-table-with-page-size";
```

**Step 2: Swap usage**

Replace line 51:
```ts
  const table = useReactTable({
```
With:
```ts
  const table = useTableWithPageSize({
```

**Step 3: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/crm/contacts/table-components/data-table.tsx
git commit -m "feat: integrate useTableWithPageSize into Contacts DataTable"
```

---

### Task 5: Integrate hook into Properties DataTable

**Files:**
- Modify: `app/[locale]/app/(routes)/mls/properties/table-components/data-table.tsx:16,29`

**Step 1: Replace `useReactTable` import with `useTableWithPageSize`**

Remove `useReactTable` from the TanStack import block (line 16).

Add after the TanStack import block:
```ts
import { useTableWithPageSize } from "@/lib/hooks/use-table-with-page-size";
```

**Step 2: Swap usage**

Replace line 29:
```ts
  const table = useReactTable({
```
With:
```ts
  const table = useTableWithPageSize({
```

**Step 3: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/mls/properties/table-components/data-table.tsx
git commit -m "feat: integrate useTableWithPageSize into Properties DataTable"
```

---

### Task 6: Integrate hook into Employees DataTable

**Files:**
- Modify: `app/[locale]/app/(routes)/employees/table-components/data-table.tsx:16,48`

**Step 1: Replace `useReactTable` import with `useTableWithPageSize`**

Remove `useReactTable` from the TanStack import block (line 16).

Add after line 29:
```ts
import { useTableWithPageSize } from "@/lib/hooks/use-table-with-page-size";
```

**Step 2: Swap usage**

Replace line 48:
```ts
  const table = useReactTable({
```
With:
```ts
  const table = useTableWithPageSize({
```

**Step 3: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/employees/table-components/data-table.tsx
git commit -m "feat: integrate useTableWithPageSize into Employees DataTable"
```

---

### Task 7: Integrate hook into Admin Users DataTable

**Files:**
- Modify: `app/[locale]/app/(routes)/admin/users/table-components/data-table.tsx:16,48`

**Step 1: Replace `useReactTable` import with `useTableWithPageSize`**

Remove `useReactTable` from the TanStack import block (line 16).

Add after line 29:
```ts
import { useTableWithPageSize } from "@/lib/hooks/use-table-with-page-size";
```

**Step 2: Swap usage**

Replace line 48:
```ts
  const table = useReactTable({
```
With:
```ts
  const table = useTableWithPageSize({
```

**Step 3: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/admin/users/table-components/data-table.tsx
git commit -m "feat: integrate useTableWithPageSize into Admin Users DataTable"
```

---

### Task 8: Update canonical pagination — extend page size options

**Files:**
- Modify: `components/ui/data-table/data-table-pagination.tsx:44,48`

**Step 1: Import PAGE_SIZE_OPTIONS**

Add import at top:
```ts
import { PAGE_SIZE_OPTIONS } from "@/lib/hooks/use-table-with-page-size";
```

**Step 2: Replace hardcoded array**

Replace line 48:
```tsx
              {[10, 20, 30, 40, 50].map((pageSize) => (
```
With:
```tsx
              {PAGE_SIZE_OPTIONS.map((pageSize) => (
```

**Step 3: Widen the SelectTrigger**

Replace line 44:
```tsx
            <SelectTrigger className="h-8 w-[70px]">
```
With:
```tsx
            <SelectTrigger className="h-8 w-[80px]">
```

**Step 4: Commit**

```bash
git add components/ui/data-table/data-table-pagination.tsx
git commit -m "feat: extend page size options to 500 in canonical pagination"
```

---

### Task 9: Update Accounts pagination — extend page size options

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/accounts/table-components/data-table-pagination.tsx:41,45`

**Step 1: Import PAGE_SIZE_OPTIONS**

Add import at top:
```ts
import { PAGE_SIZE_OPTIONS } from "@/lib/hooks/use-table-with-page-size";
```

**Step 2: Replace hardcoded array**

Replace line 45:
```tsx
              {[10, 20, 30, 40, 50].map((pageSize) => (
```
With:
```tsx
              {PAGE_SIZE_OPTIONS.map((pageSize) => (
```

**Step 3: Widen the SelectTrigger**

Replace line 41:
```tsx
            <SelectTrigger className="h-8 w-[70px]">
```
With:
```tsx
            <SelectTrigger className="h-8 w-[80px]">
```

**Step 4: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/crm/accounts/table-components/data-table-pagination.tsx
git commit -m "feat: extend page size options in Accounts pagination"
```

Note: Properties pagination re-exports from Accounts, so this change covers both Accounts and Properties.

---

### Task 10: Update Contacts pagination — extend page size options

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/contacts/table-components/data-table-pagination.tsx:40,44`

**Step 1: Import PAGE_SIZE_OPTIONS**

Add import at top:
```ts
import { PAGE_SIZE_OPTIONS } from "@/lib/hooks/use-table-with-page-size";
```

**Step 2: Replace hardcoded array**

Replace line 44:
```tsx
              {[10, 20, 30, 40, 50].map((pageSize) => (
```
With:
```tsx
              {PAGE_SIZE_OPTIONS.map((pageSize) => (
```

**Step 3: Widen the SelectTrigger**

Replace line 40:
```tsx
            <SelectTrigger className="h-8 w-[70px]">
```
With:
```tsx
            <SelectTrigger className="h-8 w-[80px]">
```

**Step 4: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/crm/contacts/table-components/data-table-pagination.tsx
git commit -m "feat: extend page size options in Contacts pagination"
```

---

### Task 11: Update Employees pagination — extend page size options

**Files:**
- Modify: `app/[locale]/app/(routes)/employees/table-components/data-table-pagination.tsx:40,44`

**Step 1: Import PAGE_SIZE_OPTIONS**

Add import at top:
```ts
import { PAGE_SIZE_OPTIONS } from "@/lib/hooks/use-table-with-page-size";
```

**Step 2: Replace hardcoded array**

Replace line 44:
```tsx
              {[10, 20, 30, 40, 50].map((pageSize) => (
```
With:
```tsx
              {PAGE_SIZE_OPTIONS.map((pageSize) => (
```

**Step 3: Widen the SelectTrigger**

Replace line 40:
```tsx
            <SelectTrigger className="h-8 w-[70px]">
```
With:
```tsx
            <SelectTrigger className="h-8 w-[80px]">
```

**Step 4: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/employees/table-components/data-table-pagination.tsx
git commit -m "feat: extend page size options in Employees pagination"
```

---

### Task 12: Update Admin Users pagination — extend page size options

**Files:**
- Modify: `app/[locale]/app/(routes)/admin/users/table-components/data-table-pagination.tsx:40,44`

**Step 1: Import PAGE_SIZE_OPTIONS**

Add import at top:
```ts
import { PAGE_SIZE_OPTIONS } from "@/lib/hooks/use-table-with-page-size";
```

**Step 2: Replace hardcoded array**

Replace line 44:
```tsx
              {[10, 20, 30, 40, 50].map((pageSize) => (
```
With:
```tsx
              {PAGE_SIZE_OPTIONS.map((pageSize) => (
```

**Step 3: Widen the SelectTrigger**

Replace line 40:
```tsx
            <SelectTrigger className="h-8 w-[70px]">
```
With:
```tsx
            <SelectTrigger className="h-8 w-[80px]">
```

**Step 4: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/admin/users/table-components/data-table-pagination.tsx
git commit -m "feat: extend page size options in Admin Users pagination"
```

---

### Task 13: Build verification

**Step 1: Run build**

Run: `pnpm build`

Expected: Build succeeds with no errors related to our changes.

**Step 2: Run lint**

Run: `pnpm lint`

Expected: No new lint errors.

**Step 3: Commit any lint fixes if needed**

```bash
git add -A
git commit -m "fix: lint fixes for page size persistence"
```

---

### Task 14: Manual QA checklist

Test in browser:

1. Navigate to Clients page → change "Rows per page" to 50 → verify Select shows 50
2. Navigate away (e.g., to Properties) → verify Properties table also shows 50 rows per page
3. Refresh the page → verify Clients still shows 50 (cookie persisted)
4. Change to 250 on any table → verify all tables use 250
5. Clear cookies → verify tables fall back to 10
6. Verify the dropdown shows all 8 options: 10, 20, 30, 40, 50, 100, 250, 500
