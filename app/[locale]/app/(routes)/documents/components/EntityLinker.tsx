"use client";

import { useTranslations } from "next-intl";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Label } from "@/components/ui/label";
import { Users, Home, Calendar, CheckSquare } from "lucide-react";

interface EntityLinkerProps {
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
}: EntityLinkerProps) {
  const t = useTranslations("common");
  const tCrm = useTranslations("ModuleMenu.crm");
  const tMls = useTranslations("ModuleMenu.mls");
  const tCalendar = useTranslations("ModuleMenu");

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Clients */}
      {clientOptions.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {tCrm("accounts")}
          </Label>
          <MultiSelect
            options={clientOptions}
            value={selectedClientIds}
            onChange={onClientChange || (() => {})}
            placeholder={t("placeholders.selectClients")}
            searchPlaceholder={t("placeholders.searchClients")}
            emptyMessage={t("emptyStates.noClients")}
          />
        </div>
      )}

      {/* Properties */}
      {propertyOptions.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Home className="h-4 w-4 text-success" />
            {tMls("properties")}
          </Label>
          <MultiSelect
            options={propertyOptions}
            value={selectedPropertyIds}
            onChange={onPropertyChange || (() => {})}
            placeholder={t("placeholders.selectProperties")}
            searchPlaceholder={t("placeholders.searchProperties")}
            emptyMessage={t("emptyStates.noProperties")}
          />
        </div>
      )}

      {/* Calendar Events */}
      {eventOptions.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-600" />
            {tCalendar("calendar")}
          </Label>
          <MultiSelect
            options={eventOptions}
            value={selectedEventIds}
            onChange={onEventChange || (() => {})}
            placeholder={t("placeholders.selectEvents")}
            searchPlaceholder={t("placeholders.search")}
            emptyMessage={t("emptyStates.noEvents")}
          />
        </div>
      )}

      {/* Tasks */}
      {taskOptions.length > 0 && (
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

