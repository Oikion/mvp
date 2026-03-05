# Page Size Persistence Design

**Date**: 2026-03-04
**Status**: Approved

## Summary

Persist the user's "rows per page" preference globally across all data tables using a browser cookie. No filter persistence.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Global (one value for all tables) | Users who want 30 rows want 30 everywhere |
| Storage | Cookie only | Simple, SSR-friendly, follows sidebar cookie pattern |
| Filters | Not persisted | Already in URL params; stale cookie filters cause confusion |
| Approach | TanStack Table wrapper hook | Single integration point at table level |

## Architecture

```
Cookie: "oikion-page-size" (value: 10-500, 1yr expiry, path: /)
                    |
    lib/hooks/use-table-with-page-size.ts
    (wraps useReactTable, injects pageSize from cookie,
     syncs changes back via useEffect)
                    |
    Each data-table.tsx: useReactTable() → useTableWithPageSize()
```

## Hook: `useTableWithPageSize`

- Location: `lib/hooks/use-table-with-page-size.ts`
- Reads `oikion-page-size` cookie on mount
- Validates against `VALID_SIZES = [10, 20, 30, 40, 50, 100, 250, 500]`
- Falls back to `10` if invalid/missing
- Injects into `initialState.pagination.pageSize`
- Writes cookie on `pageSize` state change via `useEffect`
- Uses `js-cookie` (check if already a dependency, otherwise native `document.cookie`)

## Files to Modify

### New Files
| File | Purpose |
|------|---------|
| `lib/hooks/use-table-with-page-size.ts` | The wrapper hook |

### Modified Files (swap `useReactTable` → `useTableWithPageSize`)
| File | Table |
|------|-------|
| `components/ui/data-table/data-table.tsx` | Canonical shared DataTable |
| `app/.../crm/accounts/table-components/data-table.tsx` | Accounts (Clients) |
| `app/.../crm/contacts/table-components/data-table.tsx` | Contacts |
| `app/.../mls/properties/table-components/data-table.tsx` | Properties |
| `app/.../employees/table-components/data-table.tsx` | Employees |
| `app/.../admin/users/table-components/data-table.tsx` | Admin Users |

### Modified Files (extend page size options to include 100, 250, 500)
| File | Notes |
|------|-------|
| `components/ui/data-table/data-table-pagination.tsx` | Canonical — i18n |
| `app/.../crm/accounts/table-components/data-table-pagination.tsx` | Accounts + Properties (re-exported) |
| `app/.../crm/contacts/table-components/data-table-pagination.tsx` | Contacts — legacy |
| `app/.../employees/table-components/data-table-pagination.tsx` | Employees — legacy |
| `app/.../admin/users/table-components/data-table-pagination.tsx` | Admin Users — legacy |

## Out of Scope

- Platform Admin tables (server-side pagination, fixed page size)
- Documents page (card grid, no table pagination)
- Filter persistence (filters stay in URL params)
- Cross-device sync (cookie only, no DB)
- Per-table overrides (global value only)
