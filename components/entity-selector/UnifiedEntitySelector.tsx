"use client";

/**
 * UnifiedEntitySelector
 * 
 * A high-performance, unified Command Menu component for selecting entities
 * (Clients, Properties, Documents, Events) across the application.
 * 
 * Features:
 * - Debounced search (300ms)
 * - Multi-field search
 * - Virtualized list for performance
 * - Keyboard navigation
 * - Single and multi-select modes
 * - Grouped display by entity type
 * - Result limiting to 10 per category
 * - 5-minute SWR caching
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Check,
  ChevronsUpDown,
  X,
  Users,
  Home,
  FileText,
  Calendar,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  useUnifiedEntitySearch,
  type EntityType,
  type EntitySearchResult,
} from "@/hooks/swr/useUnifiedEntitySearch";

// ============================================
// Types
// ============================================

export interface UnifiedEntitySelectorProps {
  /**
   * Selection mode
   */
  mode: "single" | "multi";

  /**
   * Entity types to show
   */
  entityTypes: EntityType[];

  /**
   * Current selection (string for single, string[] for multi)
   */
  value: string | string[];

  /**
   * Change handler
   */
  onChange: (value: string | string[]) => void;

  /**
   * Placeholder text for trigger button
   */
  placeholder?: string;

  /**
   * Placeholder text for search input
   */
  searchPlaceholder?: string;

  /**
   * Maximum number of selections (multi mode only)
   */
  maxSelections?: number;

  /**
   * Maximum results per category
   */
  maxResultsPerCategory?: number;

  /**
   * Trigger button className
   */
  triggerClassName?: string;

  /**
   * Content className
   */
  className?: string;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Required field
   */
  required?: boolean;

  /**
   * Optional type-specific filters
   */
  filters?: {
    clientStatus?: string;
    propertyStatus?: string;
    documentType?: string;
    eventType?: string;
  };

  /**
   * Empty state message
   */
  emptyMessage?: string;

  /**
   * Loading state message
   */
  loadingMessage?: string;

  /**
   * Show entity type icons
   */
  showIcons?: boolean;

  /**
   * Show subtitles (email, address, etc.)
   */
  showSubtitles?: boolean;

  /**
   * Callback when an entity is selected
   */
  onSelect?: (entity: EntitySearchResult) => void;
}

// ============================================
// Entity Type Config
// ============================================

const ENTITY_CONFIG: Record<
  EntityType,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    colorClass: string;
  }
> = {
  client: {
    icon: Users,
    label: "Clients",
    colorClass: "text-primary",
  },
  property: {
    icon: Home,
    label: "Properties",
    colorClass: "text-success",
  },
  document: {
    icon: FileText,
    label: "Documents",
    colorClass: "text-blue-500",
  },
  event: {
    icon: Calendar,
    label: "Events",
    colorClass: "text-purple-500",
  },
};

// ============================================
// Component
// ============================================

