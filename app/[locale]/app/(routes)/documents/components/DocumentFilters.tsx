"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface DocumentFiltersProps {
  clients: Array<{ id: string; client_name: string }>;
  properties: Array<{ id: string; property_name: string }>;
  initialFilters: {
    clientId?: string;
    propertyId?: string;
    eventId?: string;
    taskId?: string;
    search?: string;
  };
}

export function DocumentFilters({ clients, properties, initialFilters }: DocumentFiltersProps) {
  const t = useTranslations("documents");
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Handle "all" as clearing the filter
    if (value && value !== "all") {
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
          <Select
            value={initialFilters.clientId || "all"}
            onValueChange={(value) => updateFilter("clientId", value === "all" ? null : value)}
          >
            <SelectTrigger id="client">
              <SelectValue placeholder={t("documentFilters.allClients")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("documentFilters.allClients")}</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.client_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="property">{t("documentFilters.property")}</Label>
          <Select
            value={initialFilters.propertyId || "all"}
            onValueChange={(value) => updateFilter("propertyId", value === "all" ? null : value)}
          >
            <SelectTrigger id="property">
              <SelectValue placeholder={t("documentFilters.allProperties")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("documentFilters.allProperties")}</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.property_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

