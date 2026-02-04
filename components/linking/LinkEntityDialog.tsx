// @ts-nocheck
// TODO: Fix type errors
"use client";

/**
 * LinkEntityDialog
 * 
 * Dialog for linking properties to clients or clients to properties.
 * Uses unified entity search for blazingly fast, cached results.
 */

import { useState, useEffect, useMemo } from "react";
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
import { Building2, User, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useUnifiedEntitySearch,
  type EntityType as UnifiedEntityType,
  type EntitySearchResult,
} from "@/hooks/swr/useUnifiedEntitySearch";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const Icon = entityType === "property" ? Building2 : User;
  const defaultTitle = entityType === "property" 
    ? t("dialogs.linkProperties") 
    : t("dialogs.linkClients");
  const defaultDescription =
    entityType === "property"
      ? t("placeholders.searchProperties")
      : t("placeholders.searchClients");

  // Map entityType to unified search type
  const searchType: UnifiedEntityType = entityType === "property" ? "property" : "client";

  // Use unified entity search for fast, cached results
  const {
    groupedResults,
    isLoading,
    isSearching,
  } = useUnifiedEntitySearch(searchQuery, {
    types: [searchType],
    limit: 50, // More results for linking
    enabled: open,
    debounceMs: 200,
  });

  // Transform search results to entity format and filter out already linked
  const transformedEntities = useMemo((): Entity[] => {
    const results = groupedResults[searchType] || [];
    return results
      .map((result) => {
        const typeValue = result.metadata.propertyType || result.metadata.intent;
        return {
          id: result.value,
          name: result.label,
          subtitle: result.metadata.subtitle as string | undefined,
          type: typeValue as string | undefined,
          status: result.metadata.status as string | undefined,
        };
      })
      .filter((e) => !alreadyLinkedIds.includes(e.id));
  }, [groupedResults, searchType, alreadyLinkedIds]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedIds(new Set());
    }
  }, [open]);

  // Combined loading state
  const showLoading = isLoading || isSearching;

  // Filtered entities (already done by search, but keep for empty state)
  const filteredEntities = transformedEntities;

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
            {showLoading && filteredEntities.length === 0 ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Searching...</span>
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















