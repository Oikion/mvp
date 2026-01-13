"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Building2,
  User,
  Users,
  FileText,
  Search,
  Loader2,
  Calendar,
  ChevronRight,
  Link2,
  Plus,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGlobalSearch, type SearchResult, type SearchEntityType } from "@/hooks/swr";
import { cn } from "@/lib/utils";
import { useKeyboardShortcuts, isMac } from "@/hooks/use-keyboard-shortcuts";

interface RelationshipPreview {
  id: string;
  name?: string;
  title?: string;
  client_name?: string;
  property_name?: string;
  startTime?: string;
}

interface Relationships {
  clients?: { count: number; preview?: RelationshipPreview[] };
  properties?: { count: number; preview?: RelationshipPreview[] };
  events?: { count: number; preview?: RelationshipPreview[] };
  client?: { id: string; client_name: string } | null;
}

type FilterType = "all" | SearchEntityType;

const FILTER_TABS: { value: FilterType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "all", label: "All", icon: Search },
  { value: "property", label: "Properties", icon: Building2 },
  { value: "client", label: "Clients", icon: User },
  { value: "contact", label: "Contacts", icon: Users },
  { value: "document", label: "Documents", icon: FileText },
  { value: "event", label: "Events", icon: Calendar },
];

const QUICK_ACTIONS = [
  { id: "new-property", label: "New Property", icon: Building2, path: "/app/mls/new", shortcut: "P" },
  { id: "new-client", label: "New Client", icon: User, path: "/app/crm/new", shortcut: "C" },
  { id: "new-event", label: "New Event", icon: Calendar, path: "/app/calendar/new", shortcut: "E" },
  { id: "new-document", label: "Upload Document", icon: FileText, path: "/app/documents/upload", shortcut: "D" },
];

const NAVIGATION_ITEMS = [
  { id: "go-properties", label: "Properties", icon: Building2, path: "/app/mls/properties", shortcut: "G P" },
  { id: "go-clients", label: "Clients", icon: User, path: "/app/crm/clients", shortcut: "G C" },
  { id: "go-contacts", label: "Contacts", icon: Users, path: "/app/crm/contacts", shortcut: "G O" },
  { id: "go-documents", label: "Documents", icon: FileText, path: "/app/documents", shortcut: "G D" },
  { id: "go-calendar", label: "Calendar", icon: Calendar, path: "/app/calendar", shortcut: "G E" },
];

