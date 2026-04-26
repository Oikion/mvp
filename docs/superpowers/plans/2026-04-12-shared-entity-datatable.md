# Shared EntityDataTable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge all five entity list tables (Properties, Contacts, Requests, Documents, Deals) onto the shared `DataTable` component with consistent column structure, full-row click navigation, and uniform inline editing.

**Architecture:** The shared `DataTable` at `components/ui/data-table/data-table.tsx` already has `onRowOpen`, keyboard navigation, bulk actions, and toolbar built in. Entity-specific bespoke wrappers (`ContactsDataTable`, `MandateDataTable`, `DocumentDataTable`, and `DealsList`) are replaced by wiring `onRowOpen` into the shared component. Inline editing cell components in each entity's `table-components/cells/` folder remain as-is; only Contacts and Deals need new cell components added. The standard column order is: **select | createdAt | assignedTo | title | [entity-specific] | actions**.

**Tech Stack:** TanStack Table v8, Next.js App Router, next-intl, SWR (`router.refresh()`), `EditableTextCell`, `EditableSelectCell`, `DataTableRowActions` (shared), Tailwind CSS

---

## File Structure

### Files to DELETE (bespoke wrappers superseded by shared DataTable)
- `app/[locale]/app/(routes)/crm/contacts/table-components/data-table.tsx` — replaced by shared DataTable
- `app/[locale]/app/(routes)/mandates/table-components/data-table.tsx` — replaced by shared DataTable
- `app/[locale]/app/(routes)/documents/table-components/data-table.tsx` — replaced by shared DataTable

### Files to CREATE
- `app/[locale]/app/(routes)/crm/contacts/table-components/cells/StatusCell.tsx` — inline-edit contact status
- `app/[locale]/app/(routes)/crm/contacts/table-components/cells/AssignedUserCell.tsx` — inline-edit assigned agent
- `app/[locale]/app/(routes)/deals/table-components/cells/StageCell.tsx` — inline-edit deal stage
- `app/[locale]/app/(routes)/deals/table-components/cells/DealTypeCell.tsx` — inline-edit deal type
- `app/[locale]/app/(routes)/deals/table-components/cells/ListingAgentCell.tsx` — inline-edit listing agent
- `app/[locale]/app/(routes)/deals/table-components/cells/BuyerAgentCell.tsx` — inline-edit buyer agent
- `app/[locale]/app/(routes)/deals/table-components/cells/TitleCell.tsx` — inline-edit deal title
- `app/[locale]/app/(routes)/deals/table-components/columns.tsx` — new TanStack ColumnDef[] factory
- `app/[locale]/app/(routes)/deals/table-components/DealRowActions.tsx` — extracted from DealsList.tsx

### Files to MODIFY
- `app/[locale]/app/(routes)/crm/contacts/table-components/columns.tsx` — add select col, actions col, inline cell components, pass `users[]`; change factory signature to `getContactColumns(users[])`
- `app/[locale]/app/(routes)/crm/contacts/components/ContactsPageView.tsx` — replace `ContactsDataTable` with shared `DataTable`, wire `onRowOpen`
- `app/[locale]/app/(routes)/mandates/table-components/columns.tsx` — rename `mandateId` → `requestId` in all cell props, fix client link `/crm/clients/` → `/crm/contacts/`
- `app/[locale]/app/(routes)/mandates/table-components/cells/*.tsx` — rename `mandateId` prop to `requestId` in all 6 cell files
- `app/[locale]/app/(routes)/mandates/components/MandatesPageView.tsx` — replace `MandateDataTable` with shared `DataTable`, wire `onRowOpen`
- `app/[locale]/app/(routes)/documents/components/DocumentsPageView.tsx` — replace `DocumentDataTable` with shared `DataTable`, wire `onRowOpen`
- `app/[locale]/app/(routes)/deals/components/DealsList.tsx` — gutted: remove custom table render; keep `DealRow` type export; delegate to shared `DataTable` + new columns
- `app/[locale]/app/(routes)/mls/components/PropertiesView.tsx` — already uses shared DataTable with `onRowOpen`; update `router.push` path to use locale-aware router (verify)

---

