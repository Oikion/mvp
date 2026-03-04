# Mandates In-Table Inline Editing — Design

**Date:** 2026-03-04
**Branch:** feat/property-location-model
**Status:** Approved

## Problem

The Mandates data table is fully read-only. Every field update requires navigating to the detail page. CRM Clients and MLS Properties tables already support inline editing for commonly-changed fields. Mandates should match this UX.

## Goal

Add click-to-edit / dropdown inline editing to 5 Mandate columns:

| Column | Edit Type |
|---|---|
| Title | Click-to-edit text (auto-save on Enter/blur) |
| Status | Dropdown badge (immediate save) |
| Urgency | Dropdown badge (immediate save) |
| Assigned To | Select dropdown (immediate save) |
| Transaction Type | Dropdown button (immediate save) |

## Approach: CRM Pattern (Server Actions)

Follow the pattern established in `app/[locale]/app/(routes)/crm/accounts/table-components/cells/`.

### Why this approach

- `updateMandate()` server action already exists and handles encryption, org isolation, and cache revalidation
- No new API routes needed
- Auto-save on blur is appropriate UX for text fields
- Consistent with CRM client table behavior
- Simpler than the Properties axios-based approach

### Follow-up

After this task: migrate Properties table cells to use server actions instead of axios, matching this pattern.

## Architecture

```
mandates/table-components/
  columns.tsx              ← updated: add cells, add users param
  data-table.tsx           ← updated: accept + pass users prop
  cells/                   ← new directory
    TitleCell.tsx
    StatusCell.tsx
    UrgencyCell.tsx
    AssignedUserCell.tsx
    TransactionTypeCell.tsx
```

All cells call: `updateMandate({ id, [field]: newValue })`

## Cell Specifications

### TitleCell
- **State:** `isEditing`, `inputValue`, `loading`
- **Display:** Text with dotted underline on hover
- **Edit trigger:** Click
- **Save:** Enter key or blur event
- **Cancel:** Escape key
- **Validation:** Reject empty string, revert to original
- **Change detection:** Skip API call if value unchanged
- **Loading:** Input disabled during request
- **Error:** Toast on failure

### StatusCell
- **Pattern:** DropdownMenu with Badge trigger
- **Options:** DRAFT, ACTIVE, PAUSED, FULFILLED, EXPIRED, CANCELLED
- **Color variants:**
  - DRAFT → secondary
  - ACTIVE → success
  - PAUSED → warning
  - FULFILLED → info (or purple)
  - EXPIRED → outline
  - CANCELLED → destructive
- **Save:** Immediate on selection
- **Loading:** Badge + menu disabled during request

### UrgencyCell
- **Pattern:** DropdownMenu with Badge trigger
- **Options:** LOW, MEDIUM, HIGH, CRITICAL
- **Color variants:**
  - LOW → secondary
  - MEDIUM → warning
  - HIGH → orange (destructive/warning)
  - CRITICAL → destructive
- **Save:** Immediate on selection
- **Loading:** Badge + menu disabled during request

### AssignedUserCell
- **Pattern:** Shadcn Select with transparent trigger (no border/shadow)
- **Options:** "Unassigned" + org users list
- **Value mapping:** "unassigned" string ↔ null in DB
- **Save:** Immediate on selection
- **Prop:** Receives `users: { id: string; name: string }[]` from columns
- **Loading:** Select disabled during request

### TransactionTypeCell
- **Pattern:** DropdownMenu with button trigger
- **Options:** SALE, RENTAL, SHORT_TERM, EXCHANGE
- **Display:** Translated label + ChevronDown icon
- **Save:** Immediate on selection
- **Loading:** Button disabled during request

## Data Flow

```
Cell component
  → updateMandate({ id, [field]: newValue })   (server action)
    → encryptMandateForOrg(fields, orgId)       (encryption)
    → prisma.mandate.update(...)                (DB write)
    → revalidatePath("/mandates")               (cache bust)
  → [cell shows new value]
```

## columns.tsx Changes

- `getColumns` factory accepts `users: { id: string; name: string }[]` parameter
- 5 column `cell` definitions replaced with cell components
- AssignedUserCell receives users via closure
- Budget, Client, Created columns remain read-only

## data-table.tsx Changes

- Component accepts `users` prop
- Passes `users` to `getColumns(users)`

## Translation

Status/Urgency/TransactionType enum labels already exist in `locales/{en,el}/mandates.json`. Cells use `useTranslations("Mandates")` (or appropriate namespace). Verify exact namespace key paths during implementation.

## Constraints

- `updateMandate` schema must support single-field partial updates. Verify `updateMandateSchema` uses `.partial()` or optional fields for all non-`id` fields before implementing.
- All cells must respect org isolation (handled by server action).
- Encrypted fields: `title` and `notes` are encrypted in the mandate model. `updateMandate` handles this automatically.

## Out of Scope

- Budget range editing (requires two fields, too complex for inline)
- Client relation editing (requires search/select with async lookup)
- Expires At date editing
- Any new columns added to the table
