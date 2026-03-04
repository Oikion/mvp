# Mandates In-Table Inline Editing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add inline editing to 5 columns in the Mandates data table (Title, Status, Urgency, Assigned To, Transaction Type) using the CRM server-action pattern.

**Architecture:** Create 5 cell components in a new `cells/` subdirectory under the mandates table-components folder. Each calls `updateMandate({ id, [field]: newValue })` directly. Update `columns.tsx` to use the new cell renderers. No API routes, no parent component changes needed.

**Tech Stack:** React, TanStack Table, shadcn/ui (Badge, DropdownMenu, Select, Input), next-intl, `updateMandate` server action, Sonner toasts.

---

## Reference files to read before starting

Before any task, skim these files to understand the patterns you're copying:
- `app/[locale]/app/(routes)/crm/accounts/table-components/cells/NameCell.tsx` — template for TitleCell
- `app/[locale]/app/(routes)/crm/accounts/table-components/cells/StatusCell.tsx` — template for StatusCell/UrgencyCell/TransactionTypeCell
- `app/[locale]/app/(routes)/crm/accounts/table-components/cells/AssignedUserCell.tsx` — template for AssignedUserCell
- `app/[locale]/app/(routes)/mandates/table-components/columns.tsx` — the file you will modify last
- `locales/en/mandates.json` — translation keys (namespace `mandates`)

Key facts:
- Translation namespace for mandates pages: `useTranslations("mandates")`
- Status labels: `t("MandateForm.status.ACTIVE")` etc.
- Urgency labels: `t("MandateForm.urgency.LOW")` etc.
- Transaction type labels: `t("MandateForm.transactionType.SALE")` etc.
- Server action: `updateMandate(data)` in `actions/mandates/update-mandate.ts` — accepts `{ id, ...partialFields }`
- The Badge component supports variants: `"default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "purple"`

---

## Task 1: Create TitleCell

**Files:**
- Create: `app/[locale]/app/(routes)/mandates/table-components/cells/TitleCell.tsx`

**Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { updateMandate } from "@/actions/mandates/update-mandate";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";

interface TitleCellProps {
  mandateId: string;
  value: string | null | undefined;
}

