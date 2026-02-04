"use client";

import * as React from "react";
import { Row, Table } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Store for tracking the last selected row index for shift-click range selection.
 * This needs to be outside the component to persist across renders and rows.
 */
const lastSelectedIndexRef = { current: -1 };

interface DataTableSelectCheckboxProps<TData> {
  row: Row<TData>;
  table: Table<TData>;
}

/**
 * A checkbox cell component that supports shift-click range selection.
 * 
 * When clicking with Shift held:
 * - Selects all rows between the last selected row and the current row
 * 
 * When clicking with Ctrl/Cmd held:
 * - Toggles the current row selection without affecting others
 * 
 * When clicking normally:
 * - Toggles the current row selection and updates the last selected index
 */
export function DataTableSelectCheckbox<TData>({
  row,
  table,
}: DataTableSelectCheckboxProps<TData>) {
  const rowIndex = row.index;
  const rows = table.getRowModel().rows;

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      
      // Prevent browser text selection on shift-click
      if (e.shiftKey) {
        e.preventDefault();
      }

      if (e.shiftKey && lastSelectedIndexRef.current !== -1) {
        // Shift-click (with or without Cmd/Ctrl): Select range
        const start = Math.min(lastSelectedIndexRef.current, rowIndex);
        const end = Math.max(lastSelectedIndexRef.current, rowIndex);

        // Select all rows in the range
        for (let i = start; i <= end; i++) {
          if (rows[i]) {
            rows[i].toggleSelected(true);
          }
        }
      } else if (e.metaKey || e.ctrlKey) {
        // Ctrl/Cmd-click (without Shift): Toggle without updating last selected
        row.toggleSelected();
      } else {
        // Normal click: Toggle and update last selected
        row.toggleSelected();
        lastSelectedIndexRef.current = rowIndex;
      }
    },
    [row, rowIndex, rows]
  );

  const handleCheckedChange = React.useCallback(
    (value: boolean) => {
      row.toggleSelected(!!value);
      if (value) {
        lastSelectedIndexRef.current = rowIndex;
      }
    },
    [row, rowIndex]
  );

  return (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={handleCheckedChange}
      onClick={handleClick}
      aria-label="Select row"
      className="translate-y-[2px]"
    />
  );
}

interface DataTableSelectAllCheckboxProps<TData> {
  table: Table<TData>;
}

/**
 * A checkbox header component for selecting all rows on the current page.
 * Resets the last selected index when used.
 */
export function DataTableSelectAllCheckbox<TData>({
  table,
}: DataTableSelectAllCheckboxProps<TData>) {
  const handleCheckedChange = React.useCallback(
    (value: boolean) => {
      table.toggleAllPageRowsSelected(!!value);
      // Reset last selected when using select all
      lastSelectedIndexRef.current = -1;
    },
    [table]
  );

  return (
    <Checkbox
      checked={
        table.getIsAllPageRowsSelected() ||
        (table.getIsSomePageRowsSelected() && "indeterminate")
      }
      onCheckedChange={handleCheckedChange}
      aria-label="Select all"
      className="translate-y-[2px]"
    />
  );
}

/**
 * Reset the last selected index.
 * Call this when clearing selection or navigating to a different page.
 */
export function resetLastSelectedIndex() {
  lastSelectedIndexRef.current = -1;
}
