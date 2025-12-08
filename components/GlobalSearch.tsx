"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useGlobalSearch, type SearchResult } from "@/hooks/swr";

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

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [expandedResult, setExpandedResult] = React.useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("navigation");

  // Use SWR for search with built-in debounce and caching
  const { results, isLoading, debouncedQuery } = useGlobalSearch(query);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setExpandedResult(null);
    }
  }, [open]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.url);
    setOpen(false);
    setQuery("");
  };

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

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

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

  // Render expandable relationship preview
  const renderRelationshipPreview = (result: SearchResult) => {
    const relationships = result.relationships as Relationships | undefined;
    if (!relationships) return null;

    const totalLinks = getTotalRelationships(relationships);
    if (totalLinks === 0) return null;

    const previewItems: {
      label: string;
      items: { id: string; name: string; url: string }[];
    }[] = [];

    if (
      relationships.clients?.preview &&
      relationships.clients.preview.length > 0
    ) {
      previewItems.push({
        label: "Linked Clients",
        items: relationships.clients.preview.map((c) => ({
          id: c.id,
          name: c.client_name || c.name || "Unknown",
          url: `/crm/clients/${c.id}`,
        })),
      });
    }

    if (
      relationships.properties?.preview &&
      relationships.properties.preview.length > 0
    ) {
      previewItems.push({
        label: "Linked Properties",
        items: relationships.properties.preview.map((p) => ({
          id: p.id,
          name: p.property_name || p.name || "Unknown",
          url: `/mls/properties/${p.id}`,
        })),
      });
    }

    if (
      relationships.events?.preview &&
      relationships.events.preview.length > 0
    ) {
      previewItems.push({
        label: "Linked Events",
        items: relationships.events.preview.map((e) => ({
          id: e.id,
          name: e.title || "Untitled Event",
          url: `/calendar/events/${e.id}`,
        })),
      });
    }

    if (previewItems.length === 0) return null;

    return (
      <div className="pl-6 py-1 space-y-1 border-l-2 border-muted ml-2">
        {previewItems.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {group.label}
            </span>
            {group.items.map((item) => (
              <div
                key={item.id}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(item.url);
                  setOpen(false);
                }}
              >
                <ChevronRight className="h-3 w-3" />
                {item.name}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={t("GlobalSearch.placeholder")}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[400px]">
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && debouncedQuery.length < 2 && debouncedQuery.length > 0 && (
          <CommandEmpty>{t("GlobalSearch.minLength")}</CommandEmpty>
        )}
        {!isLoading && debouncedQuery.length >= 2 && results.length === 0 && (
          <CommandEmpty>{t("GlobalSearch.noResults")}</CommandEmpty>
        )}
        {!isLoading && results.length > 0 && (
          <>
            {Object.entries(groupedResults).map(([type, typeResults]) => {
              return (
                <CommandGroup
                  key={type}
                  heading={getTypeLabel(type as SearchResult["type"])}
                >
                  {typeResults.map((result) => {
                    const ResultIcon = getIcon(result.type);
                    const hasRelationships =
                      getTotalRelationships(result.relationships as Relationships) > 0;
                    const isExpanded = expandedResult === result.id;

                    return (
                      <div key={result.id}>
                        <CommandItem
                          value={`${result.type}-${result.id}`}
                          onSelect={() => handleSelect(result)}
                          className="flex items-start"
                        >
                          <ResultIcon className="mr-2 h-4 w-4 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">{result.title}</span>
                              {hasRelationships && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedResult(isExpanded ? null : result.id);
                                  }}
                                  className="shrink-0 p-0.5 hover:bg-accent rounded"
                                >
                                  <ChevronRight
                                    className={`h-3 w-3 transition-transform ${
                                      isExpanded ? "rotate-90" : ""
                                    }`}
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
                        </CommandItem>
                        {isExpanded && renderRelationshipPreview(result)}
                      </div>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
