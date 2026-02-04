"use client";

/**
 * MentionInput
 * 
 * Textarea with @ mention support for documents.
 * Uses unified entity search for blazingly fast, cached results.
 * Multi-field search: name, email, phone, address, ID, etc.
 * 
 * Features:
 * - Unified entity search across clients, properties, documents, events
 * - Full mouse & keyboard navigation support
 * - Debounced search with SWR caching
 * - Accessible with proper ARIA attributes
 * - Legacy options prop for backward compatibility
 */

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandList } from "@/components/ui/command";
import { Users, Home, Calendar, CheckSquare, FileText, Loader2, Search, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnifiedEntitySearch, type EntitySearchResult } from "@/hooks/swr/useUnifiedEntitySearch";

// Supported entity types for mentions
type MentionEntityType = "client" | "property" | "event" | "task" | "document";

// Ordered list of entity types for rendering
const ENTITY_TYPE_ORDER: MentionEntityType[] = ["client", "property", "document", "event", "task"];

// Entity configuration for consistent styling
const ENTITY_CONFIG: Record<MentionEntityType, {
  icon: typeof Users;
  colorClass: string;
  label: string;
}> = {
  client: {
    icon: Users,
    colorClass: "text-primary",
    label: "Clients",
  },
  property: {
    icon: Home,
    colorClass: "text-success",
    label: "Properties",
  },
  document: {
    icon: FileText,
    colorClass: "text-blue-600",
    label: "Documents",
  },
  event: {
    icon: Calendar,
    colorClass: "text-purple-600",
    label: "Events",
  },
  task: {
    icon: CheckSquare,
    colorClass: "text-warning",
    label: "Tasks",
  },
};

export interface MentionOption {
  id: string;
  name: string;
  type: "client" | "property" | "event" | "task";
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  /** @deprecated Use unified entity search instead. Kept for backward compatibility. */
  options?: MentionOption[];
  placeholder?: string;
  className?: string;
}

