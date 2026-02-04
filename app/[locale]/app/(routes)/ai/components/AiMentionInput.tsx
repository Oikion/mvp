"use client";

/**
 * AiMentionInput
 * 
 * Input component with @ mention support for AI chat.
 * Uses unified entity search for blazingly fast, cached results.
 * Multi-field search: name, email, phone, address, ID, etc.
 * 
 * Features:
 * - Unified entity search across clients, properties, documents, events
 * - Full mouse & keyboard navigation support
 * - Debounced search with SWR caching
 * - Accessible with proper ARIA attributes
 */

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandList } from "@/components/ui/command";
import { Users, Home, Calendar, FileText, Loader2, Check, Search, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnifiedEntitySearch, type EntitySearchResult } from "@/hooks/swr/useUnifiedEntitySearch";
import { useMentionShortcut, type MentionCategory } from "@/hooks/use-mention-shortcut";
import type { Dictionary } from "@/dictionaries";

// Supported entity types for mentions
type MentionEntityType = "client" | "property" | "event" | "document";

// Ordered list of entity types for rendering
const ENTITY_TYPE_ORDER: MentionEntityType[] = ["client", "property", "document", "event"];

// Entity configuration for consistent styling across the UI
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
};

export interface MentionedEntity {
  id: string;
  name: string;
  type: MentionEntityType;
}