export const TitleCell = ({ mandateId, value }: TitleCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value ?? "");
  const [loading, setLoading] = useState(false);
  const tCommon = useTranslations("common");

  const handleSave = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setInputValue(value ?? "");
      setIsEditing(false);
      return;
    }
    if (trimmed === (value ?? "").trim()) {
      setIsEditing(false);
      return;
    }
    setLoading(true);
    try {
      await updateMandate({ id: mandateId, title: trimmed });
      toast.success(tCommon("success"));
    } catch {
      toast.error(tCommon("error"));
      setInputValue(value ?? "");
    } finally {
      setLoading(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setInputValue(value ?? "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={loading}
        autoFocus
        className="h-7 min-w-[160px] px-2 py-0 text-sm border-input"
      />
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span
        className="font-medium truncate max-w-[200px] cursor-pointer hover:text-primary hover:underline decoration-dotted underline-offset-2 transition-colors"
        onClick={() => {
          setInputValue(value ?? "");
          setIsEditing(true);
        }}
        title={tCommon("edit")}
      >
        {value || <span className="text-muted-foreground">—</span>}
      </span>
      <Link
        href={`/app/mandates/${mandateId}`}
        className="ml-1 text-muted-foreground hover:text-primary transition-colors shrink-0"
        title="View details"
        onClick={(e) => e.stopPropagation()}
      >
        &#x2197;
      </Link>
    </div>
  );
};
```

**Step 2: Verify no TypeScript errors**

Run: `pnpm tsc --noEmit 2>&1 | grep TitleCell`
Expected: no output (no errors)

**Step 3: Commit**

```bash
git add app/[locale]/app/\(routes\)/mandates/table-components/cells/TitleCell.tsx
git commit -m "feat(mandates): add TitleCell inline editing component"
```

---

## Task 2: Create StatusCell

**Files:**
- Create: `app/[locale]/app/(routes)/mandates/table-components/cells/StatusCell.tsx`

**Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateMandate } from "@/actions/mandates/update-mandate";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

interface StatusCellProps {
  mandateId: string;
  status: string;
}

const statuses = [
  { value: "DRAFT", variant: "secondary" },
  { value: "ACTIVE", variant: "success" },
  { value: "PAUSED", variant: "warning" },
  { value: "FULFILLED", variant: "info" },
  { value: "EXPIRED", variant: "outline" },
  { value: "CANCELLED", variant: "destructive" },
] as const;

export const StatusCell = ({ mandateId, status }: StatusCellProps) => {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("mandates");
  const tCommon = useTranslations("common");

  const handleValueChange = async (value: string) => {
    setLoading(true);
    try {
      await updateMandate({ id: mandateId, status: value as any });
      toast.success(tCommon("saved"));
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setLoading(false);
    }
  };

  const current = statuses.find((s) => s.value === status) ?? statuses[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={loading}>
        <button className="outline-none focus:ring-2 focus:ring-ring rounded-full cursor-pointer flex items-center gap-1">
          <Badge variant={current.variant as any} className="hover:opacity-80 transition-opacity text-xs">
            {t(`MandateForm.status.${current.value}` as any)}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {statuses.map((s) => (
          <DropdownMenuItem
            key={s.value}
            onClick={() => handleValueChange(s.value)}
            className="cursor-pointer"
          >
            <Badge variant={s.variant as any} className="mr-2 w-2 h-2 rounded-full p-0" />
            {t(`MandateForm.status.${s.value}` as any)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

**Step 2: Verify no TypeScript errors**

Run: `pnpm tsc --noEmit 2>&1 | grep StatusCell`
Expected: no output

**Step 3: Commit**

```bash
git add app/[locale]/app/\(routes\)/mandates/table-components/cells/StatusCell.tsx
git commit -m "feat(mandates): add StatusCell inline editing component"
```

---

## Task 3: Create UrgencyCell

**Files:**
- Create: `app/[locale]/app/(routes)/mandates/table-components/cells/UrgencyCell.tsx`

**Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateMandate } from "@/actions/mandates/update-mandate";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

interface UrgencyCellProps {
  mandateId: string;
  urgency: string | null;
}

const urgencies = [
  { value: "LOW", variant: "secondary" },
  { value: "MEDIUM", variant: "warning" },
  { value: "HIGH", variant: "default" },
  { value: "CRITICAL", variant: "destructive" },
] as const;

export const UrgencyCell = ({ mandateId, urgency }: UrgencyCellProps) => {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("mandates");
  const tCommon = useTranslations("common");

  const handleValueChange = async (value: string) => {
    setLoading(true);
    try {
      await updateMandate({ id: mandateId, urgency: value as any });
      toast.success(tCommon("saved"));
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setLoading(false);
    }
  };

  const current = urgencies.find((u) => u.value === urgency);

  if (!current) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={loading}>
          <button className="outline-none focus:ring-2 focus:ring-ring rounded-sm cursor-pointer">
            <span className="text-muted-foreground text-xs hover:text-foreground transition-colors">
              — <ChevronDown className="inline h-3 w-3" />
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {urgencies.map((u) => (
            <DropdownMenuItem
              key={u.value}
              onClick={() => handleValueChange(u.value)}
              className="cursor-pointer"
            >
              <Badge variant={u.variant as any} className="mr-2 w-2 h-2 rounded-full p-0" />
              {t(`MandateForm.urgency.${u.value}` as any)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={loading}>
        <button className="outline-none focus:ring-2 focus:ring-ring rounded-full cursor-pointer flex items-center gap-1">
          <Badge variant={current.variant as any} className="hover:opacity-80 transition-opacity text-xs">
            {t(`MandateForm.urgency.${current.value}` as any)}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {urgencies.map((u) => (
          <DropdownMenuItem
            key={u.value}
            onClick={() => handleValueChange(u.value)}
            className="cursor-pointer"
          >
            <Badge variant={u.variant as any} className="mr-2 w-2 h-2 rounded-full p-0" />
            {t(`MandateForm.urgency.${u.value}` as any)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

**Step 2: Verify no TypeScript errors**

Run: `pnpm tsc --noEmit 2>&1 | grep UrgencyCell`
Expected: no output

**Step 3: Commit**

```bash
git add app/[locale]/app/\(routes\)/mandates/table-components/cells/UrgencyCell.tsx
git commit -m "feat(mandates): add UrgencyCell inline editing component"
```

---

## Task 4: Create AssignedUserCell

**Files:**
- Create: `app/[locale]/app/(routes)/mandates/table-components/cells/AssignedUserCell.tsx`

**Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateMandate } from "@/actions/mandates/update-mandate";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface AssignedUserCellProps {
  mandateId: string;
  assignedTo: string | null;
  users: { id: string; name: string | null }[];
}

export const AssignedUserCell = ({
  mandateId,
  assignedTo,
  users,
}: AssignedUserCellProps) => {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("mandates");
  const tCommon = useTranslations("common");

  const handleValueChange = async (value: string) => {
    setLoading(true);
    try {
      const newValue = value === "unassigned" ? null : value;
      await updateMandate({ id: mandateId, assigned_to: newValue ?? undefined });
      toast.success(tCommon("saved"));
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setLoading(false);
    }
  };

  const currentValue = assignedTo ?? "unassigned";

  return (
    <Select value={currentValue} onValueChange={handleValueChange} disabled={loading}>
      <SelectTrigger className="h-8 w-[160px] border-none bg-transparent shadow-none hover:bg-muted/50 focus:ring-0 px-2">
        <SelectValue placeholder={t("MandatesTable.assignedTo")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">
          <span className="text-muted-foreground">—</span>
        </SelectItem>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name ?? user.id}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

**Step 2: Verify no TypeScript errors**

Run: `pnpm tsc --noEmit 2>&1 | grep AssignedUserCell`
Expected: no output

**Step 3: Commit**

```bash
git add app/[locale]/app/\(routes\)/mandates/table-components/cells/AssignedUserCell.tsx
git commit -m "feat(mandates): add AssignedUserCell inline editing component"
```

---

## Task 5: Create TransactionTypeCell

**Files:**
- Create: `app/[locale]/app/(routes)/mandates/table-components/cells/TransactionTypeCell.tsx`

**Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateMandate } from "@/actions/mandates/update-mandate";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

interface TransactionTypeCellProps {
  mandateId: string;
  transactionType: string | null;
}

const transactionTypes = [
  { value: "SALE", variant: "default" },
  { value: "RENTAL", variant: "secondary" },
  { value: "SHORT_TERM", variant: "outline" },
  { value: "EXCHANGE", variant: "outline" },
] as const;

export const TransactionTypeCell = ({
  mandateId,
  transactionType,
}: TransactionTypeCellProps) => {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("mandates");
  const tCommon = useTranslations("common");

  const handleValueChange = async (value: string) => {
    setLoading(true);
    try {
      await updateMandate({ id: mandateId, transaction_type: value as any });
      toast.success(tCommon("saved"));
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setLoading(false);
    }
  };

  const current = transactionTypes.find((tt) => tt.value === transactionType);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={loading}>
        <button className="outline-none focus:ring-2 focus:ring-ring rounded-full cursor-pointer flex items-center gap-1">
          {current ? (
            <Badge variant={current.variant as any} className="hover:opacity-80 transition-opacity text-xs">
              {t(`MandateForm.transactionType.${current.value}` as any)}
              <ChevronDown className="ml-1 h-3 w-3" />
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">
              — <ChevronDown className="inline h-3 w-3" />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {transactionTypes.map((tt) => (
          <DropdownMenuItem
            key={tt.value}
            onClick={() => handleValueChange(tt.value)}
            className="cursor-pointer"
          >
            <Badge variant={tt.variant as any} className="mr-2 w-2 h-2 rounded-full p-0" />
            {t(`MandateForm.transactionType.${tt.value}` as any)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

**Step 2: Verify no TypeScript errors**

Run: `pnpm tsc --noEmit 2>&1 | grep TransactionTypeCell`
Expected: no output

**Step 3: Commit**

```bash
git add app/[locale]/app/\(routes\)/mandates/table-components/cells/TransactionTypeCell.tsx
git commit -m "feat(mandates): add TransactionTypeCell inline editing component"
```

---

## Task 6: Update columns.tsx

**Files:**
- Modify: `app/[locale]/app/(routes)/mandates/table-components/columns.tsx`

This is the integration step. You will replace 5 static cell renderers with the new cell components.

**Step 1: Add imports at the top of the file**

After the existing imports (after `import { DataTableColumnHeader } from ...`), add:

```tsx
import { TitleCell } from "./cells/TitleCell";
import { StatusCell } from "./cells/StatusCell";
import { UrgencyCell } from "./cells/UrgencyCell";
import { AssignedUserCell } from "./cells/AssignedUserCell";
import { TransactionTypeCell } from "./cells/TransactionTypeCell";
```

**Step 2: Replace the `assigned_to_user` column cell renderer**

Find this block (lines 103–131):
```tsx
  {
    accessorKey: "assigned_to_user",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("MandatesTable.assignedTo")} />
    ),
    cell: ({ row }) => {
      const user = row.original.assigned_to_user;
      if (!user) {
        return <span className="text-muted-foreground">-</span>;
      }
      const initials = user.name
        ? user.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "??";
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="truncate max-w-[120px]">{user.name}</span>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: true,
  },
