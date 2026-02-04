"use client";

/**
 * MentionShortcutOverlay
 * 
 * Global overlay for quick entity selection via keyboard shortcuts.
 * Uses unified entity search for blazingly fast, cached results.
 * 
 * Shortcuts:
 * - CMD+SHIFT+1 = Clients
 * - CMD+SHIFT+2 = Properties
 * - CMD+SHIFT+3 = Documents
 * - Press 1-9 to quickly select an item from the list
 */

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Users,
  Building2,
  FileText,
  Loader2,
  Search,
  ArrowRight,
  AtSign,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useUnifiedEntitySearch,
  type EntityType as UnifiedEntityType,
} from "@/hooks/swr/useUnifiedEntitySearch";
import {
  useMentionShortcut,
  type MentionCategory,
  MENTION_CATEGORY_CONFIG,
} from "@/hooks/use-mention-shortcut";
import { cn } from "@/lib/utils";
import { isMac } from "@/hooks/use-keyboard-shortcuts";

/**
 * Entity item with numbered badge for quick selection
 */
interface EntityItem {
  id: string;
  name: string;
  index: number;
}

/**
 * Category configuration with icons
 */
const CATEGORY_ICONS: Record<MentionCategory, React.ComponentType<{ className?: string }>> = {
  clients: Users,
  properties: Building2,
  documents: FileText,
};

/**
 * Category tab configuration
 */
const CATEGORY_TABS: { key: MentionCategory; shortcut: string }[] = [
  { key: "clients", shortcut: "1" },
  { key: "properties", shortcut: "2" },
  { key: "documents", shortcut: "3" },
];

/**
 * Global overlay for quick entity selection via keyboard shortcuts
 * CMD+SHIFT+1 = Clients, CMD+SHIFT+2 = Properties, CMD+SHIFT+3 = Documents
 * Press 1-9 to quickly select an item from the list
 */
