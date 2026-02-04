"use client";

/**
 * EntityLinker
 * 
 * Links documents to other entities (Clients, Properties, Events, Tasks).
 * Uses unified entity selectors with optimized search and caching.
 * 
 * Note: Tasks are not yet supported by the unified selector, so we keep
 * the original MultiSelect for tasks.
 */

import { useTranslations } from "next-intl";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Label } from "@/components/ui/label";
import { Users, Home, Calendar, CheckSquare } from "lucide-react";
import {
  ClientSelector,
  PropertySelector,
  EventSelector,
} from "@/components/entity-selector";

interface EntityLinkerProps {
  // Legacy props for backwards compatibility (no longer needed for clients/properties/events)
  clientOptions?: MultiSelectOption[];
  propertyOptions?: MultiSelectOption[];
  eventOptions?: MultiSelectOption[];
  taskOptions?: MultiSelectOption[];
  selectedClientIds?: string[];
  selectedPropertyIds?: string[];
  selectedEventIds?: string[];
  selectedTaskIds?: string[];
  onClientChange?: (ids: string[]) => void;
  onPropertyChange?: (ids: string[]) => void;
  onEventChange?: (ids: string[]) => void;
  onTaskChange?: (ids: string[]) => void;
  className?: string;
  // Control which entity types to show (all by default)
  showClients?: boolean;
  showProperties?: boolean;
  showEvents?: boolean;
  showTasks?: boolean;
}

export function EntityLinker({
  clientOptions = [],
  propertyOptions = [],
  eventOptions = [],
  taskOptions = [],
  selectedClientIds = [],
  selectedPropertyIds = [],
  selectedEventIds = [],
  selectedTaskIds = [],
  onClientChange,
  onPropertyChange,
  onEventChange,
  onTaskChange,
  className,
  showClients = true,
  showProperties = true,
  showEvents = true,
  showTasks = true,
}: EntityLinkerProps) {
  const t = useTranslations("common");
  const tCrm = useTranslations("ModuleMenu.crm");
  const tMls = useTranslations("ModuleMenu.mls");
  const tCalendar = useTranslations("ModuleMenu");

  // Determine visibility based on both legacy props and new flags
  const shouldShowClients = showClients && (clientOptions.length > 0 || onClientChange);
  const shouldShowProperties = showProperties && (propertyOptions.length > 0 || onPropertyChange);
  const shouldShowEvents = showEvents && (eventOptions.length > 0 || onEventChange);
  const shouldShowTasks = showTasks && taskOptions.length > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Clients - Using unified selector */}
      {shouldShowClients && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {tCrm("accounts")}
          </Label>
          <ClientSelector
            value={selectedClientIds}
            onChange={onClientChange || (() => {})}
            placeholder={t("placeholders.selectClients")}
            searchPlaceholder={t("placeholders.searchClients")}
            emptyMessage={t("emptyStates.noClients")}
          />
        </div>
      )}

      {/* Properties - Using unified selector */}
      {shouldShowProperties && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Home className="h-4 w-4 text-success" />
            {tMls("properties")}
          </Label>
          <PropertySelector
            value={selectedPropertyIds}
            onChange={onPropertyChange || (() => {})}
            placeholder={t("placeholders.selectProperties")}
            searchPlaceholder={t("placeholders.searchProperties")}
            emptyMessage={t("emptyStates.noProperties")}
          />
        </div>
      )}

      {/* Calendar Events - Using unified selector */}
      {shouldShowEvents && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-600" />
            {tCalendar("calendar")}
          </Label>
          <EventSelector
            value={selectedEventIds}
            onChange={onEventChange || (() => {})}
            placeholder={t("placeholders.selectEvents")}
            searchPlaceholder={t("placeholders.search")}
            emptyMessage={t("emptyStates.noEvents")}
          />
        </div>
      )}

      {/* Tasks - Keep legacy MultiSelect (tasks not in unified selector yet) */}
      {shouldShowTasks && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-warning" />
            {tCalendar("tasks")}
          </Label>
          <MultiSelect
            options={taskOptions}
            value={selectedTaskIds}
            onChange={onTaskChange || (() => {})}
            placeholder={t("placeholders.selectTasks")}
            searchPlaceholder={t("placeholders.search")}
            emptyMessage={t("emptyStates.noTasks")}
          />
        </div>
      )}
    </div>
  );
}