interface AiMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (mentions: MentionedEntity[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onSubmit: () => void;
  dict?: Dictionary;
}

export function AiMentionInput({
  value,
  onChange,
  onMentionsChange,
  placeholder = "Type @ to mention...",
  disabled,
  className,
  onSubmit,
  dict,
}: AiMentionInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Get translations for mentions
  const t = dict?.ai?.mentions || {};
  const categories = (t as { categories?: Record<string, string> })?.categories || {};
  const [cursorPosition, setCursorPosition] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [mentionedEntities, setMentionedEntities] = useState<MentionedEntity[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [currentLimit, setCurrentLimit] = useState(10);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Mention shortcut store for quick entity selection
  const { setActiveInput } = useMentionShortcut();

  // Callback to insert mention from shortcut overlay
  const insertMentionFromShortcut = useCallback(
    (entityName: string, entityId: string, entityType: MentionCategory) => {
      if (!inputRef.current) return;

      const input = inputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;

      // Insert @EntityName at cursor position
      const mentionText = `@${entityName} `;
      const newValue = value.substring(0, start) + mentionText + value.substring(end);

      onChange(newValue);

      // Map MentionCategory to MentionedEntity type
      const typeMap: Record<MentionCategory, MentionedEntity["type"]> = {
        clients: "client",
        properties: "property",
        documents: "document",
      };

      // Add to mentioned entities
      const newEntity: MentionedEntity = {
        id: entityId,
        name: entityName,
        type: typeMap[entityType],
      };

      const alreadyMentioned = mentionedEntities.some(
        (e) => e.id === entityId && e.type === newEntity.type
      );

      if (!alreadyMentioned) {
        const newMentionedEntities = [...mentionedEntities, newEntity];
        setMentionedEntities(newMentionedEntities);
        onMentionsChange(newMentionedEntities);
      }

      // Focus back and set cursor after mention
      setTimeout(() => {
        if (inputRef.current) {
          const newPosition = start + mentionText.length;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    },
    [value, onChange, mentionedEntities, onMentionsChange]
  );

  // Register/unregister with mention shortcut store on focus/blur
  const handleFocus = useCallback(() => {
    setActiveInput({
      ref: inputRef as React.RefObject<HTMLInputElement>,
      insertMention: insertMentionFromShortcut,
      cursorPosition,
    });
  }, [setActiveInput, insertMentionFromShortcut, cursorPosition]);

  const handleBlur = useCallback(() => {
    // Small delay to allow shortcut overlay to use the input before clearing
    setTimeout(() => {
      setActiveInput(null);
    }, 100);
  }, [setActiveInput]);

  // Use unified entity search for all entity types
  // This provides debounced search, caching, and multi-field search
  const {
    groupedResults,
    isLoading: isSearchLoading,
    isSearching,
  } = useUnifiedEntitySearch(searchQuery, {
    types: ["client", "property", "document", "event"],
    limit: currentLimit,
    enabled: isOpen, // Only fetch when popover is open
    debounceMs: 150, // Faster debounce for @ mentions
  });

  // Reset limit when popover closes or search changes significantly
  useEffect(() => {
    if (!isOpen) {
      setCurrentLimit(10);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const hasNoSeparator = !textAfterAt.includes(" ") && !textAfterAt.includes("(") && !textAfterAt.includes(")");
      
      if (hasNoSeparator) {
        setSearchQuery(textAfterAt);
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  const insertMention = (entity: MentionedEntity) => {
    if (!inputRef.current) {
      return;
    }

    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex >= 0) {
    
    const beforeAt = value.substring(0, lastAtIndex);
    const mentionText = `@${entity.name}`;
    const newValue = beforeAt + mentionText + " " + textAfterCursor;
    
    onChange(newValue);
    setIsOpen(false);
    setSearchQuery("");

    // Add to mentioned entities if not already present
    const newMentionedEntities = [...mentionedEntities];
    const alreadyMentioned = newMentionedEntities.some(e => e.id === entity.id && e.type === entity.type);
    
    if (!alreadyMentioned) {
      newMentionedEntities.push(entity);
      setMentionedEntities(newMentionedEntities);
      onMentionsChange(newMentionedEntities);
    }

      // Focus back on input and set cursor position
      setTimeout(() => {
        if (inputRef.current) {
          const newPosition = lastAtIndex + mentionText.length + 1;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
            insertMention(transformToMentionEntity(selectedResult));
          }
          return;
        }
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery("");
          return;
        case "Tab":
          // Allow tab to close the popover naturally
          setIsOpen(false);
          setSearchQuery("");
          return;
      }
    }

    // Submit on Enter when popover is closed
    if (e.key === "Enter" && !isOpen) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Transform unified search results to mention format
  const transformToMentionEntity = useCallback(
    (result: EntitySearchResult): MentionedEntity => ({
      id: result.value,
      name: result.label,
      type: result.type,
    }),
    []
  );

  // Flatten all results for keyboard navigation with original search result data
  const flattenedResults = useMemo(() => {
    const results: EntitySearchResult[] = [];
    
    for (const type of ENTITY_TYPE_ORDER) {
      const typeResults = groupedResults[type] || [];
      results.push(...typeResults);
    }
    
    return results;
  }, [groupedResults]);

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
      // Small delay to ensure popover is fully rendered
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
            insertMention(transformToMentionEntity(selectedResult));
          }
          return;
        }
      }
    }
    
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
      // Return focus to main input
      inputRef.current?.focus();
    }
  }, [totalResults, flattenedResults, highlightedIndex, insertMention, transformToMentionEntity]);

  // Clear search query
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setHighlightedIndex(0);
    searchInputRef.current?.focus();
  }, []);

  // Render a single entity item with proper mouse & keyboard support
  const renderEntityItem = (
    entity: EntitySearchResult,
    globalIndex: number,
    isLastInGroup: boolean
  ) => {
    const isHighlighted = globalIndex === highlightedIndex;
    const isAlreadyMentioned = mentionedEntities.some(
      (e) => e.id === entity.value && e.type === entity.type
    );
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
          insertMention(transformToMentionEntity(entity));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            insertMention(transformToMentionEntity(entity));
          }
        }}
        onMouseDown={(e) => {
          // Prevent focus loss from popover on primary click only
          // Don't block scroll wheel or other mouse buttons
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
          isAlreadyMentioned && "opacity-60",
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
        {isAlreadyMentioned && (
          <Check className="h-4 w-4 shrink-0 text-primary" />
        )}
      </div>
    );
  };

  // Group results by entity type for visual organization
  const renderGroupedResults = () => {
    let globalIndex = 0;
    const groups: React.ReactNode[] = [];

    for (const type of ENTITY_TYPE_ORDER) {
      const typeResults = groupedResults[type] || [];
      if (typeResults.length === 0) continue;

      const config = ENTITY_CONFIG[type];
      const categoryLabel = categories[`${type}s`] || config.label;

      const items = typeResults.map((entity, localIndex) => {
        const currentIndex = globalIndex;
        globalIndex++;
        const isLast = localIndex === typeResults.length - 1;
        return renderEntityItem(entity, currentIndex, isLast);
      });

      groups.push(
        <CommandGroup key={type} heading={categoryLabel}>
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
          <Input
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSelect={(e) => {
              const target = e.target as HTMLInputElement;
              setCursorPosition(target.selectionStart || 0);
            }}
            placeholder={placeholder}
            disabled={disabled}
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
              placeholder={dict?.ai?.mentions?.searchPlaceholder || "Search clients, properties, documents, events..."}
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
                    {dict?.common?.loading || "Searching..."}
                  </div>
                );
              }
              
              if (totalResults === 0) {
                return (
                  <CommandEmpty>
                    {(t as { noResults?: string })?.noResults || "No results found."}
                  </CommandEmpty>
                );
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
                        <span>
                          {dict?.ai?.mentions?.viewMore || `View more (showing ${totalResults})`}
                        </span>
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
                  return dict?.ai?.mentions?.typeToSearch || "Type to search";
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
