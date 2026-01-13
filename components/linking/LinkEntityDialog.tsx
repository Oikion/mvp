"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, User, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import useDebounce from "@/hooks/useDebounce";

interface Entity {
  id: string;
  name: string;
  subtitle?: string;
  type?: string;
  status?: string;
}

interface LinkEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "property" | "client";
  sourceId: string;
  sourceType: "client" | "property";
  alreadyLinkedIds?: string[];
  onLink: (entityIds: string[]) => Promise<void>;
  title?: string;
  description?: string;
}

export function LinkEntityDialog({
  open,
  onOpenChange,
  entityType,
  sourceId,
  sourceType,
  alreadyLinkedIds = [],
  onLink,
  title,
  description,
}: LinkEntityDialogProps) {
  const t = useTranslations("common");
  const [searchQuery, setSearchQuery] = useState("");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);

  const Icon = entityType === "property" ? Building2 : User;
  const defaultTitle = entityType === "property" 
    ? t("dialogs.linkProperties") 
    : t("dialogs.linkClients");
  const defaultDescription =
    entityType === "property"
      ? t("placeholders.searchProperties")
      : t("placeholders.searchClients");

  // Fetch entities when dialog opens or search query changes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedIds(new Set());
      setEntities([]);
      return;
    }

    const fetchEntities = async () => {
      setIsLoading(true);
      try {
        const endpoint =
          entityType === "property"
            ? "/api/mls/properties"
            : "/api/crm/clients";
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          throw new Error("Failed to fetch entities");
        }

        const data = await response.json();
        
        // Handle both array responses and object responses with the data
        const rawEntities = Array.isArray(data) ? data : data.properties || data.clients || [];
        
        // Transform to common format
        const transformed: Entity[] = rawEntities.map((item: any) => ({
          id: item.id,
          name: entityType === "property" ? item.property_name : item.client_name,
          subtitle:
            entityType === "property"
              ? [item.area, item.address_city].filter(Boolean).join(", ")
              : item.primary_email,
          type: entityType === "property" ? item.property_type : item.client_type,
          status:
            entityType === "property" ? item.property_status : item.client_status,
        }));

        // Filter out already linked entities
        const filtered = transformed.filter(
          (e) => !alreadyLinkedIds.includes(e.id)
        );

        setEntities(filtered);
      } catch (error) {
        console.error("Failed to fetch entities:", error);
        toast.error(t("toast.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntities();
  }, [open, entityType, alreadyLinkedIds, t]);

  // Filter entities by search query
  const filteredEntities = entities.filter((entity) => {
    if (!debouncedQuery) return true;
    const query = debouncedQuery.toLowerCase();
    return (
      entity.name?.toLowerCase().includes(query) ||
      entity.subtitle?.toLowerCase().includes(query)
    );
  });

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredEntities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEntities.map((e) => e.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      toast.error(t("toast.linkEntitiesFailed"));
      return;
    }

    setIsSubmitting(true);
    try {
      await onLink(Array.from(selectedIds));
      toast.success(t("toast.createSuccess"));
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to link entities:", error);
      toast.error(t("toast.linkEntitiesFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title || defaultTitle}
          </DialogTitle>
          <DialogDescription>{description || defaultDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("placeholders.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Select all */}
          {!isLoading && filteredEntities.length > 0 && (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={handleSelectAll}
              >
                {selectedIds.size === filteredEntities.length
                  ? t("buttons.reset")
                  : t("viewAll")}
              </Button>
              {selectedIds.size > 0 && (
                <Badge variant="secondary">{selectedIds.size} {t("misc.selected").toLowerCase()}</Badge>
              )}
            </div>
          )}

          {/* Entity list */}
          <ScrollArea className="h-[300px] pr-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : filteredEntities.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {entities.length === 0
                  ? entityType === "property" 
                    ? t("emptyStates.noPropertiesAvailable") 
                    : t("emptyStates.noClientsAvailable")
                  : t("emptyStates.searchNoResults")}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEntities.map((entity) => (
                  <div
                    key={entity.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handleToggle(entity.id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(entity.id)}
                      onCheckedChange={() => handleToggle(entity.id)}
                    />
                    <div className="p-1.5 rounded-md bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entity.name}</p>
                      {entity.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {entity.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {entity.type && (
                        <Badge variant="outline" className="text-[10px]">
                          {entity.type}
                        </Badge>
                      )}
                      {entity.status && (
                        <Badge variant="secondary" className="text-[10px]">
                          {entity.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("buttons.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selectedIds.size === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("buttonStates.linking")}
              </>
            ) : (
              `${t("buttons.link")} ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}