export function UnifiedEntitySelector({
  mode,
  entityTypes,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  maxSelections = 10,
  maxResultsPerCategory = 10,
  triggerClassName,
  className,
  disabled = false,
  required = false,
  filters,
  emptyMessage = "No results found.",
  loadingMessage = "Searching...",
  showIcons = true,
  showSubtitles = true,
  onSelect,
}: UnifiedEntitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [currentLimit, setCurrentLimit] = useState(10);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Limit progression: 10 -> 20 -> 30 -> 60 (max)
  const LIMIT_PROGRESSION = [10, 20, 30, 60];
  const MAX_LIMIT = 60;

  // Get the next limit in progression
  const getNextLimit = useCallback(() => {
    const currentIndex = LIMIT_PROGRESSION.indexOf(currentLimit);
    if (currentIndex === -1 || currentIndex >= LIMIT_PROGRESSION.length - 1) {
      return MAX_LIMIT;
    }
    return LIMIT_PROGRESSION[currentIndex + 1];
  }, [currentLimit]);

  // Check if we can load more
  const canLoadMore = currentLimit < MAX_LIMIT;

  // Handle "View more" click
  const handleViewMore = useCallback(() => {
    setCurrentLimit(getNextLimit());
  }, [getNextLimit]);

  // Reset limit when popover closes or search changes
  useEffect(() => {
    if (!open) {
      setCurrentLimit(10);
    }
  }, [open]);

  useEffect(() => {
    setCurrentLimit(10);
  }, [searchQuery]);

  // Normalize value to array for internal use
  const selectedValues = useMemo(() => {
    if (mode === "single") {
      return value ? [value as string] : [];
    }
    return Array.isArray(value) ? value : [];
  }, [mode, value]);

  // Use the unified search hook with dynamic limit
  const {
    groupedResults,
    isLoading,
    isSearching,
    debouncedQuery,
  } = useUnifiedEntitySearch(searchQuery, {
    types: entityTypes,
    limit: currentLimit,
    filters,
    enabled: open,
  });

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    const results: EntitySearchResult[] = [];
    for (const type of entityTypes) {
      const typeResults = groupedResults[type] || [];
      results.push(...typeResults);
    }
    return results;
  }, [groupedResults, entityTypes]);

  // Get selected entities for display
  const selectedEntities = useMemo(() => {
    if (selectedValues.length === 0) return [];
    
    // Find entities from results that match selected values
    return flatResults.filter((r) => selectedValues.includes(r.value));
  }, [flatResults, selectedValues]);

  // Handle selection
  const handleSelect = useCallback(
    (entity: EntitySearchResult) => {
      if (mode === "single") {
        onChange(entity.value);
        onSelect?.(entity);
        setOpen(false);
        setSearchQuery("");
      } else {
        // Multi-select
        const isSelected = selectedValues.includes(entity.value);
        
        if (isSelected) {
          // Deselect
          const newValues = selectedValues.filter((v) => v !== entity.value);
          onChange(newValues);
        } else {
          // Check max selections
          if (selectedValues.length >= maxSelections) {
            return;
          }
          const newValues = [...selectedValues, entity.value];
          onChange(newValues);
          onSelect?.(entity);
        }
      }
    },
    [mode, onChange, onSelect, selectedValues, maxSelections]
  );

  // Handle remove (multi mode)
  const handleRemove = useCallback(
    (valueToRemove: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (mode === "multi") {
        const newValues = selectedValues.filter((v) => v !== valueToRemove);
        onChange(newValues);
      } else {
        onChange("");
      }
    },
    [mode, onChange, selectedValues]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < flatResults.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatResults[highlightedIndex]) {
            handleSelect(flatResults[highlightedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
        case "Home":
          e.preventDefault();
          setHighlightedIndex(0);
          break;
        case "End":
          e.preventDefault();
          setHighlightedIndex(flatResults.length - 1);
          break;
      }
    },
    [open, flatResults, highlightedIndex, handleSelect]
  );

  // Reset highlighted index on search change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [debouncedQuery]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0) {
      const items = listRef.current.querySelectorAll("[data-entity-item]");
      const item = items[highlightedIndex];
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  // Focus input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      // Small delay to ensure popover is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  // Render trigger content
  const renderTriggerContent = () => {
    if (selectedValues.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    if (mode === "single") {
      const entity = selectedEntities[0];
      if (!entity) {
        // Value exists but entity not in results yet
        return <span className="truncate">{selectedValues[0]}</span>;
      }
      
      const config = ENTITY_CONFIG[entity.type];
      const Icon = config.icon;
      
      return (
        <div className="flex items-center gap-2 truncate">
          {showIcons && <Icon className={cn("h-4 w-4", config.colorClass)} />}
          <span className="truncate">{entity.label}</span>
        </div>
      );
    }

    // Multi mode - show badges
    return (
      <div className="flex flex-wrap gap-1 flex-1 min-w-0">
        {selectedValues.slice(0, 3).map((val) => {
          const entity = selectedEntities.find((e) => e.value === val);
          return (
            <Badge key={val} variant="secondary" className="max-w-[150px]">
              <span className="truncate">{entity?.label || val}</span>
              <button
                type="button"
                className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring"
                onClick={(e) => handleRemove(val, e)}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
        {selectedValues.length > 3 && (
          <Badge variant="outline">+{selectedValues.length - 3}</Badge>
        )}
      </div>
    );
  };

  // Render entity item - using div with explicit click handlers for proper mouse support
  const renderEntityItem = (
    entity: EntitySearchResult,
    index: number,
    isLastInGroup: boolean
  ) => {
    const isSelected = selectedValues.includes(entity.value);
    const isHighlighted = index === highlightedIndex;
    const config = ENTITY_CONFIG[entity.type];
    const Icon = config.icon;

    return (
      <div
        key={entity.value}
        role="menuitem"
        tabIndex={0}
        aria-current={isSelected ? "true" : undefined}
        data-selected={isSelected || undefined}
        data-entity-item
        data-value={entity.value}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSelect(entity);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSelect(entity);
          }
        }}
        onMouseDown={(e) => {
          // Prevent focus loss from popover on primary click only
          // Don't block scroll wheel or other mouse buttons
          if (e.button === 0) {
            e.preventDefault();
          }
        }}
        onMouseEnter={() => setHighlightedIndex(index)}
        className={cn(
          "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:bg-accent focus:text-accent-foreground",
          "transition-colors duration-150",
          isHighlighted && "bg-accent text-accent-foreground",
          isSelected && "bg-accent/50",
          isLastInGroup && "mb-1"
        )}
      >
        {showIcons && (
          <Icon className={cn("h-4 w-4 shrink-0", config.colorClass)} />
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="truncate font-medium">{entity.label}</span>
          {showSubtitles && entity.metadata.subtitle && (
            <span className="truncate text-xs text-muted-foreground">
              {entity.metadata.subtitle}
            </span>
          )}
        </div>
        {isSelected && (
          <Check className="h-4 w-4 shrink-0 text-primary" />
        )}
      </div>
    );
  };

  // Check if we have any results
  const hasResults = entityTypes.some(
    (type) => (groupedResults[type]?.length || 0) > 0
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-required={required}
          disabled={disabled}
          className={cn(
            "w-full justify-between min-h-10 h-auto",
            triggerClassName
          )}
        >
          {renderTriggerContent()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[var(--radix-popover-trigger-width)] p-0", className)}
        align="start"
        onKeyDown={handleKeyDown}
      >
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            placeholder={searchPlaceholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList ref={listRef}>
            {/* Loading state */}
            {(isLoading || isSearching) && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {loadingMessage}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isSearching && !hasResults && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}

            {/* Results grouped by type */}
            {!isLoading && !isSearching && hasResults && (
              <>
                {entityTypes.map((type, typeIndex) => {
                  const typeResults = groupedResults[type] || [];
                  if (typeResults.length === 0) return null;

                  const config = ENTITY_CONFIG[type];
                  const startIndex = entityTypes
                    .slice(0, typeIndex)
                    .reduce(
                      (acc, t) => acc + (groupedResults[t]?.length || 0),
                      0
                    );

                  return (
                    <React.Fragment key={type}>
                      {typeIndex > 0 && <CommandSeparator />}
                      <CommandGroup heading={config.label}>
                        {typeResults.map((entity, i) =>
                          renderEntityItem(
                            entity,
                            startIndex + i,
                            i === typeResults.length - 1
                          )
                        )}
                      </CommandGroup>
                    </React.Fragment>
                  );
                })}

                {/* View more button */}
                {canLoadMore && flatResults.length >= currentLimit && (
                  <div className="p-2 border-t">
                    <button
                      type="button"
                      onClick={handleViewMore}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                    >
                      <ChevronDown className="h-4 w-4" />
                      <span>View more (showing {flatResults.length} of {getNextLimit()})</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>

        {/* Footer with selection info (multi mode) */}
        {mode === "multi" && selectedValues.length > 0 && (
          <div className="border-t px-3 py-2 text-xs text-muted-foreground">
            {selectedValues.length} of {maxSelections} selected
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default UnifiedEntitySelector;