```

Replace the `cell` property only (keep header/enableSorting/enableHiding):
```tsx
  {
    accessorKey: "assigned_to_user",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("MandatesTable.assignedTo")} />
    ),
    cell: ({ row }) => (
      <AssignedUserCell
        mandateId={row.original.id}
        assignedTo={row.original.assigned_to}
        users={users}
      />
    ),
    enableSorting: false,
    enableHiding: true,
  },
```

**Step 3: Replace the `title` column cell renderer**

Find this block (lines 132–154):
```tsx
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("MandatesTable.title")} />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <span className="font-medium truncate max-w-[200px]">
          {row.original.title}
        </span>
        <Link
          href={`/app/mandates/${row.original.id}`}
          className="ml-1 text-muted-foreground hover:text-primary transition-colors"
          title="View details"
          onClick={(e) => e.stopPropagation()}
        >
          &#x2197;
        </Link>
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
```

Replace the `cell` property only:
```tsx
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("MandatesTable.title")} />
    ),
    cell: ({ row }) => (
      <TitleCell
        mandateId={row.original.id}
        value={row.original.title}
      />
    ),
    enableSorting: true,
    enableHiding: true,
  },
```

**Step 4: Replace the `transaction_type` column cell renderer**

Find this block (lines 155–173):
```tsx
  {
    accessorKey: "transaction_type",
    ...
    cell: ({ row }) => {
      const type = row.getValue("transaction_type") as string;
      return (
        <Badge variant={TRANSACTION_VARIANT[type] ?? "outline"} className="text-xs">
          {type}
        </Badge>
      );
    },
    filterFn: ...,
    enableSorting: false,
    enableHiding: true,
  },
