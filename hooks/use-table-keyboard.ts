"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import type { Table, Row } from "@tanstack/react-table";

export interface TableKeyboardOptions<TData> {
  /** The TanStack table instance */
  table: Table<TData>;
  /** Callback when a row is opened/viewed (Enter or O) */
  onOpen?: (row: Row<TData>) => void;
  /** Callback when a row should be edited (E) */
  onEdit?: (row: Row<TData>) => void;
  /** Callback when row(s) should be deleted (Shift+Backspace) */
  onDelete?: (rows: Row<TData>[]) => void;
  /** Whether keyboard navigation is enabled */
  enabled?: boolean;
  /** Container element ref for focus management */
  containerRef?: React.RefObject<HTMLElement | null>;
}

export interface TableKeyboardState {
  /** Index of the currently focused row (-1 if none) */
  focusedRowIndex: number;
  /** Whether the table has keyboard focus */
  isTableFocused: boolean;
}

export interface TableKeyboardReturn<TData> extends TableKeyboardState {
  /** Set the focused row index */
  setFocusedRowIndex: (index: number) => void;
  /** Focus the table container */
  focusTable: () => void;
  /** Get the currently focused row */
  getFocusedRow: () => Row<TData> | undefined;
  /** Get all selected rows */
  getSelectedRows: () => Row<TData>[];
  /** Check if a row index is focused */
  isRowFocused: (index: number) => boolean;
  /** Handle row click (for mouse interaction) */
  handleRowClick: (index: number, event?: React.MouseEvent) => void;
  /** Props to spread on the table container */
  tableContainerProps: {
    tabIndex: number;
    onFocus: () => void;
    onBlur: (e: React.FocusEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    "data-keyboard-nav": boolean;
  };
  /** Props to spread on each table row */
  getRowProps: (index: number) => {
    "data-focused": boolean;
    "data-selected": boolean;
    onClick: (e: React.MouseEvent) => void;
    className?: string;
  };
}

/**
 * Hook for adding keyboard navigation and actions to data tables
 * 
 * Shortcuts:
 * - J / Arrow Down: Select next row
 * - K / Arrow Up: Select previous row
 * - Enter / O: Open/view selected row
 * - E: Edit selected row
 * - Shift+Backspace: Delete selected row(s)
 * - X: Toggle row selection
 * - Shift+X: Select range
 * - Escape: Clear selection and focus
 * - Ctrl/Cmd+A: Select all rows
 */
export function useTableKeyboard<TData>({
  table,
  onOpen,
  onEdit,
  onDelete,
  enabled = true,
  containerRef,
}: TableKeyboardOptions<TData>): TableKeyboardReturn<TData> {
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const [isTableFocused, setIsTableFocused] = useState(false);
  const lastSelectedIndex = useRef<number>(-1);
  const internalContainerRef = useRef<HTMLElement | null>(null);
  
  const { setActiveScope } = useKeyboardShortcuts();

  const actualContainerRef = containerRef || internalContainerRef;

  // Get visible rows from the table
  const rows = table.getRowModel().rows;
  const rowCount = rows.length;

  // Set scope when table is focused
  useEffect(() => {
    if (isTableFocused && enabled) {
      setActiveScope("table");
    } else {
      setActiveScope("global");
    }
  }, [isTableFocused, enabled, setActiveScope]);

  // Get focused row
  const getFocusedRow = useCallback(() => {
    if (focusedRowIndex >= 0 && focusedRowIndex < rowCount) {
      return rows[focusedRowIndex];
    }
    return undefined;
  }, [focusedRowIndex, rows, rowCount]);

  // Get selected rows
  const getSelectedRows = useCallback(() => {
    return table.getSelectedRowModel().rows;
  }, [table]);

  // Check if row is focused
  const isRowFocused = useCallback(
    (index: number) => focusedRowIndex === index,
    [focusedRowIndex]
  );

  // Navigate to next row
  const goToNextRow = useCallback(() => {
    if (rowCount === 0) return;
    setFocusedRowIndex((prev) => {
      // If no row focused yet, start at 0
      if (prev === -1) return 0;
      const next = prev < rowCount - 1 ? prev + 1 : prev;
      return next;
    });
  }, [rowCount]);

  // Navigate to previous row
  const goToPreviousRow = useCallback(() => {
    if (rowCount === 0) return;
    setFocusedRowIndex((prev) => {
      // If no row focused yet, start at last row
      if (prev === -1) return rowCount - 1;
      const next = prev > 0 ? prev - 1 : 0;
      return next;
    });
  }, [rowCount]);

  // Toggle selection of focused row
  const toggleFocusedRowSelection = useCallback(() => {
    const row = getFocusedRow();
    if (row) {
      row.toggleSelected();
      lastSelectedIndex.current = focusedRowIndex;
    }
  }, [getFocusedRow, focusedRowIndex]);

  // Select range from last selected to current
  const selectRange = useCallback(() => {
    if (lastSelectedIndex.current === -1 || focusedRowIndex === -1) {
      toggleFocusedRowSelection();
      return;
    }

    const start = Math.min(lastSelectedIndex.current, focusedRowIndex);
    const end = Math.max(lastSelectedIndex.current, focusedRowIndex);

    for (let i = start; i <= end; i++) {
      if (rows[i]) {
        rows[i].toggleSelected(true);
      }
    }
  }, [focusedRowIndex, rows, toggleFocusedRowSelection]);

  // Select all rows
  const selectAll = useCallback(() => {
    table.toggleAllRowsSelected(true);
  }, [table]);

  // Clear selection
  const clearSelection = useCallback(() => {
    table.resetRowSelection();
    setFocusedRowIndex(-1);
    lastSelectedIndex.current = -1;
  }, [table]);

  // Open focused row
  const openFocusedRow = useCallback(() => {
    const row = getFocusedRow();
    if (row && onOpen) {
      onOpen(row);
    }
  }, [getFocusedRow, onOpen]);

  // Edit focused row
  const editFocusedRow = useCallback(() => {
    const row = getFocusedRow();
    if (row && onEdit) {
      onEdit(row);
    }
  }, [getFocusedRow, onEdit]);

  // Delete selected rows
  const deleteSelectedRows = useCallback(() => {
    const selectedRows = getSelectedRows();
    if (selectedRows.length > 0 && onDelete) {
      onDelete(selectedRows);
    } else {
      // If no rows selected, delete the focused row
      const focusedRow = getFocusedRow();
      if (focusedRow && onDelete) {
        onDelete([focusedRow]);
      }
    }
  }, [getSelectedRows, getFocusedRow, onDelete]);

  // Focus table
  const focusTable = useCallback(() => {
    actualContainerRef.current?.focus();
  }, [actualContainerRef]);

  // Handle row click
  const handleRowClick = useCallback(
    (index: number, event?: React.MouseEvent) => {
      setFocusedRowIndex(index);
      
      if (event?.shiftKey && lastSelectedIndex.current !== -1) {
        // Range select
        const start = Math.min(lastSelectedIndex.current, index);
        const end = Math.max(lastSelectedIndex.current, index);
        for (let i = start; i <= end; i++) {
          rows[i]?.toggleSelected(true);
        }
      } else if (event?.metaKey || event?.ctrlKey) {
        // Toggle selection
        rows[index]?.toggleSelected();
      }
      
      lastSelectedIndex.current = index;
      setIsTableFocused(true);
      
      // Re-focus the container to maintain keyboard nav
      actualContainerRef.current?.focus();
    },
    [rows, actualContainerRef]
  );

  // Handle focus event
  const handleFocus = useCallback(() => {
    setIsTableFocused(true);
  }, []);

  // Handle blur event - check if focus is moving outside the container
  const handleBlur = useCallback((e: React.FocusEvent) => {
    const container = actualContainerRef.current;
    const relatedTarget = e.relatedTarget as Node | null;
    
    // If focus is moving to an element within the container, don't blur
    if (container && relatedTarget && container.contains(relatedTarget)) {
      return;
    }
    
    setIsTableFocused(false);
  }, [actualContainerRef]);

  // Keyboard event handler for inline key handling
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled) return;
      