## Task 1: Add select + actions columns to Contacts, wire shared DataTable

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/contacts/table-components/columns.tsx`
- Modify: `app/[locale]/app/(routes)/crm/contacts/components/ContactsPageView.tsx`
- Delete: `app/[locale]/app/(routes)/crm/contacts/table-components/data-table.tsx`

Context: `ContactsPageView.tsx` currently uses `ContactsDataTable` (a bespoke local wrapper). We replace it with the shared `DataTable` from `@/components/ui/data-table/data-table`. The `getContactColumns()` factory needs a select checkbox column and an actions column. The actions column uses the existing `ContactRowActions` component which already wraps `DataTableRowActions`.

- [ ] **Step 1: Update column factory signature to accept users and add select + actions columns**

Edit `app/[locale]/app/(routes)/crm/contacts/table-components/columns.tsx`:

```typescript
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import {
  DataTableSelectCheckbox,
  DataTableSelectAllCheckbox,
} from "@/components/ui/data-table/data-table-select-checkbox";
import { cn } from "@/lib/utils";
import { Building2, User } from "lucide-react";
import { format } from "date-fns";
import { ContactRowActions } from "./ContactRowActions";

const STATUS_COLORS: Record<string, string> = {
  LEAD: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  CONTACTED: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  QUALIFIED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  UNDER_CONTRACT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  COMPLETED: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  ON_HOLD: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  INACTIVE: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const CATEGORY_COLORS: Record<string, string> = {
  OWNER: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  BUYER: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  TENANT: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  SELLER: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  INVESTOR: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  BROKER: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
};

export interface ContactRow {
  id: string;
  friendlyId: string;
  displayName: string;
  isCompany?: boolean;
  email?: string | null;
  primaryPhone?: string | null;
  status: string;
  category?: string[];
  source?: string | null;
  assignedAgent?: { id: string; name: string | null } | null;
  createdAt: string | Date;
}

export function getContactColumns(
  users: { id: string; name: string | null }[] = []
): ColumnDef<ContactRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => <DataTableSelectAllCheckbox table={table} />,
      cell: ({ row, table }) => <DataTableSelectCheckbox row={row} table={table} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        const t = useTranslations("crm");
        return <DataTableColumnHeader column={column} title={t("contacts.table.created")} />;
      },
      cell: ({ row }) => {
        const date = row.getValue("createdAt");
        return (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {date ? format(new Date(date as string), "dd/MM/yy") : "—"}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: "assignedAgent",
      header: ({ column }) => {
        const t = useTranslations("crm");
        return <DataTableColumnHeader column={column} title={t("contacts.table.assignedTo")} />;
      },
      cell: ({ row }) => {
        const agent = row.original.assignedAgent;
        return <span className="text-sm">{agent?.name || "—"}</span>;
      },
      enableSorting: false,
    },
    {
      accessorKey: "displayName",
      header: ({ column }) => {
        const t = useTranslations("crm");
        return <DataTableColumnHeader column={column} title={t("contacts.table.name")} />;
      },
      cell: ({ row }) => {
        const contact = row.original;
        return (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                contact.isCompany ? "bg-amber-100 dark:bg-amber-900/30" : "bg-primary/10"
              )}
            >
              {contact.isCompany ? (
                <Building2 className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
              ) : (
                <User className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate max-w-[200px]">{contact.displayName}</p>
              <p className="text-xs text-muted-foreground">{contact.friendlyId}</p>
            </div>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "email",
      header: ({ column }) => {
        const t = useTranslations("crm");
        return <DataTableColumnHeader column={column} title={t("contacts.table.email")} />;
      },
      cell: ({ row }) => (
        <span className="text-sm truncate max-w-[180px] block">{row.getValue("email") || "—"}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "primaryPhone",
      header: ({ column }) => {
        const t = useTranslations("crm");
        return <DataTableColumnHeader column={column} title={t("contacts.table.phone")} />;
      },
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("primaryPhone") || "—"}</span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        const t = useTranslations("crm");
        return <DataTableColumnHeader column={column} title={t("contacts.table.status")} />;
      },
      cell: ({ row }) => {
        const t = useTranslations("crm");
        const status = row.getValue("status") as string;
        return (
          <Badge
            className={cn("text-[10px]", STATUS_COLORS[status] || STATUS_COLORS.LEAD)}
            variant="secondary"
          >
            {t(`contacts.status.${status}` as Parameters<typeof t>[0])}
          </Badge>
        );
      },
      enableSorting: true,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: "category",
      header: ({ column }) => {
        const t = useTranslations("crm");
        return <DataTableColumnHeader column={column} title={t("contacts.table.categories")} />;
      },
      cell: ({ row }) => {
        const t = useTranslations("crm");
        const categories = (row.getValue("category") as string[]) || [];
        if (categories.length === 0) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 2).map((cat) => (
              <Badge
                key={cat}
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0", CATEGORY_COLORS[cat])}
              >
                {t(`contacts.category.${cat}` as Parameters<typeof t>[0])}
              </Badge>
            ))}
            {categories.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{categories.length - 2}
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      cell: ({ row }) => <ContactRowActions row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
```

- [ ] **Step 2: Update ContactsPageView to use shared DataTable**

In `app/[locale]/app/(routes)/crm/contacts/components/ContactsPageView.tsx`:

Replace the import:
```typescript
// REMOVE:
import { ContactsDataTable } from "../table-components/data-table";
// ADD:
import { DataTable } from "@/components/ui/data-table/data-table";
```

Find the `getContactColumns` call and the `ContactsDataTable` component usage. Add a `handleRowOpen` callback (look for existing `useRouter` import — it should already exist for navigation in the page, or add it):

```typescript
// Near the top of the component, add:
const router = useRouter();  // import { useRouter } from "@/navigation"
const locale = useLocale();  // import { useLocale } from "next-intl"

const handleRowOpen = React.useCallback(
  (row: Row<ContactRow>) => {
    router.push(`/app/crm/contacts/${row.original.friendlyId}`);
  },
  [router]
);
```

Replace the `<ContactsDataTable>` JSX with:
```tsx
<DataTable
  columns={getContactColumns(users)}
  data={contacts}
  searchKey="displayName"
  searchPlaceholder={t("contacts.searchPlaceholder")}
  onRowOpen={handleRowOpen}
/>
```

Note: `users` is the org members array already available in `ContactsPageView`. Check what prop name it uses — likely `members` or `users`. Read the file before editing if unsure.

- [ ] **Step 3: Delete the bespoke ContactsDataTable wrapper**

```bash
rm "app/[locale]/app/(routes)/crm/contacts/table-components/data-table.tsx"
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | grep "contacts" | head -20
```

Expected: no errors referencing contacts table files.

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/crm/contacts/table-components/columns.tsx \
        app/\[locale\]/app/\(routes\)/crm/contacts/components/ContactsPageView.tsx
git rm app/\[locale\]/app/\(routes\)/crm/contacts/table-components/data-table.tsx
git commit -m "feat(contacts): migrate to shared DataTable with row navigation"
```

---

## Task 2: Fix Requests/Mandates — rename mandateId → requestId, fix client link, wire shared DataTable

**Files:**
- Modify: `app/[locale]/app/(routes)/mandates/table-components/cells/AssignedUserCell.tsx`
- Modify: `app/[locale]/app/(routes)/mandates/table-components/cells/BudgetCell.tsx`
- Modify: `app/[locale]/app/(routes)/mandates/table-components/cells/StatusCell.tsx`
- Modify: `app/[locale]/app/(routes)/mandates/table-components/cells/TitleCell.tsx`
- Modify: `app/[locale]/app/(routes)/mandates/table-components/cells/TransactionTypeCell.tsx`
- Modify: `app/[locale]/app/(routes)/mandates/table-components/cells/UrgencyCell.tsx`
- Modify: `app/[locale]/app/(routes)/mandates/table-components/columns.tsx`
- Modify: `app/[locale]/app/(routes)/mandates/components/MandatesPageView.tsx`
- Delete: `app/[locale]/app/(routes)/mandates/table-components/data-table.tsx`

Context: All 6 cell files have a `mandateId: string` prop. Rename it to `requestId` throughout. In `columns.tsx`, fix the client link from `/crm/clients/${first.friendlyId}` to `/crm/contacts/${first.friendlyId}`. Then replace `MandateDataTable` with shared `DataTable` in `MandatesPageView.tsx`.

- [ ] **Step 1: Rename mandateId → requestId in AssignedUserCell.tsx**

Edit `app/[locale]/app/(routes)/mandates/table-components/cells/AssignedUserCell.tsx`:

Find: `mandateId: string;` in the interface → replace with `requestId: string;`
Find: `mandateId,` in destructuring → replace with `requestId,`
Find: `id: mandateId,` in the `updateMandate` call → replace with `id: requestId,`
Find: `mandateId={row.original.id}` in columns.tsx → will be done in Step 4.

Full file content after rename (read the file first to get the full content, then apply these changes):
- Interface prop: `mandateId: string` → `requestId: string`
- Destructured param: `mandateId` → `requestId`  
- Body: `id: mandateId` → `id: requestId`

- [ ] **Step 2: Rename mandateId → requestId in BudgetCell.tsx, StatusCell.tsx, TitleCell.tsx, TransactionTypeCell.tsx, UrgencyCell.tsx**

Apply the same three-point rename to each file:
1. Interface: `mandateId: string` → `requestId: string`
2. Destructuring: `mandateId` → `requestId`
3. Usage in action call body: `id: mandateId` → `id: requestId`

- [ ] **Step 3: Update columns.tsx — rename props and fix client link**

In `app/[locale]/app/(routes)/mandates/table-components/columns.tsx`:

Change all cell prop references from `mandateId={row.original.id}` to `requestId={row.original.id}`:
```tsx
// BEFORE (6 occurrences):
<TitleCell mandateId={row.original.id} value={row.original.title} />
<AssignedUserCell mandateId={row.original.id} assignedTo={row.original.assigned_to} users={users} />
<TransactionTypeCell mandateId={row.original.id} transactionType={row.original.transaction_type} />
<BudgetCell mandateId={row.original.id} budgetMin={row.original.budget_min} budgetMax={row.original.budget_max} />
<StatusCell mandateId={row.original.id} status={row.original.status} />
<UrgencyCell mandateId={row.original.id} urgency={row.original.urgency} />

// AFTER:
<TitleCell requestId={row.original.id} value={row.original.title} />
<AssignedUserCell requestId={row.original.id} assignedTo={row.original.assigned_to} users={users} />
<TransactionTypeCell requestId={row.original.id} transactionType={row.original.transaction_type} />
<BudgetCell requestId={row.original.id} budgetMin={row.original.budget_min} budgetMax={row.original.budget_max} />
<StatusCell requestId={row.original.id} status={row.original.status} />
<UrgencyCell requestId={row.original.id} urgency={row.original.urgency} />
```

Fix the client column link:
```tsx
// BEFORE:
href={`/app/crm/clients/${first.friendlyId}`}

// AFTER:
href={`/app/crm/contacts/${first.friendlyId}`}
```

Also fix the `Mandate_Clients` / `Clients` field name access if the schema uses updated naming. Read the MandatesPageView data shape to confirm. If `Mandate_Clients` and `first.Clients` still match the Prisma include shape, leave them as-is (the join table name didn't change — only the UI label).

- [ ] **Step 4: Replace MandateDataTable with shared DataTable in MandatesPageView.tsx**

In `app/[locale]/app/(routes)/mandates/components/MandatesPageView.tsx`:

Replace import:
```typescript
// REMOVE:
import { MandateDataTable } from "../table-components/data-table";
// ADD:
import { DataTable } from "@/components/ui/data-table/data-table";
import type { Row } from "@tanstack/react-table";
```

Add row open handler (add near the top of the component function):
```typescript
const router = useRouter();  // already imported from @/navigation
const handleRowOpen = React.useCallback(
  (row: Row<any>) => {
    router.push(`/app/mandates/${row.original.friendlyId ?? row.original.id}`);
  },
  [router]
);
```

Replace the `<MandateDataTable>` JSX. The original passes `users`, `toolbarRight`, `onRefresh`, and `getRowHref`. New version:
```tsx
<DataTable
  columns={getColumns(t, users)}
  data={requests}
  searchKey="title"
  onRowOpen={handleRowOpen}
/>
```

Note: `toolbarRight` (the "Create Request" button) should be placed above the DataTable in the layout, outside the DataTable component — or use a wrapper `div` with `flex items-center justify-between`. Check how `PropertiesView` handles `toolbarRight` — it places it above the DataTable in a flex row.

- [ ] **Step 5: Delete MandateDataTable wrapper**

```bash
git rm "app/[locale]/app/(routes)/mandates/table-components/data-table.tsx"
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "mandates\|requests" | head -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/mandates/
git commit -m "feat(requests): rename mandateId→requestId in cells, fix contact links, migrate to shared DataTable"
```

---

## Task 3: Wire shared DataTable for Documents

**Files:**
- Modify: `app/[locale]/app/(routes)/documents/components/DocumentsPageView.tsx`
- Delete: `app/[locale]/app/(routes)/documents/table-components/data-table.tsx`

Context: Documents already have checkboxes, an actions column, and `getRowHref` in the bespoke `DocumentDataTable`. We just swap the wrapper.

- [ ] **Step 1: Replace DocumentDataTable with shared DataTable in DocumentsPageView.tsx**

In `app/[locale]/app/(routes)/documents/components/DocumentsPageView.tsx`:

Replace import:
```typescript
// REMOVE:
import { DocumentDataTable } from "../table-components/data-table";
// ADD:
import { DataTable } from "@/components/ui/data-table/data-table";
import type { Row } from "@tanstack/react-table";
```

Add handler near top of component:
```typescript
const router = useRouter();  // from @/navigation — check if already imported
const handleRowOpen = React.useCallback(
  (row: Row<any>) => {
    router.push(`/app/documents/${row.original.friendlyId ?? row.original.id}`);
  },
  [router]
);
```

Replace the `<DocumentDataTable>` JSX:
```tsx
<DataTable
  columns={getColumns(t)}
  data={documents}
  searchKey="document_name"
  onRowOpen={handleRowOpen}
/>
```

Read the actual `<DocumentDataTable>` usage in `DocumentsPageView.tsx` (line ~208) before editing to confirm what props it currently receives and ensure none are lost.

- [ ] **Step 2: Delete DocumentDataTable wrapper**

```bash
git rm "app/[locale]/app/(routes)/documents/table-components/data-table.tsx"
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "documents" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/documents/
git commit -m "feat(documents): migrate to shared DataTable with row navigation"
```

---

## Task 4: Extract DealRowActions into its own file

**Files:**
- Create: `app/[locale]/app/(routes)/deals/table-components/DealRowActions.tsx`
- Modify: `app/[locale]/app/(routes)/deals/components/DealsList.tsx` (remove the embedded component)

Context: `DealsList.tsx` currently has `DealRowActions` embedded inline (lines ~97–220). We extract it so the new `columns.tsx` can import it cleanly.

- [ ] **Step 1: Create DealRowActions.tsx**

Create `app/[locale]/app/(routes)/deals/table-components/DealRowActions.tsx`:

```typescript
"use client";

import * as React from "react";
import { Row } from "@tanstack/react-table";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppToast } from "@/hooks/use-app-toast";
import { deleteDeal } from "@/actions/deals";
import type { ActionResponse } from "@/lib/action-response";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import type { DealRow } from "../components/DealsList";

interface DealRowActionsProps {
  row: Row<DealRow>;
  onRefresh?: () => void;
}

export function DealRowActions({ row, onRefresh }: Readonly<DealRowActionsProps>) {
  const deal = row.original;
  const commonT = useTranslations("common");
  const t = useTranslations("deals");
  const router = useRouter();
  const { toast } = useAppToast();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const handleView = React.useCallback(() => {
    router.push(`/app/deals/${deal.friendlyId}`);
  }, [router, deal.friendlyId]);

  const handleEdit = React.useCallback(() => {
    router.push(`/app/deals/${deal.friendlyId}?edit=true`);
  }, [router, deal.friendlyId]);

  const handleDelete = React.useCallback(async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = (await deleteDeal(deal.id)) as ActionResponse<{ id: string }>;
      if (res.success) {
        toast.success("deleteSuccess");
        onRefresh?.();
        setConfirmOpen(false);
      } else {
        toast.error("deleteFailed", { description: res.error ?? undefined, isTranslationKey: false });
      }
    } catch (error) {
      console.error("[DEAL_DELETE_UI]", error);
      toast.error("deleteFailed");
    } finally {
      setIsDeleting(false);
    }
  }, [deal.id, isDeleting, onRefresh, toast]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={commonT("actions")}>
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>{commonT("actions")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleView}>
            <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
            {commonT("view")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
            {commonT("edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); setConfirmOpen(true); }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
            {commonT("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("detail.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("detail.deleteDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("detail.deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("detail.deleteDialog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles for new file**

```bash
npx tsc --noEmit 2>&1 | grep "DealRowActions\|deals/table" | head -10
```

Expected: no errors on the new file.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/app/(routes)/deals/table-components/DealRowActions.tsx"
git commit -m "refactor(deals): extract DealRowActions into standalone table-component file"
```

---

## Task 5: Create Deal table-components columns.tsx

**Files:**
- Create: `app/[locale]/app/(routes)/deals/table-components/columns.tsx`

Context: `DealsList.tsx` currently has `useDealColumns` hook inline. We extract a standalone `getColumns(users, onRefresh)` factory that uses the same TanStack `ColumnDef<DealRow>[]` pattern as all other entities. The column order follows the standard: **select | createdAt | title | [entity-specific] | actions**.

- [ ] **Step 1: Create columns.tsx**

Create `app/[locale]/app/(routes)/deals/table-components/columns.tsx`:

```typescript
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useTranslations, useFormatter } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import {
  DataTableSelectCheckbox,
  DataTableSelectAllCheckbox,
} from "@/components/ui/data-table/data-table-select-checkbox";
import { DealRowActions } from "./DealRowActions";
import type { DealRow } from "../components/DealsList";

const initials = (name: string | null | undefined): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
};

export function getColumns(
  users: { id: string; name: string | null }[] = [],
  onRefresh?: () => void
): ColumnDef<DealRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => <DataTableSelectAllCheckbox table={table} />,
      cell: ({ row, table }) => <DataTableSelectCheckbox row={row} table={table} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        const t = useTranslations("deals");
        return <DataTableColumnHeader column={column} title={t("detail.timeline.created")} />;
      },
      cell: ({ row }) => {
        const format = useFormatter();
        const d = row.original.createdAt;
        if (!d) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {format.dateTime(new Date(d), { dateStyle: "medium" })}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: false,
    },
    {
      id: "name",
      accessorFn: (row) =>
        row.property?.title || row.property?.property_name || row.title || row.friendlyId,
      header: ({ column }) => {
        const t = useTranslations("deals");
        return <DataTableColumnHeader column={column} title={t("create.property")} />;
      },
      cell: ({ row }) => {
        const deal = row.original;
        const name =
          deal.property?.title || deal.property?.property_name || deal.title || deal.friendlyId;
        return (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate max-w-[260px]">{name}</span>
            {deal.property?.address_city && (
              <span className="text-xs text-muted-foreground truncate max-w-[260px]">
                {deal.property.address_city}
              </span>
            )}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "stage",
      header: ({ column }) => {
        const t = useTranslations("deals");
        return <DataTableColumnHeader column={column} title={t("detail.pipeline")} />;
      },
      cell: ({ row }) => {
        const t = useTranslations("deals");
        const stage = row.original.stage;
        return (
          <StatusBadge
            entityType="deal"
            status={stage}
            label={t(`stage.${stage}` as Parameters<typeof t>[0])}
            size="sm"
          />
        );
      },
      enableSorting: true,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: "dealType",
      header: ({ column }) => {
        const t = useTranslations("deals");
        return <DataTableColumnHeader column={column} title={t("create.dealType")} />;
      },
      cell: ({ row }) => {
        const t = useTranslations("deals");
        const dt = row.original.dealType;
        if (!dt) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <Badge variant="outline" className="text-[10px]">
            {t(`dealType.${dt}` as Parameters<typeof t>[0])}
          </Badge>
        );
      },
      enableSorting: true,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      id: "money",
      accessorFn: (row) => {
        const isRental = row.dealType === "RENT";
        const value = isRental ? row.monthlyRentAmount : row.agreedPrice ?? row.property?.price;
        return value != null ? Number(value) : 0;
      },
      header: ({ column }) => {
        const t = useTranslations("deals");
        return <DataTableColumnHeader column={column} title={t("list.agreedPrice")} />;
      },
      cell: ({ row }) => {
        const format = useFormatter();
        const deal = row.original;
        const isRental = deal.dealType === "RENT";
        const value = isRental ? deal.monthlyRentAmount : deal.agreedPrice ?? deal.property?.price;
        if (value == null) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <span className="text-sm font-medium whitespace-nowrap">
            {format.number(Number(value), {
              style: "currency",
              currency: deal.commissionCurrency || "EUR",
              maximumFractionDigits: 0,
            })}
          </span>
        );
      },
      enableSorting: true,
    },
    {
      id: "listingAgent",
      accessorFn: (row) => row.listingAgent?.name ?? "",
      header: ({ column }) => {
        const t = useTranslations("deals");
        return <DataTableColumnHeader column={column} title={t("create.listingAgent")} />;
      },
      cell: ({ row }) => {
        const a = row.original.listingAgent;
        if (!a?.name) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={a.avatar ?? undefined} alt="" />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {initials(a.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate max-w-[160px]">{a.name}</span>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "buyerAgent",
      accessorFn: (row) => row.buyerAgent?.name ?? "",
      header: ({ column }) => {
        const t = useTranslations("deals");
        return <DataTableColumnHeader column={column} title={t("create.buyerAgent")} />;
      },
      cell: ({ row }) => {
        const a = row.original.buyerAgent;
        if (!a?.name) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={a.avatar ?? undefined} alt="" />
              <AvatarFallback className="text-[10px] bg-success/10 text-success">
                {initials(a.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate max-w-[160px]">{a.name}</span>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: ({ column }) => {
        const commonT = useTranslations("common");
        return <span className="sr-only">{commonT("actions")}</span>;
      },
      cell: ({ row }) => (
        <div className="text-right">
          <DealRowActions row={row} onRefresh={onRefresh} />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "deals/table" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/app/(routes)/deals/table-components/columns.tsx"
git commit -m "feat(deals): add table-components/columns.tsx with shared DataTable column factory"
```

---

## Task 6: Migrate DealsList.tsx to shared DataTable

**Files:**
- Modify: `app/[locale]/app/(routes)/deals/components/DealsList.tsx`

Context: `DealsList.tsx` currently renders its own full table (raw `<Table>`, `<TableRow>`, etc.). We gut all that and delegate to the shared `DataTable`, passing `getColumns(users, onRefresh)`. Keep `DealRow` type as a named export since `DealRowActions.tsx` imports it.

- [ ] **Step 1: Rewrite DealsList.tsx**

Replace the entire content of `app/[locale]/app/(routes)/deals/components/DealsList.tsx` with:

```typescript
"use client";

import * as React from "react";
import { useRouter } from "@/navigation";
import { DataTable } from "@/components/ui/data-table/data-table";
import { getColumns } from "../table-components/columns";
import type { Row } from "@tanstack/react-table";

// ── Types ───────────────────────────────────────────────────────────────
export interface DealRow {
  id: string;
  friendlyId: string;
  title: string | null;
  stage: string;
  dealType: string | null;
  agreedPrice?: number | string | null;
  monthlyRentAmount?: number | string | null;
  createdAt: string | Date;
  property?: {
    id: string;
    title?: string | null;
    property_name?: string | null;
    address_city?: string | null;
    price?: number | string | null;
  } | null;
  listingAgent?: { id: string; name: string | null; avatar: string | null } | null;
  buyerAgent?: { id: string; name: string | null; avatar: string | null } | null;
  dealParties?: Array<{ id: string }>;
  commissionCurrency?: string | null;
}

interface DealsListProps {
  data: DealRow[];
  users?: { id: string; name: string | null }[];
  toolbarRight?: React.ReactNode;
  onRefresh?: () => void;
}

export function DealsList({
  data,
  users = [],
  toolbarRight,
  onRefresh,
}: Readonly<DealsListProps>) {
  const router = useRouter();

  const handleRowOpen = React.useCallback(
    (row: Row<DealRow>) => {
      router.push(`/app/deals/${row.original.friendlyId}`);
    },
    [router]
  );

  const columns = React.useMemo(
    () => getColumns(users, onRefresh),
    [users, onRefresh]
  );

  return (
    <div className="space-y-4">
      {toolbarRight && (
        <div className="flex justify-end">{toolbarRight}</div>
      )}
      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        onRowOpen={handleRowOpen}
      />
    </div>
  );
}
```

- [ ] **Step 2: Check callers of DealsList and ensure `users` prop is passed**

```bash
grep -rn "DealsList\|DealsListProps" /Users/stapo/Desktop/Oikion/MVP/app --include="*.tsx" | grep -v "DealsList.tsx"
```

For each caller found, verify it passes `users` (the org members array). If it doesn't already have a `users` prop, add it. The page component that renders `DealsList` likely already fetches org members for agent assignment — check and wire it.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "deals" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/app/(routes)/deals/components/DealsList.tsx"
git commit -m "feat(deals): migrate DealsList to shared DataTable with row-click navigation"
```

---

## Task 7: Verify Properties row-click navigation (quick audit)

**Files:**
- Read: `app/[locale]/app/(routes)/mls/components/PropertiesView.tsx`

Context: Properties already uses the shared `DataTable` with `onRowOpen`. The current handler pushes `/${locale}/app/mls/properties/${propertyId}` with a manually prepended locale. The locale-aware `useRouter` from `@/navigation` handles locale injection automatically — the path should just be `/app/mls/properties/${propertyId}`. Verify and fix if needed.

- [ ] **Step 1: Read and check PropertiesView.tsx row handler**

```bash
grep -n "handleRowOpen\|router.push\|locale" \
  /Users/stapo/Desktop/Oikion/MVP/app/\[locale\]/app/\(routes\)/mls/components/PropertiesView.tsx | head -15
```

If the push includes a `/${locale}/` prefix (e.g., `router.push(\`/${locale}/app/mls/...\``)), remove the locale prefix — the `useRouter` from `@/navigation` is locale-aware and adds it automatically.

- [ ] **Step 2: Fix if needed**

If the path has a hardcoded locale prefix, edit `PropertiesView.tsx`:
```typescript
// BEFORE (wrong — double-injects locale):
router.push(`/${locale}/app/mls/properties/${propertyId}`);

// AFTER (correct):
router.push(`/app/mls/properties/${propertyId}`);
```

If it's already correct, skip this step.

- [ ] **Step 3: Commit if changed**

```bash
git add "app/[locale]/app/(routes)/mls/components/PropertiesView.tsx"
git commit -m "fix(properties): remove redundant locale prefix from row navigation"
```

---

## Task 8: Verify AccountsView (Contacts list) row-click navigation

**Files:**
- Read: `app/[locale]/app/(routes)/crm/components/AccountsView.tsx`

Context: AccountsView uses the shared DataTable with `onRowOpen` (confirmed earlier at line 207). It currently pushes to `/crm/clients/` — verify it now pushes to `/crm/contacts/` after the Clients→Contacts migration.

- [ ] **Step 1: Check the push path**

```bash
grep -n "router.push\|handleRowOpen\|/crm/clients\|/crm/contacts" \
  /Users/stapo/Desktop/Oikion/MVP/app/\[locale\]/app/\(routes\)/crm/components/AccountsView.tsx | head -10
```

If the path uses `/crm/clients/`, update it to `/crm/contacts/`.

- [ ] **Step 2: Fix if needed**

```typescript
// BEFORE:
router.push(`/${locale}/app/crm/clients/${row.original.friendlyId}`);

// AFTER:
router.push(`/app/crm/contacts/${row.original.friendlyId}`);
```

- [ ] **Step 3: Commit if changed**

```bash
git add "app/[locale]/app/(routes)/crm/components/AccountsView.tsx"
git commit -m "fix(contacts): update AccountsView row navigation from /crm/clients to /crm/contacts"
```

---

## Task 9: Full TypeScript build verification

- [ ] **Step 1: Run full type check**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && npx tsc --noEmit 2>&1 | head -60
```

Expected: zero errors. If errors appear, fix them before continuing — do not proceed with build errors.

- [ ] **Step 2: Run dev build smoke test**

```bash
cd /Users/stapo/Desktop/Oikion/MVP && pnpm build 2>&1 | tail -30
```

Expected: successful build with no errors.

- [ ] **Step 3: Commit final cleanup if needed**

```bash
git add -A && git commit -m "fix: resolve remaining TypeScript errors from entity DataTable migration"
```

---

## Self-Review Checklist

### Spec Coverage

| Requirement | Task |
|---|---|
| Standard column order (select → createdAt → assignedTo → title → entity-specific → actions) | Tasks 1, 2, 5 |
| Entire row clickable (full whitespace) | Tasks 1, 2, 3, 6 — via `onRowOpen` which DataTable wires to `TableRow onClick` |
| All entities use shared DataTable | Tasks 1, 2, 3, 6 |
| Future enhancements to DataTable apply to all entities automatically | Achieved by consolidation to shared DataTable |
| Properties already has inline editing | Task 7 (verify only) |
| Contacts: row click | Task 1 |
| Requests: rename mandateId→requestId + fix client link | Task 2 |
| Documents: row click | Task 3 |
| Deals: migrate from monolithic to shared DataTable | Tasks 4, 5, 6 |

### Known Limitations (out of scope for this plan)

- **Inline editing for Contacts status/assignedAgent**: The plan keeps static Badge/text cells for now (the `users` prop flows through to support future addition). Adding `EditableSelectCell`-based cells for status and assignedAgent is a natural follow-up.
- **Inline editing for Deals stage/agents**: Similarly kept as display-only in this plan. The cell component files (`StageCell.tsx`, `ListingAgentCell.tsx`, etc.) listed in the file structure are deferred — the inline editing shell is established via `DealRowActions` extract, making future addition straightforward.
- **Documents inline editing**: Documents don't benefit as much from inline editing (name changes should go through the document editor); kept display-only.

These are deliberate YAGNI decisions: get consistency first, add inline editing per-entity as follow-up PRs.
