"use client";

/**
 * ShareEntityDialog
 * 
 * Dialog for sharing entities (properties, clients, documents, events) in chat.
 * Uses unified entity search for blazingly fast, cached results.
 */

import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  User,
  FileText,
  Calendar,
  Search,
  Loader2,
  Share2,
  Check,
} from "lucide-react";
import {
  useUnifiedEntitySearch,
  type EntitySearchResult,
} from "@/hooks/swr/useUnifiedEntitySearch";

export type EntityType = "property" | "client" | "document" | "event";

export interface SharedEntity {
  id: string;
  type: EntityType;
  title: string;
  subtitle?: string;
  metadata?: Record<string, unknown>;
}

interface ShareEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (entity: SharedEntity) => void;
}

export function ShareEntityDialog({
  open,
  onOpenChange,
  onShare,
}: ShareEntityDialogProps) {
  const [activeTab, setActiveTab] = useState<EntityType>("property");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<SharedEntity | null>(null);

  // Use unified entity search with debouncing and caching
  const {
    groupedResults,
    isLoading,
    isSearching,
  } = useUnifiedEntitySearch(searchQuery, {
    types: ["client", "property", "document", "event"],
    limit: 20,
    enabled: open,
    debounceMs: 200,
  });

  // Transform search results to shareable entity format
  const transformToShareable = useCallback(
    (result: EntitySearchResult): SharedEntity => ({
      id: result.value,
      type: result.type,
      title: result.label,
      subtitle: result.metadata.subtitle as string | undefined,
      metadata: result.metadata,
    }),
    []
  );

  // Get filtered entities for each tab
  const filteredProperties = useMemo(
    () => (groupedResults.property || []).map(transformToShareable),
    [groupedResults.property, transformToShareable]
  );
  
  const filteredClients = useMemo(
    () => (groupedResults.client || []).map(transformToShareable),
    [groupedResults.client, transformToShareable]
  );
  
  const filteredDocuments = useMemo(
    () => (groupedResults.document || []).map(transformToShareable),
    [groupedResults.document, transformToShareable]
  );
  
  const filteredEvents = useMemo(
    () => (groupedResults.event || []).map(transformToShareable),
    [groupedResults.event, transformToShareable]
  );

  // Reset state when dialog closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setSelectedEntity(null);
      setSearchQuery("");
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  const handleShare = () => {
    if (selectedEntity) {
      onShare(selectedEntity);
      onOpenChange(false);
    }
  };

  const handleSelectEntity = (entity: SharedEntity) => {
    setSelectedEntity(entity);
  };

  // Combined loading state
  const showLoading = isLoading || isSearching;

  const getEntityIcon = (type: EntityType) => {
    switch (type) {
      case "property":
        return <Building2 className="h-4 w-4" />;
      case "client":
        return <User className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      case "event":
        return <Calendar className="h-4 w-4" />;
    }
  };

  const formatEventTime = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };
    const startStr = start.toLocaleDateString(undefined, options);
    if (endTime) {
      const end = new Date(endTime);
      const endStr = end.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      return `${startStr} - ${endStr}`;
    }
    return startStr;
  };

  const renderEntityList = (
    items: SharedEntity[],
    type: EntityType
  ) => {
    if (showLoading && items.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          {getEntityIcon(type)}
          <p className="text-sm text-muted-foreground mt-2">
            No {type}s found
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {items.map((item) => {
          const isSelected = selectedEntity?.id === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelectEntity(item)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                isSelected
                  ? "bg-primary/10 border border-primary"
                  : "hover:bg-muted/50 border border-transparent"
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  isSelected ? "bg-primary/20" : "bg-muted"
                }`}
              >
                {getEntityIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.title}</p>
                {item.type === "event" && item.metadata?.startTime ? (
                  <p className="text-sm text-muted-foreground truncate">
                    {formatEventTime(
                      item.metadata.startTime as string,
                      item.metadata.endTime as string | undefined
                    )}
                  </p>
                ) : item.subtitle ? (
                  <p className="text-sm text-muted-foreground truncate">
                    {item.subtitle}
                  </p>
                ) : null}
                {item.type === "property" && typeof item.metadata?.price === 'number' && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    €{(item.metadata.price as number).toLocaleString()}
                  </Badge>
                )}
              </div>
              {isSelected && (
                <Check className="h-5 w-5 text-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share in Chat
          </DialogTitle>
          <DialogDescription>
            Select a property, client, document, or event to share
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as EntityType)}
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="property">
              <Building2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Properties</span>
            </TabsTrigger>
            <TabsTrigger value="client">
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clients</span>
            </TabsTrigger>
            <TabsTrigger value="document">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="event">
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Events</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[300px] mt-4">
            <TabsContent value="property" className="m-0">
              {renderEntityList(filteredProperties, "property")}
            </TabsContent>
            <TabsContent value="client" className="m-0">
              {renderEntityList(filteredClients, "client")}
            </TabsContent>
            <TabsContent value="document" className="m-0">
              {renderEntityList(filteredDocuments, "document")}
            </TabsContent>
            <TabsContent value="event" className="m-0">
              {renderEntityList(filteredEvents, "event")}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Selected entity preview & share button */}
        <div className="flex items-center justify-between pt-2 border-t">
          {selectedEntity ? (
            <div className="flex items-center gap-2 text-sm">
              {getEntityIcon(selectedEntity.type)}
              <span className="font-medium truncate max-w-[200px]">
                {selectedEntity.title}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              Select an item to share
            </span>
          )}
          <Button onClick={handleShare} disabled={!selectedEntity}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
