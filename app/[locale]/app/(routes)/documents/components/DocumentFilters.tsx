"use client";

/**
 * DocumentFilters
 * 
 * Filter documents by client, property, and search text.
 * Uses unified entity selectors with optimized search and caching.
 */

import { useSearchParams } from "next/navigation";
import { useRouter } from "@/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { SingleClientSelector } from "@/components/entity-selector/ClientSelector";
import { SinglePropertySelector } from "@/components/entity-selector/PropertySelector";

interface DocumentFiltersProps {
  initialFilters: {
    clientId?: string;
    propertyId?: string;
    eventId?: string;
    taskId?: string;
    search?: string;
  };
}

export function DocumentFilters({ initialFilters }: DocumentFiltersProps) {
  const t = useTranslations("documents");
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Handle empty string or "all" as clearing the filter
    if (value && value !== "all" && value !== "") {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`/app/documents?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/app/documents");
  };

  const hasActiveFilters = 
    !!initialFilters.clientId ||
    !!initialFilters.propertyId ||
    !!initialFilters.eventId ||
    !!initialFilters.taskId ||
    !!initialFilters.search;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-surface-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("documentFilters.filters")}</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            {t("documentFilters.clear")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">{t("documentFilters.search")}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder={t("documentFilters.searchPlaceholder")}
              value={initialFilters.search || ""}
              onChange={(e) => updateFilter("search", e.target.value || null)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="client">{t("documentFilters.client")}</Label>
          <SingleClientSelector
            value={initialFilters.clientId || ""}
            onChange={(value) => updateFilter("clientId", value || null)}
            placeholder={t("documentFilters.allClients")}
            searchPlaceholder={t("documentFilters.searchClients") || "Search clients..."}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="property">{t("documentFilters.property")}</Label>
          <SinglePropertySelector
            value={initialFilters.propertyId || ""}
            onChange={(value) => updateFilter("propertyId", value || null)}
            placeholder={t("documentFilters.allProperties")}
            searchPlaceholder={t("documentFilters.searchProperties") || "Search properties..."}
          />
        </div>
      </div>
    </div>
  );
}

