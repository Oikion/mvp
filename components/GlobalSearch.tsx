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
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import useDebounce from "@/hooks/useDebounce";

interface SearchResult {
  id: string;
  type: "property" | "client" | "contact" | "document" | "event";
  title: string;
  subtitle?: string;
  url: string;
}

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();
  const t = useTranslations("navigation");
  const debouncedQuery = useDebounce(query, 300);

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
      setResults([]);
      return;
    }
  }, [open]);

  React.useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch("/api/global-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: debouncedQuery }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Search failed: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const formattedResults: SearchResult[] = [];
        
        // Format properties
        if (data.properties && Array.isArray(data.properties)) {
          data.properties.forEach((prop: any) => {
            formattedResults.push({
              id: prop.id,
              type: "property",
              title: prop.property_name || "Unnamed Property",
              subtitle: prop.area || prop.municipality || undefined,
              url: `/mls/properties/${prop.id}`,
            });
          });
        }

        // Format clients
        if (data.clients && Array.isArray(data.clients)) {
          data.clients.forEach((client: any) => {
            formattedResults.push({
              id: client.id,
              type: "client",
              title: client.client_name || "Unnamed Client",
              subtitle: client.primary_email || undefined,
              url: `/crm/clients/${client.id}`,
            });
          });
        }

        // Format contacts
        if (data.contacts && Array.isArray(data.contacts)) {
          data.contacts.forEach((contact: any) => {
            const fullName = `${contact.contact_first_name || ""} ${contact.contact_last_name || ""}`.trim();
            formattedResults.push({
              id: contact.id,
              type: "contact",
              title: fullName || "Unnamed Contact",
              subtitle: contact.email || undefined,
              url: `/crm/contacts/${contact.id}`,
            });
          });
        }

        // Format documents
        if (data.documents && Array.isArray(data.documents)) {
          data.documents.forEach((doc: any) => {
            formattedResults.push({
              id: doc.id,
              type: "document",
              title: doc.document_name || "Unnamed Document",
              subtitle: doc.description || undefined,
              url: `/documents/${doc.id}`,
            });
          });
        }

        // Format calendar events
        if (data.events && Array.isArray(data.events)) {
          data.events.forEach((event: any) => {
            const eventDate = event.startTime 
              ? new Date(event.startTime).toLocaleDateString()
              : undefined;
            const subtitleParts = [];
            if (eventDate) subtitleParts.push(eventDate);
            if (event.location) subtitleParts.push(event.location);
            if (event.attendeeName) subtitleParts.push(event.attendeeName);
            
            formattedResults.push({
              id: event.id,
              type: "event",
              title: event.title || "Untitled Event",
              subtitle: subtitleParts.length > 0 ? subtitleParts.join(" • ") : undefined,
              url: `/calendar`,
            });
          });
        }

        setResults(formattedResults);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Search error:", error);
        setResults([]);
        setIsLoading(false);
      });
  }, [debouncedQuery]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.url);
    setOpen(false);
    setQuery("");
    setResults([]);
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

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={t("GlobalSearch.placeholder")}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
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
              const Icon = getIcon(type as SearchResult["type"]);
              return (
                <CommandGroup
                  key={type}
                  heading={getTypeLabel(type as SearchResult["type"])}
                >
                  {typeResults.map((result) => {
                    const ResultIcon = getIcon(result.type);
                    return (
                      <CommandItem
                        key={result.id}
                        value={`${result.type}-${result.id}`}
                        onSelect={() => handleSelect(result)}
                      >
                        <ResultIcon className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{result.title}</span>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground">
                              {result.subtitle}
                            </span>
                          )}
                        </div>
                      </CommandItem>
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