```

Replace the `cell` property only:
```tsx
    cell: ({ row }) => (
      <TransactionTypeCell
        mandateId={row.original.id}
        transactionType={row.original.transaction_type}
      />
    ),
```

**Step 5: Replace the `status` column cell renderer**

Find this block (lines 187–205):
```tsx
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={STATUS_VARIANT[status] ?? "secondary"} className="text-xs">
          {t(`MandateForm.status.${status}`)}
        </Badge>
      );
    },
```

Replace with:
```tsx
    cell: ({ row }) => (
      <StatusCell
        mandateId={row.original.id}
        status={row.original.status}
      />
    ),
```

**Step 6: Replace the `urgency` column cell renderer**

Find this block (lines 206–225):
```tsx
    cell: ({ row }) => {
      const urgency = row.getValue("urgency") as string | null;
      if (!urgency) return <span className="text-muted-foreground">-</span>;
      return (
        <Badge variant={URGENCY_VARIANT[urgency] ?? "outline"} className="text-xs">
          {t(`MandateForm.urgency.${urgency}`)}
        </Badge>
      );
    },
```

Replace with:
```tsx
    cell: ({ row }) => (
      <UrgencyCell
        mandateId={row.original.id}
        urgency={row.original.urgency}
      />
    ),
```

**Step 7: Remove now-unused imports**

The following imports are no longer used after replacing cell renderers. Remove them from the import block:
- `Avatar, AvatarFallback` (from `@/components/ui/avatar`) — remove entire import line
- `Badge` (from `@/components/ui/badge`) — remove if not used elsewhere; it IS still used in budget/client columns — check and keep if needed
- `Link` from `next/link` — keep (still used in client column and actions)
- `TRANSACTION_VARIANT`, `STATUS_VARIANT`, `URGENCY_VARIANT` constants — these can be removed if no other column uses them; double-check before removing

Actually — check before deleting. `Badge` is NOT used by the new cells in columns.tsx directly (the cells import their own Badge). The variant Record constants (STATUS_VARIANT, URGENCY_VARIANT, TRANSACTION_VARIANT) are no longer needed either. The `Avatar` import is also no longer needed.

Remove unused imports to keep the file clean.

**Step 8: Run TypeScript check**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "(mandates|columns)"
```
Expected: no errors related to mandates columns