const RECENT_SEARCHES_KEY = "oikion-recent-searches";
const MAX_RECENT_SEARCHES = 5;

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");
  const [expandedResult, setExpandedResult] = React.useState<string | null>(null);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const { setActiveScope } = useKeyboardShortcuts();

  // Get locale from pathname
  const locale = pathname?.split("/")[1] || "en";

  // Determine which types to search based on filter
  const searchTypes = activeFilter === "all" ? undefined : [activeFilter];

  // Use SWR for search with built-in debounce and caching
  const { results, meta, isLoading, debouncedQuery } = useGlobalSearch(query, {
    types: searchTypes,
    limit: 100,
  });

  // Load recent searches from localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, []);

  // Save recent search
  const saveRecentSearch = React.useCallback((searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) return;
    
    setRecentSearches((prev) => {
      const updated = [searchQuery, ...prev.filter((s) => s !== searchQuery)].slice(0, MAX_RECENT_SEARCHES);
      if (typeof window !== "undefined") {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // CMD/CTRL + K to toggle - override browser behavior
  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen((prev) => !prev);
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
      preventDefault: true,
    }
  );

  // CMD/CTRL + D - override browser bookmark (Safari)
  useHotkeys(
    "mod+d",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Do nothing or implement a custom action
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
      preventDefault: true,
    }
  );

  // Escape to close
  useHotkeys(
    "escape",
    () => {
      if (open) {
        setOpen(false);
      }
    },
    {
      enabled: open,
      enableOnFormTags: true,
    }
  );

  // Update scope when dialog opens/closes
  React.useEffect(() => {
    setActiveScope(open ? "search" : "global");
  }, [open, setActiveScope]);

  // Reset state when closing
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveFilter("all");
      setExpandedResult(null);
    }
  }, [open]);

  const handleSelect = React.useCallback((result: SearchResult) => {
    saveRecentSearch(query);
    router.push(`/${locale}/app${result.url}`);
    setOpen(false);
    setQuery("");
  }, [query, locale, router, saveRecentSearch]);

  const handleQuickAction = React.useCallback((path: string) => {
    router.push(`/${locale}/app${path}`);
    setOpen(false);
  }, [locale, router]);

  const handleRecentSearch = React.useCallback((searchQuery: string) => {
    setQuery(searchQuery);
  }, []);

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "property":
        return Building2;
      case "client":
        return User;
      case "contact":
        return Users;
      case "document":
        return FileText;
      case "event":
        return Calendar;
      default:
        return Search;
    }
  };

  const getTypeLabel = (type: SearchResult["type"]) => {
    switch (type) {
      case "property":
        return t("GlobalSearch.types.property");
      case "client":
        return t("GlobalSearch.types.client");
      case "contact":
        return t("GlobalSearch.types.contact");
      case "document":
        return t("GlobalSearch.types.document");
      case "event":
        return t("GlobalSearch.types.event");
      default:
        return "";
    }
  };

  // Group results by type for display
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach((result) => {
      if (!groups[result.type]) {
        groups[result.type] = [];
      }
      groups[result.type].push(result);
    });
    return groups;
  }, [results]);

  // Get total relationship count for a result
  const getTotalRelationships = (relationships?: Relationships): number => {
    if (!relationships) return 0;
    let total = 0;
    if (relationships.clients?.count) total += relationships.clients.count;
    if (relationships.properties?.count) total += relationships.properties.count;
    if (relationships.events?.count) total += relationships.events.count;
    if (relationships.client) total += 1;
    return total;
  };

  // Render relationship badges
  const renderRelationshipBadges = (relationships?: Relationships) => {
    if (!relationships) return null;

    const badges = [];

    if (relationships.clients?.count && relationships.clients.count > 0) {
      badges.push(
        <Badge
          key="clients"
          variant="secondary"
          className="text-[10px] px-1.5 py-0 h-4 gap-0.5"
        >
          <User className="h-2.5 w-2.5" />
          {relationships.clients.count}
        </Badge>
      );
    }

    if (relationships.properties?.count && relationships.properties.count > 0) {
      badges.push(
        <Badge
          key="properties"
          variant="secondary"
          className="text-[10px] px-1.5 py-0 h-4 gap-0.5"
        >
          <Building2 className="h-2.5 w-2.5" />
          {relationships.properties.count}
        </Badge>
      );
    }

    if (relationships.events?.count && relationships.events.count > 0) {
      badges.push(
        <Badge
          key="events"
          variant="secondary"
          className="text-[10px] px-1.5 py-0 h-4 gap-0.5"
        >
          <Calendar className="h-2.5 w-2.5" />
          {relationships.events.count}
        </Badge>
      );
    }

    if (relationships.client) {
      badges.push(
        <Badge
          key="client"
          variant="outline"
          className="text-[10px] px-1.5 py-0 h-4 gap-0.5"
        >
          <User className="h-2.5 w-2.5" />
          {relationships.client.client_name}
        </Badge>
      );
    }

    if (badges.length === 0) return null;

    return (
      <div className="flex items-center gap-1 mt-1">
        <Link2 className="h-3 w-3 text-muted-foreground" />
        {badges}
      </div>
    );
  };

  const showQuickActions = !query && !isLoading;
  const showRecentSearches = !query && !isLoading && recentSearches.length > 0;
  const showResults = debouncedQuery.length >= 2 && !isLoading && results.length > 0;
  const showEmpty = debouncedQuery.length >= 2 && !isLoading && results.length === 0;
  const showMinLength = !isLoading && debouncedQuery.length > 0 && debouncedQuery.length < 2;

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <div className="flex flex-col">
        {/* Search Input */}
        <CommandInput
          placeholder={t("GlobalSearch.placeholder")}
          value={query}
          onValueChange={setQuery}
        />

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tab.value === "all" 
              ? meta?.counts?.total 
              : meta?.counts?.[tab.value as keyof typeof meta.counts];
            
            return (
              <Button
                key={tab.value}
                variant={activeFilter === tab.value ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 px-2.5 text-xs gap-1.5 shrink-0 cursor-pointer",
                  activeFilter === tab.value && "bg-accent"
                )}
                onClick={() => setActiveFilter(tab.value)}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {count !== undefined && count > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>

        {/* Results Area */}
        <CommandList className="max-h-[400px]">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-6 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          )}

          {/* Min Length Message */}
          {showMinLength && (
            <CommandEmpty>{t("GlobalSearch.minLength")}</CommandEmpty>
          )}

          {/* Empty Results */}
          {showEmpty && (
            <CommandEmpty>{t("GlobalSearch.noResults")}</CommandEmpty>
          )}

          {/* Navigation (when no query) */}
          {showQuickActions && (
            <CommandGroup heading={t("GlobalSearch.navigation") || "Navigation"}>
              {NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleQuickAction(item.path)}
                    className="gap-2 cursor-pointer"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Quick Actions (when no query) */}
          {showQuickActions && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t("GlobalSearch.quickActions") || "Quick Actions"}>
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <CommandItem
                      key={action.id}
                      value={action.id}
                      onSelect={() => handleQuickAction(action.path)}
                      className="gap-2 cursor-pointer"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-md border bg-background">
                        <Plus className="h-3 w-3" />
                      </div>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{action.label}</span>
                      <CommandShortcut>{isMac() ? "⌘" : "Ctrl+"}{action.shortcut}</CommandShortcut>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}

          {/* Recent Searches */}
          {showRecentSearches && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Recent Searches">
                {recentSearches.map((search, index) => (
                  <CommandItem
                    key={`recent-${index}`}
                    value={`recent-${search}`}
                    onSelect={() => handleRecentSearch(search)}
                    className="gap-2 cursor-pointer"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{search}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Search Results */}
          {showResults && (
            <>
              {Object.entries(groupedResults).map(([type, typeResults]) => (
                <CommandGroup
                  key={type}
                  heading={`${getTypeLabel(type as SearchResult["type"])} (${meta?.counts?.[type as keyof typeof meta.counts] || typeResults.length})`}
                >
                  {typeResults.map((result) => {
                    const ResultIcon = getIcon(result.type);
                    const hasRelationships =
                      getTotalRelationships(result.relationships as Relationships) > 0;
                    const isExpanded = expandedResult === result.id;

                    return (
                      <CommandItem
                        key={result.id}
                        value={`${result.type}-${result.id}-${result.title}`}
                        onSelect={() => handleSelect(result)}
                        className="flex items-start cursor-pointer group"
                      >
                        <ResultIcon className="mr-2 h-4 w-4 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{result.title}</span>
                            {hasRelationships && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setExpandedResult(isExpanded ? null : result.id);
                                }}
                                className="shrink-0 p-0.5 hover:bg-accent rounded cursor-pointer"
                              >
                                <ChevronRight
                                  className={cn(
                                    "h-3 w-3 transition-transform",
                                    isExpanded && "rotate-90"
                                  )}
                                />
                              </button>
                            )}
                          </div>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground block truncate">
                              {result.subtitle}
                            </span>
                          )}
                          {renderRelationshipBadges(result.relationships as Relationships)}
                        </div>
                        <ArrowRight className="h-3 w-3 ml-2 text-muted-foreground opacity-0 group-aria-selected:opacity-100 transition-opacity" />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </>
          )}
        </CommandList>

        {/* Footer with timing and shortcuts hint */}
        <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            {meta?.timing && (
              <span>{Math.round(meta.timing)}ms</span>
            )}
            {meta?.counts?.total !== undefined && meta.counts.total > 0 && (
              <span>{meta.counts.total} results</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border">↑↓</kbd>
            <span>navigate</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border">↵</kbd>
            <span>select</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border">esc</kbd>
            <span>close</span>
          </div>
        </div>
      </div>
    </CommandDialog>
  );
}
