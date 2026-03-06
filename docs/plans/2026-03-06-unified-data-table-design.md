# Unified Data Table System — Design

**Date:** 2026-03-06
**Scope:** Properties (MLS), Clients (CRM Accounts), Mandates

## Goal

A single shared data table system where all three feature tables share identical UX chrome. Any change to toolbar behaviour, chip style, action menu, keyboard shortcuts, or edit method propagates to all three instantly.

---

## Current State vs Target

| Feature | Properties | Clients | Mandates | Target |
|---------|-----------|---------|----------|--------|
| Toolbar shell | Custom (unique) | Custom (unique) | Custom (unique) | **One shared component** |
| Chip style | `<Badge>` rectangle | `<span>` pill | `<span>` pill | `<span>` pill everywhere |
| Reset button | ❌ Missing | ✅ | ✅ | ✅ All three |
| Chip labels | Raw (`"ACTIVE"`) | Prefixed (`"Status: Active"`) | Prefixed | Prefixed everywhere |
| Row actions | `DataTableRowActions` ✅ | Custom inline ❌ | Inline in columns.tsx ❌ | `DataTableRowActions` everywhere |
| Delete confirmation | ✅ Modal | ✅ AlertModal | ❌ None | ✅ Shared modal everywhere |
| Keyboard shortcut (delete) | `⌘/Ctrl+⌫` | `⌘⌫` | None | `⌘⌫` everywhere |
| Edit method | Navigate (`?edit=true`) | Right-slide modal ✅ | Navigate (`?edit=true`) | Right-slide modal everywhere |
| Select checkbox | `DataTableSelectCheckbox` ✅ | Custom ✅ | Raw `<Checkbox>` ❌ | `DataTableSelectCheckbox` everywhere |
| Pagination | Re-exports from Clients ✅ | Canonical source ✅ | Re-exports from Clients ✅ | No change needed |

---

## Architecture: Four Layers

### Layer 1 — Shared Toolbar Shell
**File:** `/components/ui/data-table/data-table-toolbar.tsx` (rewrite existing)

New composition API:

```tsx
export interface FilterChip {
  label: string;
  onRemove: () => void;
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchKey: string;
  searchPlaceholder: string;
  filterCount?: number;          // badge on Filters button
  chips?: FilterChip[];          // active filter pills
  onFilterOpen?: () => void;     // opens the domain's filter drawer
  onReset?: () => void;          // clears all filters
  rightContent?: React.ReactNode; // "New Property" button etc.
  children?: React.ReactNode;    // filter drawer rendered here
}
```

**What this shell renders:**
1. Row 1: `[SearchInput] [Filters button + badge] [Reset button (conditional)] ... [rightContent]`
2. Row 2 (conditional): `[chip] [chip] ... [Clear All link]`
3. Children: filter drawer (portal, so position doesn't matter)

**"Change one = change all" scope:**
- Chip pill style, badge appearance, Reset button, Clear All, button sizing, spacing

### Layer 2 — Per-Table Filter Logic (unchanged domain code)

Each table's toolbar file (`data-table-toolbar.tsx`) shrinks to just:
- URL param parsing → `activeFilters` object
- `drawerFilterCount` computation
- `handleApply` / `handleReset` URL pushes
- `chips[]` array construction (domain-specific labels)
- `useEffect` to sync URL → TanStack column filters
- Renders `<SharedToolbar ... chips={chips}><DomainFilterDrawer /></SharedToolbar>`

The filter drawer components (`PropertyFilterDrawer`, `ClientFilterDrawer`, `MandateFilterDrawer`) are **not changed** — they have fundamentally different domain UIs.

### Layer 3 — Shared Row Actions
**File:** `/components/ui/data-table/data-table-row-actions.tsx` (already exists and is good)

Changes needed:
- Add `"mandate"` to `EntityType` union and `getBasePath()` switch
- Keyboard shortcut: standardise to `⌘⌫` (currently shows `⌘/Ctrl+⌫`)

**Migration work:**
- **Clients:** Remove custom `data-table-row-actions.tsx`, use `DataTableRowActions`. Pass Watch/Unwatch as `customActions[]` prop (preserves the feature, uses the standard menu).
- **Mandates:** Remove inline actions cell in `columns.tsx`, replace with `<MandateRowActions>` component that uses `DataTableRowActions`. Gains delete confirmation.

### Layer 4 — Unified Edit via Right-Slide Modal

All three tables open edits via `RightViewModalNoTrigger`. The existing `onEdit` callback prop of `DataTableRowActions` is used.

| Table | Form component | Change |
|-------|---------------|--------|
| Clients | `UpdateAccountForm` (already in modal) | None |
| Properties | `EditPropertyForm` (accepts `initialData`) | Create `PropertyRowActions.tsx` with modal state |
| Mandates | `EditMandateForm` (accepts `initialData`) | Create `MandateRowActions.tsx` with modal state |

`EditPropertyForm` and `EditMandateForm` already accept `initialData: Record<string, unknown>` so no form changes are needed — just wrapping.

---

## Files Changed

### New/Modified (shared)
| File | Change |
|------|--------|
| `components/ui/data-table/data-table-toolbar.tsx` | Full rewrite to composition shell API |

### Modified (Properties — MLS)
| File | Change |
|------|--------|
| `mls/.../table-components/data-table-toolbar.tsx` | Slim: remove JSX, keep filter logic, render via shared shell |
| `mls/.../table-components/PropertyRowActions.tsx` | Add right-slide modal state + `EditPropertyForm` wrapper |

### Modified (Clients — CRM Accounts)
| File | Change |
|------|--------|
| `crm/accounts/table-components/data-table-toolbar.tsx` | Slim: same pattern as above |
| `crm/accounts/table-components/data-table-row-actions.tsx` | Replace custom impl with `DataTableRowActions` + Watch/Unwatch as `customActions[]` |

### Modified (Mandates)
| File | Change |
|------|--------|
| `mandates/table-components/data-table-toolbar.tsx` | Slim: same pattern as above |
| `mandates/table-components/columns.tsx` | Replace inline actions cell with `<MandateRowActions>` component; replace raw `<Checkbox>` with `DataTableSelectCheckbox` |

### New (Mandates)
| File | Change |
|------|--------|
| `mandates/table-components/MandateRowActions.tsx` | New: `DataTableRowActions` + right-slide modal + `EditMandateForm` |

---

## Keyboard Shortcuts (final standardised set)

| Action | Shortcut |
|--------|---------|
| Delete | `⌘⌫` |
| (Future) Open in new tab | `⌘↵` |

---

## What Does NOT Change

- Filter drawer content (domain-specific, intentionally different)
- Column definitions (domain-specific by nature)
- Inline cell editing (AssignedUserCell, StatusCell, etc.) — these are already consistent
- Pagination — already shared and working
- The NewXxx wizard/form flows
