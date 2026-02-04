"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

export interface VirtualizedItem {
  id: string;
  type: string;
  value: string;
  label: React.ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  keywords?: string[];
}

export interface VirtualizedGroup {
  heading: string;
  items: VirtualizedItem[];
}

interface VirtualizedCommandListProps {
  /** Groups of items to render */
  groups: VirtualizedGroup[];
  /** Height of each item in pixels */
  itemHeight?: number;
  /** Height of group headings in pixels */
  headingHeight?: number;
  /** Maximum height of the list container */
  maxHeight?: number;
  /** Callback when an item is selected */
  onSelect?: (item: VirtualizedItem) => void;
  /** Currently selected/highlighted item index */
  selectedIndex?: number;
  /** Callback when selection changes via keyboard */
  onSelectionChange?: (index: number) => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Whether the list is loading */
  isLoading?: boolean;
  /** Loading indicator */
  loadingIndicator?: React.ReactNode;
  /** Class name for the container */
  className?: string;
}

interface FlattenedItem {
  type: "heading" | "item";
  content: string | VirtualizedItem;
  groupIndex: number;
  itemIndex?: number;
  globalItemIndex?: number;
}

/**
 * Virtualized command list for rendering thousands of items efficiently
 * Uses @tanstack/react-virtual for windowing
 */
export function VirtualizedCommandList({
  groups,
  itemHeight = 40,
  headingHeight = 32,
  maxHeight = 400,
  onSelect,
  selectedIndex = -1,
  onSelectionChange,
  emptyMessage = "No results found.",
  isLoading = false,
  loadingIndicator,
  className,
}: VirtualizedCommandListProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [internalSelectedIndex, setInternalSelectedIndex] = React.useState(selectedIndex);

  // Flatten groups into a single array for virtualization
  const flattenedItems = React.useMemo(() => {
    const items: FlattenedItem[] = [];
    let globalItemIndex = 0;

    groups.forEach((group, groupIndex) => {
      if (group.items.length > 0) {
        // Add heading
        items.push({
          type: "heading",
          content: group.heading,
          groupIndex,
        });

        // Add items
        group.items.forEach((item, itemIndex) => {
          items.push({
            type: "item",
            content: item,
            groupIndex,
            itemIndex,
            globalItemIndex: globalItemIndex++,
          });
        });
      }
    });

    return items;
  }, [groups]);

  // Total number of selectable items
  const totalSelectableItems = React.useMemo(() => {
    return flattenedItems.filter((item) => item.type === "item").length;
  }, [flattenedItems]);

  // Get the row height for each item
  const getItemHeight = React.useCallback(
    (index: number) => {
      const item = flattenedItems[index];
      return item?.type === "heading" ? headingHeight : itemHeight;
    },
    [flattenedItems, headingHeight, itemHeight]
  );

  // Virtualizer instance
  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => getItemHeight(index),
    overscan: 5,
  });

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (totalSelectableItems === 0) return;

      let newIndex = internalSelectedIndex;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        newIndex = Math.min(internalSelectedIndex + 1, totalSelectableItems - 1);
        if (internalSelectedIndex === -1) newIndex = 0;
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        newIndex = Math.max(internalSelectedIndex - 1, 0);
        if (internalSelectedIndex === -1) newIndex = totalSelectableItems - 1;
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selectedItem = flattenedItems.find(
          (item) => item.type === "item" && item.globalItemIndex === internalSelectedIndex
        );
        if (selectedItem && selectedItem.type === "item") {
          const item = selectedItem.content as VirtualizedItem;
          if (!item.disabled) {
            item.onSelect?.();
            onSelect?.(item);
          }
        }
        return;
      } else if (e.key === "Home") {
        e.preventDefault();
        newIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        newIndex = totalSelectableItems - 1;
      } else {
        return;
      }

      setInternalSelectedIndex(newIndex);
      onSelectionChange?.(newIndex);

      // Scroll to the selected item
      const flatIndex = flattenedItems.findIndex(
        (item) => item.type === "item" && item.globalItemIndex === newIndex
      );
      if (flatIndex !== -1) {
        virtualizer.scrollToIndex(flatIndex, { align: "auto" });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    internalSelectedIndex,
    totalSelectableItems,
    flattenedItems,
    onSelect,
    onSelectionChange,
    virtualizer,
  ]);

  // Sync external selectedIndex
  React.useEffect(() => {
    if (selectedIndex !== internalSelectedIndex) {
      setInternalSelectedIndex(selectedIndex);
    }
  }, [selectedIndex]);

  // Reset selection when groups change
  React.useEffect(() => {
    setInternalSelectedIndex(-1);
  }, [groups]);

  if (isLoading) {
    return (
      <div className="py-6 text-center">
        {loadingIndicator || (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Searching...
          </div>
        )}
      </div>
    );
  }

  if (flattenedItems.length === 0) {
    return (
      <CommandPrimitive.Empty className="py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </CommandPrimitive.Empty>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
      style={{ maxHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const flatItem = flattenedItems[virtualRow.index];

          if (flatItem.type === "heading") {
            return (
              <div
                key={`heading-${flatItem.groupIndex}`}
                className="absolute left-0 top-0 w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {flatItem.content as string}
                </div>
              </div>
            );
          }

          const item = flatItem.content as VirtualizedItem;
          const isSelected = flatItem.globalItemIndex === internalSelectedIndex;

          return (
            <div
              key={item.id}
              className="absolute left-0 top-0 w-full"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <CommandPrimitive.Item
                value={item.value}
                onSelect={() => {
                  if (!item.disabled) {
                    item.onSelect?.();
                    onSelect?.(item);
                  }
                }}
                disabled={item.disabled}
                className={cn(
                  "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                  isSelected && "bg-accent text-accent-foreground",
                  !isSelected && "hover:bg-accent/50"
                )}
                onMouseEnter={() => {
                  if (flatItem.globalItemIndex !== undefined) {
                    setInternalSelectedIndex(flatItem.globalItemIndex);
                    onSelectionChange?.(flatItem.globalItemIndex);
                  }
                }}
              >
                {item.label}
              </CommandPrimitive.Item>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Hook to create virtualized items from search results
 */
export function useVirtualizedSearchItems<T extends { id: string }>(
  items: T[],
  config: {
    getLabel: (item: T) => React.ReactNode;
    getValue: (item: T) => string;
    getKeywords?: (item: T) => string[];
    onSelect: (item: T) => void;
    isDisabled?: (item: T) => boolean;
  }
): VirtualizedItem[] {
  return React.useMemo(() => {
    return items.map((item) => ({
      id: item.id,
      type: "item",
      value: config.getValue(item),
      label: config.getLabel(item),
      keywords: config.getKeywords?.(item),
      onSelect: () => config.onSelect(item),
      disabled: config.isDisabled?.(item),
    }));
  }, [items, config]);
}