      const key = e.key.toLowerCase();
      const isInput = (e.target as HTMLElement).tagName === "INPUT";
      
      // Don't handle if we're in an input
      if (isInput) return;

      switch (key) {
        case "j":
        case "arrowdown":
          e.preventDefault();
          goToNextRow();
          break;
        case "k":
        case "arrowup":
          e.preventDefault();
          goToPreviousRow();
          break;
        case "enter":
          e.preventDefault();
          if (onOpen) {
            openFocusedRow();
          }
          break;
        case "o":
          if (onOpen) {
            e.preventDefault();
            openFocusedRow();
          }
          break;
        case "e":
          if (onEdit) {
            e.preventDefault();
            editFocusedRow();
          }
          break;
        case "x":
          e.preventDefault();
          if (e.shiftKey) {
            selectRange();
          } else {
            toggleFocusedRowSelection();
          }
          break;
        case "escape":
          e.preventDefault();
          clearSelection();
          break;
        case "a":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            selectAll();
          }
          break;
        case "backspace":
        case "delete":
          // CMD/CTRL + Backspace or Delete to delete
          if ((e.metaKey || e.ctrlKey) && onDelete) {
            e.preventDefault();
            deleteSelectedRows();
          }
          break;
      }
    },
    [
      enabled,
      goToNextRow,
      goToPreviousRow,
      openFocusedRow,
      editFocusedRow,
      toggleFocusedRowSelection,
      selectRange,
      clearSelection,
      selectAll,
      deleteSelectedRows,
      onOpen,
      onEdit,
      onDelete,
    ]
  );

  // Table container props
  const tableContainerProps = {
    tabIndex: 0,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    "data-keyboard-nav": enabled,
  };

  // Row props getter
  const getRowProps = useCallback(
    (index: number) => {
      const row = rows[index];
      const isSelected = row?.getIsSelected() ?? false;
      const isFocused = isRowFocused(index);

      return {
        "data-focused": isFocused,
        "data-selected": isSelected,
        onClick: (e: React.MouseEvent) => handleRowClick(index, e),
        className: isFocused ? "ring-2 ring-primary ring-inset" : undefined,
      };
    },
    [rows, isRowFocused, handleRowClick]
  );

  return {
    focusedRowIndex,
    isTableFocused,
    setFocusedRowIndex,
    focusTable,
    getFocusedRow,
    getSelectedRows,
    isRowFocused,
    handleRowClick,
    tableContainerProps,
    getRowProps,
  };
}