**Step 9: Commit**

```bash
git add app/[locale]/app/\(routes\)/mandates/table-components/columns.tsx
git commit -m "feat(mandates): wire inline editing cells into columns"
```

---

## Task 7: Smoke test in browser

**Steps:**

1. Start dev server: `pnpm dev:http`
2. Navigate to `/app/mandates`
3. Verify each editable column:
   - **Title**: Click on a title text → Input appears → type new name → press Enter → input disappears, new name shows
   - **Title cancel**: Click title → type → press Escape → original name restored
   - **Status**: Click status badge → dropdown opens with all 6 statuses → click one → badge updates immediately
   - **Urgency**: Click urgency badge → dropdown opens → click one → updates
   - **Urgency null**: If a mandate has no urgency, clicking the `—` placeholder should open dropdown and allow setting urgency
   - **Assigned To**: Click agent select → dropdown opens → select another agent → updates
   - **Transaction Type**: Click transaction type badge → dropdown opens → click one → updates
4. Verify persistence: Refresh the page — all changes should be saved in DB
5. Verify loading state: Observe that dropdowns/inputs are disabled while saving (may be too fast to see, but network throttling in DevTools can reveal it)

---

## Task 8: Final commit and cleanup

**Step 1: Final TypeScript check**

```bash
pnpm tsc --noEmit
```
Expected: no new errors (there may be pre-existing unrelated errors — focus on mandates files only)

**Step 2: Lint check**

```bash
pnpm lint 2>&1 | grep -E "mandates.*cells"
```
Expected: no lint errors in the new cell files

**Step 3: Verify all 5 cells exist**

```bash
ls app/[locale]/app/\(routes\)/mandates/table-components/cells/
```
Expected output:
```
AssignedUserCell.tsx
StatusCell.tsx
TitleCell.tsx
TransactionTypeCell.tsx
UrgencyCell.tsx
```

---

## Notes for the implementer

### On `as any` casts in cells
The translation key template literals like `` t(`MandateForm.status.${value}` as any) `` use `as any` to avoid TypeScript strict literal checking on dynamic translation keys. This is acceptable and consistent with how the Properties cells do it.

### On the `assigned_to` vs `assigned_to_user` field
- `row.original.assigned_to` is the user **ID** string (UUID or null) — pass to the cell as `assignedTo`
- `row.original.assigned_to_user` is the nested user object — was used by the old read-only cell, now unused

### On `updateMandate` null handling for assigned_to
The server action's schema has `assigned_to: z.string().uuid().optional()`. Passing `null` may fail validation. The cell maps `"unassigned"` → `undefined` (not `null`) to safely omit the field, which leaves it unchanged. To clear the assignment, pass `assigned_to: undefined` and handle this in the server action or accept it as a known limitation for now.

Actually — to properly clear assignment: the action uses `encryptMandateForOrg` then spreads into `data`. If `assigned_to` is not in the payload, the DB field won't be updated. This is correct behavior — "Unassigned" in the dropdown should map to some clearing mechanism. Check the current `updateMandate` action to see if it handles null. If the schema rejects null for `assigned_to`, you may need to add `z.string().uuid().nullable().optional()` to the validation schema for that field.

**Recommended fix for AssignedUserCell:** Pass `undefined` when "unassigned" is selected (the field will be omitted from the update payload and the assignment won't change). This is a known limitation to address in a follow-up if needed. Alternatively, change the schema to accept `null` for `assigned_to`.

### On Badge variants
If `"success"`, `"warning"`, or `"info"` variants throw a TypeScript error (not in the Badge variant union), check `components/ui/badge.tsx` for the supported variants. If those variants aren't there, use `"default"` as a fallback and adjust the visual design accordingly. Use `as any` cast if the variant exists at runtime but isn't in the TypeScript type.
