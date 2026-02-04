# Keyboard Shortcuts System

## Overview

Oikion includes a comprehensive keyboard shortcuts system for power users. The system provides:

- **Global Navigation** - Quick access to any section of the app
- **Table Navigation** - Navigate and act on table rows with keyboard
- **Command Palette (CMD+K)** - Fast search across all entities with virtualized rendering

## Directory Structure

```
hooks/
  use-keyboard-shortcuts.ts    # Zustand store for shortcuts registry
  use-table-keyboard.ts        # Hook for table keyboard navigation
  swr/
    useGlobalSearch.ts         # Search hook with pagination support

components/
  GlobalSearch.tsx             # Enhanced CMD+K search overlay
  providers/
    KeyboardShortcutsProvider.tsx  # Global shortcuts provider
    AppProviders.tsx               # Combined app providers
  modals/
    KeyboardShortcutsModal.tsx     # Help modal (? shortcut)
  ui/
    virtualized-command-list.tsx   # Virtualized list for large result sets
    data-table/
      data-table.tsx               # Enhanced with keyboard navigation

app/api/global-search/route.ts     # Optimized search API with pagination
```

## Version Information

- **react-hotkeys-hook**: ^5.2.1
- **@tanstack/react-virtual**: ^3.13.13 (already in project)

## Global Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| `CMD/CTRL + K` | Open Search | Opens the global search overlay |
| `CMD/CTRL + B` | Toggle Sidebar | Expands/collapses the sidebar |
| `CMD/CTRL + D` | Dashboard | Navigate to Dashboard |
| `?` or `Shift + /` or `Shift + H` | Show Help | Opens keyboard shortcuts help modal |
| `Escape` | Close | Closes any open modal or overlay |

## Navigation Shortcuts (G + Key Sequences)

Press `G` followed by another key to navigate:

| Sequence | Destination | Path |
|----------|-------------|------|
| `G` then `D` | Dashboard | `/app` |
| `G` then `C` | CRM / Clients | `/app/crm` |
| `G` then `P` | Properties / MLS | `/app/mls` |
| `G` then `E` | Calendar / Events | `/app/calendar` |
| `G` then `O` | Documents | `/app/documents` |
| `G` then `S` | Settings | `/app/admin/settings` |

## Table Shortcuts

When a table is focused (click on it or tab to it):

| Shortcut | Action |
|----------|--------|
| `J` or `Arrow Down` | Move to next row |
| `K` or `Arrow Up` | Move to previous row |
| `Enter` or `O` | Open/view focused row |
| `E` | Edit focused row |
| `CMD/CTRL + Backspace` or `CMD/CTRL + Delete` | Delete selected row(s) |
| `X` | Toggle row selection |
| `Shift + X` | Select range |
| `CMD/CTRL + A` | Select all rows |
| `Escape` | Clear selection |

## Bulk Actions (when rows are selected)

| Shortcut | Action | Context |
|----------|--------|---------|
| `P` | Publish to Portals | Properties table - opens portal selection |

## Search Shortcuts (in CMD+K overlay)

| Shortcut | Action |
|----------|--------|
| `Arrow Up/Down` | Navigate results |
| `Enter` | Select highlighted result |
| `Tab` | Switch between filter tabs |
| `Escape` | Close search |

## Usage

### Adding Keyboard Navigation to a Table

```tsx
import { DataTable } from "@/components/ui/data-table/data-table";

function MyPage() {
  const handleRowOpen = (row) => {
    router.push(`/details/${row.original.id}`);
  };

  const handleRowDelete = async (rows) => {
    // Delete logic
  };

  return (
    <DataTable
      columns={columns}
      data={data}
      onRowOpen={handleRowOpen}
      onRowDelete={handleRowDelete}
      enableKeyboardNav={true}
    />
  );
}
```

### Adding Bulk Actions with Keyboard Shortcuts

```tsx
import { DataTable } from "@/components/ui/data-table/data-table";
import type { BulkAction } from "@/components/ui/data-table/data-table-bulk-actions";
import { Globe } from "lucide-react";

function PropertiesPage() {
  const bulkActions: BulkAction<Property>[] = [
    {
      id: "publish",
      label: "Publish to Portals",
      icon: <Globe className="h-4 w-4" />,
      shortcut: "P",  // Triggers when P is pressed with rows selected
      onClick: (selectedRows) => {
        // Handle bulk publish
        console.log("Publishing", selectedRows.length, "properties");
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={properties}
      bulkActions={bulkActions}
    />
  );
}
```

### Registering Custom Shortcuts

```tsx
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useHotkeys } from "react-hotkeys-hook";

function MyComponent() {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    registerShortcut({
      id: "my-custom-shortcut",
      label: "Do Something",
      keys: "mod+shift+s",
      category: "actions",
      scopes: ["global"],
      description: "Performs a custom action",
    });

    return () => unregisterShortcut("my-custom-shortcut");
  }, []);

  useHotkeys("mod+shift+s", () => {
    // Handle shortcut
  });
}
```

### Using the Search Hook

```tsx
import { useGlobalSearch, useFilteredSearch } from "@/hooks/swr";

// Basic search
const { results, isLoading, meta } = useGlobalSearch(query);

// Filtered search (only properties)
const { results } = useFilteredSearch(query, "property");

// With pagination
const { results, hasMore, loadMore } = useGlobalSearchInfinite(query);
```

## Performance

The system is optimized for performance:

- **Virtualized rendering**: Handles 10,000+ search results smoothly
- **Debounced search**: 300ms debounce to reduce API calls
- **Parallel queries**: Search API runs all entity queries in parallel
- **SWR caching**: Results cached for 5 minutes
- **Pagination**: Server-side pagination with configurable limits

### Performance Targets

- CMD+K overlay opens in < 50ms
- Search results render in < 100ms for 1000+ items
- Keyboard navigation responds in < 16ms (60fps)

## API Reference

### Search API (`POST /api/global-search`)

Request body:
```json
{
  "query": "search term",
  "types": ["property", "client"],  // optional, defaults to all
  "page": 1,                         // optional, defaults to 1
  "limit": 50,                       // optional, defaults to 50, max 100
  "includeRelationships": true       // optional, defaults to true
}
```

Response:
```json
{
  "properties": [...],
  "clients": [...],
  "contacts": [...],
  "documents": [...],
  "events": [...],
  "meta": {
    "query": "search term",
    "page": 1,
    "limit": 50,
    "counts": {
      "properties": 150,
      "clients": 75,
      "contacts": 30,
      "documents": 45,
      "events": 20,
      "total": 320
    },
    "hasMore": true,
    "timing": 45.2
  }
}
```

## Accessibility

- All shortcuts work with standard keyboard layouts
- Platform-aware: Shows CMD on Mac, CTRL on Windows/Linux
- Focus management for table navigation
- Screen reader compatible labels
- Visual focus indicators on selected rows