export function MentionInput({
  value,
  onChange,
  options = [],
  placeholder = "Type @ to mention...",
  className,
}: MentionInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [currentLimit, setCurrentLimit] = useState(10);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Reset limit when popover closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentLimit(10);
    }
  }, [isOpen]);

  // Use unified entity search for all entity types (except tasks which aren't supported yet)
  const {
    groupedResults,
    isLoading: isSearchLoading,
    isSearching,
  } = useUnifiedEntitySearch(searchQuery, {
    types: ["client", "property", "document", "event"],
    limit: currentLimit,
    enabled: isOpen,
    debounceMs: 150,
  });

  // Convert legacy options to match unified search results for tasks (not yet supported)
  const taskResults = useMemo(() => {
    if (!searchQuery) {
      return options
        .filter((o) => o.type === "task")
        .slice(0, 5)
        .map((o) => ({
          value: o.id,
          label: o.name,
          type: "task" as const,
          metadata: { subtitle: "" },
        }));
    }
    return options
      .filter(
        (o) =>
          o.type === "task" &&
          o.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 5)
      .map((o) => ({
        value: o.id,
        label: o.name,
        type: "task" as const,
        metadata: { subtitle: "" },
      }));
  }, [options, searchQuery]);

  // Flatten all results for keyboard navigation
  const flattenedResults = useMemo(() => {
    const results: Array<EntitySearchResult | { value: string; label: string; type: "task"; metadata: { subtitle: string } }> = [];
    
    for (const type of ENTITY_TYPE_ORDER) {
      if (type === "task") {
        results.push(...taskResults);
      } else {
        const typeResults = groupedResults[type] || [];
        results.push(...typeResults);
      }
    }
    
    return results;
  }, [groupedResults, taskResults]);

  // Total results count
  const totalResults = flattenedResults.length;
  const isLoading = isSearchLoading || isSearching;

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [flattenedResults.length, searchQuery]);

  // Reset highlighted index when popover closes
  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0) {
      const highlightedElement = listRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      );
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  // Focus the search input when popover opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle search input change in the popover
  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setHighlightedIndex(0);
  }, []);

  // Handle search input keyboard navigation
  const handleSearchInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (totalResults > 0) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < totalResults - 1 ? prev + 1 : 0
          );
          return;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : totalResults - 1
          );
          return;
        case "Enter": {
          e.preventDefault();
          const selectedResult = flattenedResults[highlightedIndex];
          if (selectedResult) {
            insertMention(selectedResult.label);
          }
          return;
        }
      }
    }
    
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
      textareaRef.current?.focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalResults, flattenedResults, highlightedIndex]);

  // Clear search query
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setHighlightedIndex(0);
    searchInputRef.current?.focus();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(position);

    // Check if user is typing @
    const textBeforeCursor = newValue.substring(0, position);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex >= 0) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // If there's no space after @, show suggestions
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("(") && !textAfterAt.includes(")")) {
        setSearchQuery(textAfterAt);
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  const insertMention = useCallback((name: string) => {
    if (!textareaRef.current) return;

    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex >= 0) {
      const beforeAt = value.substring(0, lastAtIndex);
      const mentionText = `@(${name})`;
      const newValue = beforeAt + mentionText + " " + textAfterCursor;
      
      onChange(newValue);
      setIsOpen(false);
      setSearchQuery("");

      // Focus back on textarea and set cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = lastAtIndex + mentionText.length + 1;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    }
  }, [value, cursorPosition, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle keyboard navigation when popover is open
    if (isOpen && totalResults > 0) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < totalResults - 1 ? prev + 1 : 0
          );
          return;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : totalResults - 1
          );
          return;
        case "Enter": {
          e.preventDefault();
          const selectedResult = flattenedResults[highlightedIndex];
          if (selectedResult) {
            insertMention(selectedResult.label);
          }
          return;
        }
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery("");
          return;
        case "Tab":
          setIsOpen(false);
          setSearchQuery("");
          return;
      }
    }
  };

  // Render a single entity item with proper mouse & keyboard support
  const renderEntityItem = (
    entity: { value: string; label: string; type: MentionEntityType; metadata: { subtitle: string } },
    globalIndex: number,
    isLastInGroup: boolean
  ) => {
    const isHighlighted = globalIndex === highlightedIndex;
    const config = ENTITY_CONFIG[entity.type];
    const Icon = config.icon;

    return (
      <div
        key={entity.value}
        role="menuitem"
        tabIndex={0}
        aria-current={isHighlighted ? "true" : undefined}
        data-highlighted={isHighlighted || undefined}
        data-index={globalIndex}
        data-entity-item
        data-value={entity.value}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          insertMention(entity.label);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            insertMention(entity.label);
          }
        }}
        onMouseDown={(e) => {
          // Prevent focus loss from popover on primary click only
          if (e.button === 0) {
            e.preventDefault();
          }
        }}
        onMouseEnter={() => setHighlightedIndex(globalIndex)}
        className={cn(
          "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:bg-accent focus:text-accent-foreground",
          "transition-colors duration-150",
          isHighlighted && "bg-accent text-accent-foreground",
          isLastInGroup && "mb-1"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", config.colorClass)} />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="truncate font-medium">{entity.label}</span>
          {entity.metadata.subtitle && (
            <span className="truncate text-xs text-muted-foreground">
              {entity.metadata.subtitle}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Group results by entity type for visual organization
  const renderGroupedResults = () => {
    let globalIndex = 0;
    const groups: React.ReactNode[] = [];

    for (const type of ENTITY_TYPE_ORDER) {
      let typeResults: Array<{ value: string; label: string; type: MentionEntityType; metadata: { subtitle: string } }>;
      
      if (type === "task") {
        typeResults = taskResults;
      } else {
        typeResults = (groupedResults[type] || []) as Array<{ value: string; label: string; type: MentionEntityType; metadata: { subtitle: string } }>;
      }
      
      if (typeResults.length === 0) continue;

      const config = ENTITY_CONFIG[type];

      const items = typeResults.map((entity, localIndex) => {
        const currentIndex = globalIndex;
        globalIndex++;
        const isLast = localIndex === typeResults.length - 1;
        return renderEntityItem(entity, currentIndex, isLast);
      });

      groups.push(
        <CommandGroup key={type} heading={config.label}>
          {items}
        </CommandGroup>
      );
    }

    return groups;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverAnchor asChild>
        <div className={cn("relative", className)}>
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSelect={(e) => {
              const target = e.target as HTMLTextAreaElement;
              setCursorPosition(target.selectionStart || 0);
            }}
            placeholder={placeholder}
            className="min-h-[100px]"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={isOpen ? "mention-listbox" : undefined}
          />
        </div>
      </PopoverAnchor>
      
      <PopoverContent 
        className="w-[350px] p-0" 
        align="start"
        side="top"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          {/* Search input inside the popover */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchInputKeyDown}
              placeholder="Search clients, properties, documents, events..."
              className="flex h-8 w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="h-5 w-5 shrink-0 rounded-sm hover:bg-muted flex items-center justify-center"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
            {isLoading && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground ml-2" />
            )}
          </div>

          <CommandList
            ref={listRef}
            id="mention-listbox"
            role="listbox"
            className="max-h-[280px] overflow-y-auto"
          >
            {(() => {
              if (isLoading && totalResults === 0) {
                return (
                  <div className="p-4 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </div>
                );
              }
              
              if (totalResults === 0) {
                return <CommandEmpty>No results found.</CommandEmpty>;
              }
              
              return (
                <>
                  {renderGroupedResults()}
                  
                  {/* View more button */}
                  {canLoadMore && totalResults >= currentLimit && (
                    <div className="p-2 border-t">
                      <button
                        type="button"
                        onClick={handleViewMore}
                        onMouseDown={(e) => e.preventDefault()}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                      >
                        <ChevronDown className="h-4 w-4" />
                        <span>View more (showing {totalResults})</span>
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </CommandList>
          
          {/* Footer with keyboard hints */}
          <div className="flex items-center justify-between px-2 py-1.5 border-t bg-muted/30 text-[10px] text-muted-foreground">
            <span>
              {(() => {
                if (totalResults === 0) {
                  return "Type to search";
                }
                const resultWord = totalResults === 1 ? "result" : "results";
                return `${totalResults} ${resultWord}`;
              })()}
            </span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 font-mono bg-background rounded border">↑↓</kbd>
                <span>navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 font-mono bg-background rounded border">↵</kbd>
                <span>select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 font-mono bg-background rounded border">esc</kbd>
                <span>close</span>
              </span>
            </div>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

