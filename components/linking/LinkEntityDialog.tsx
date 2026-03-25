// @ts-nocheck
// TODO: Fix type errors
"use client";

/**
 * LinkEntityDialog
 * 
 * Dialog for linking properties to clients or clients to properties.
 * Uses unified entity search for blazingly fast, cached results.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { Building2, User, FileText, Search, Loader2, Upload, Plus } from "lucide-react";
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
  entityType: "property" | "client" | "mandate" | "document";
  sourceId: string;
  sourceType: "client" | "property" | "mandate" | "document";
  alreadyLinkedIds?: string[];
  onLink: (entityIds: string[]) => Promise<void>;
  onCreate?: () => void;
  onCreateAndLink?: () => void;
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
  onCreate,
  onCreateAndLink,
  title,
  description,
}: LinkEntityDialogProps) {
  const t = useTranslations("common");
  const tDocs = useTranslations("documents");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const iconMap = { property: Building2, client: User, mandate: FileText, document: FileText };
  const Icon = iconMap[entityType];
  const defaultTitleMap: Record<string, string> = {
    property: t("dialogs.linkProperties"),
    mandate: t("dialogs.linkMandates"),
    client: t("dialogs.linkClients"),
    document: t("dialogs.linkDocuments"),
  };
  const defaultTitle = defaultTitleMap[entityType];
  const defaultDescriptionMap: Record<string, string> = {
    property: t("placeholders.searchProperties"),
    mandate: t("placeholders.searchMandates"),
    client: t("placeholders.searchClients"),
    document: t("placeholders.searchDocuments"),
  };
  const defaultDescription = defaultDescriptionMap[entityType];

  // Map entityType to unified search type
  const searchType: UnifiedEntityType = entityType;

  // Use unified entity search for fast, cached results
  const {
    groupedResults,
    isLoading,
    isSearching,
    mutate: mutateSearch,
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
        const typeValue = result.metadata.propertyType || result.metadata.transactionType;
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

  // Inline document upload handler
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = "";

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      formData.append("document_name", nameWithoutExt);

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = tDocs("uploadModal.failedToUpload");
        try {
          const errorData = await response.json();
          if (errorData.error) errorMessage = errorData.error;
        } catch { /* use default */ }
        throw new Error(errorMessage);
      }

      toast.success(tDocs("uploadModal.documentUploadedSuccess"));
      // Refresh search results so the new document appears in the list
      await mutateSearch();
    } catch (error) {
      console.error("Inline document upload failed:", error);
      toast.error(error instanceof Error ? error.message : tDocs("uploadModal.failedToUpload"));
    } finally {
      setIsUploading(false);
    }
  }, [mutateSearch, tDocs]);

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
          <ScrollArea className="h-[300px]">
            {showLoading && filteredEntities.length === 0 ? (
              <div className="flex items-center justify-center py-8 gap-2 pr-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : filteredEntities.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground pr-3">
                {transformedEntities.length === 0
                  ? entityType === "property"
                    ? t("emptyStates.noPropertiesAvailable")
                    : entityType === "mandate"
                    ? t("emptyStates.noMandatesAvailable")
                    : entityType === "document"
                    ? t("emptyStates.noDocumentsAvailable")
                    : t("emptyStates.noClientsAvailable")
                  : t("emptyStates.searchNoResults")}
                {entityType === "document" && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif"
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {isUploading ? tDocs("uploadModal.uploading") : tDocs("uploadModal.uploadDocument")}
                    </Button>
                  </>
                )}
                {entityType !== "document" && transformedEntities.length === 0 && (onCreate || onCreateAndLink) && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    {onCreate && (
                      <Button variant="outline" size="sm" onClick={onCreate}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        {t("buttons.create")}
                      </Button>
                    )}
                    {onCreateAndLink && (
                      <Button size="sm" onClick={onCreateAndLink}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        {t("buttons.createAndLink")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 pr-3">
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