export function MentionShortcutOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  const {
    isOpen,
    activeCategory,
    activeInput,
    searchQuery,
    highlightedIndex,
    close,
    setSearchQuery,
    setHighlightedIndex,
    moveHighlightUp,
    moveHighlightDown,
    openCategory,
  } = useMentionShortcut();

  // Get locale from pathname
  const locale = pathname?.split("/")[1] || "en";

  // Focus input when dialog opens
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Map MentionCategory to UnifiedEntityType
  const categoryToEntityType: Record<MentionCategory, UnifiedEntityType> = {
    clients: "client",
    properties: "property",
    documents: "document",
  };

  // Get the entity type for current category
  const currentEntityType = activeCategory ? categoryToEntityType[activeCategory] : "client";

  // Use unified entity search - fetches from the optimized API with caching
  const {
    groupedResults,
    isLoading: isSearchLoading,
    isSearching,
  } = useUnifiedEntitySearch(searchQuery, {
    types: [currentEntityType],
    limit: 20, // More items for better keyboard navigation
    enabled: isOpen && !!activeCategory,
    debounceMs: 150, // Fast debounce for shortcuts
  });

  // Get items based on active category from grouped results
  const items = React.useMemo((): EntityItem[] => {
    if (!activeCategory) return [];

    const entityResults = groupedResults[currentEntityType] || [];

    // Map to EntityItem with index
    return entityResults.map((item, index) => ({
      id: item.value,
      name: item.label,
      index,
    }));
  }, [activeCategory, currentEntityType, groupedResults]);

  // Check if loading
  const isLoading = isSearchLoading || isSearching;

  // Handle selection
  const handleSelect = React.useCallback(
    (item: EntityItem) => {
      if (!activeCategory) return;

      // If there's an active input, insert the mention
      if (activeInput?.insertMention) {
        activeInput.insertMention(item.name, item.id, activeCategory);
        close();
        return;
      }

      // Otherwise, navigate to the entity
      let path = "";

      switch (activeCategory) {
        case "clients":
          path = `/${locale}/app/crm/clients/${item.id}`;
          break;
        case "properties":
          path = `/${locale}/app/mls/properties/${item.id}`;
          break;
        case "documents":
          path = `/${locale}/app/documents/${item.id}`;
          break;
      }

      if (path) {
        router.push(path);
      }

      close();
    },
    [activeCategory, activeInput, close, locale, router]
  );

  // Handle keyboard navigation
  useHotkeys(
    "ArrowUp",
    (e) => {
      e.preventDefault();
      moveHighlightUp();
    },
    {
      enabled: isOpen,
      enableOnFormTags: true,
    }
  );

  useHotkeys(
    "ArrowDown",
    (e) => {
      e.preventDefault();
      moveHighlightDown(items.length - 1);
    },
    {
      enabled: isOpen,
      enableOnFormTags: true,
    }
  );

  useHotkeys(
    "Enter",
    (e) => {
      e.preventDefault();
      const selectedItem = items[highlightedIndex];
      if (selectedItem) {
        handleSelect(selectedItem);
      }
    },
    {
      enabled: isOpen && items.length > 0,
      enableOnFormTags: true,
    }
  );

  useHotkeys(
    "Escape",
    (e) => {
      e.preventDefault();
      close();
    },
    {
      enabled: isOpen,
      enableOnFormTags: true,
    }
  );

  // Handle number key quick selection (1-9) - only when not focused on search
  useHotkeys(
    "1,2,3,4,5,6,7,8,9",
    (e, handler) => {
      // Don't trigger if search input is focused and has content
      if (document.activeElement === inputRef.current && searchQuery) {
        return;
      }
      e.preventDefault();
      const key = handler.keys?.[0];
      if (key) {
        const index = Number.parseInt(key, 10) - 1; // 1-based to 0-based
        const selectedItem = items[index];
        if (selectedItem) {
          handleSelect(selectedItem);
        }
      }
    },
    {
      enabled: isOpen && items.length > 0,
      enableOnFormTags: true,
    }
  );

  // Get the category icon and config
  const CategoryIcon = activeCategory ? CATEGORY_ICONS[activeCategory] : Search;
  const categoryConfig = activeCategory ? MENTION_CATEGORY_CONFIG[activeCategory] : null;

  // Format shortcut for display
  const formatShortcut = (shortcut: string) => {
    if (isMac()) {
      return shortcut;
    }
    return shortcut.replace("⌘", "Ctrl+").replace("⇧", "Shift+");
  };

  // Handle item click
  const handleItemClick = React.useCallback(
    (e: React.MouseEvent, item: EntityItem) => {
      e.preventDefault();
      e.stopPropagation();
      handleSelect(item);
    },
    [handleSelect]
  );

  // Handle category tab click
  const handleCategoryClick = React.useCallback(
    (category: MentionCategory) => {
      openCategory(category);
    },
    [openCategory]
  );

  // Check if there's an active text input for mention insertion
  const canInsertMention = !!activeInput?.insertMention;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent 
        className="overflow-hidden p-0 shadow-2xl max-w-lg gap-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">
          {categoryConfig?.label || "Quick Select"}
        </DialogTitle>
        
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            {canInsertMention ? (
              <AtSign className="h-4 w-4 text-primary" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-semibold text-sm">
              {canInsertMention ? "Insert Mention" : "Quick Navigation"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border">
              1-9
            </kbd>
            <span>select</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b bg-background/50">
          {CATEGORY_TABS.map((tab) => {
            const Icon = CATEGORY_ICONS[tab.key];
            const config = MENTION_CATEGORY_CONFIG[tab.key];
            const isActive = activeCategory === tab.key;
            
            return (
              <Button
                key={tab.key}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleCategoryClick(tab.key)}
                className={cn(
                  "h-8 px-3 gap-2 text-xs font-medium",
                  isActive && "bg-primary/10 text-primary hover:bg-primary/15"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {config.label}
                <Badge 
                  variant="outline" 
                  className={cn(
                    "h-4 px-1 text-[10px] font-mono",
                    isActive && "border-primary/30"
                  )}
                >
                  {formatShortcut(`⌘⇧${tab.shortcut}`)}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="px-3 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={`Search ${categoryConfig?.label.toLowerCase() || "items"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Results Area */}
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Loading {categoryConfig?.label.toLowerCase()}...
                </span>
              </div>
            )}

            {/* Empty Results */}
            {!isLoading && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CategoryIcon className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery 
                    ? `No ${categoryConfig?.label.toLowerCase()} found for "${searchQuery}"`
                    : `No ${categoryConfig?.label.toLowerCase()} available`
                  }
                </p>
              </div>
            )}

            {/* Results */}
            {!isLoading && items.length > 0 && (
              <div className="space-y-1">
                {items.map((item, index) => {
                  const hasShortcut = index < 9;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(e) => handleItemClick(e, item)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-md px-3 py-2.5 text-sm outline-none w-full text-left group",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:bg-accent focus:text-accent-foreground",
                        "transition-colors duration-100",
                        isHighlighted && "bg-accent text-accent-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {/* Number badge for quick select */}
                        {hasShortcut ? (
                          <Badge
                            variant={isHighlighted ? "default" : "secondary"}
                            className={cn(
                              "h-5 w-5 p-0 flex items-center justify-center text-xs font-mono shrink-0",
                              isHighlighted && "bg-primary text-primary-foreground"
                            )}
                          >
                            {index + 1}
                          </Badge>
                        ) : (
                          <div className="h-5 w-5 shrink-0" />
                        )}

                        {/* Entity icon */}
                        <CategoryIcon className={cn(
                          "h-4 w-4 shrink-0",
                          isHighlighted ? "text-accent-foreground" : "text-muted-foreground"
                        )} />

                        {/* Entity name */}
                        <span className="truncate flex-1">{item.name}</span>

                        {/* Action indicator */}
                        <ArrowRight className={cn(
                          "h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                          isHighlighted && "opacity-100"
                        )} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <span className="font-medium">
                {items.length} {items.length === 1 ? "result" : "results"}
              </span>
            )}
            {canInsertMention && (
              <Badge variant="outline" className="text-[10px] h-5">
                Will insert @mention
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border">↑↓</kbd>
              <span>navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border">↵</kbd>
              <span>select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border">esc</kbd>
              <span>close</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
