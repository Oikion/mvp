"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Filter, X, CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

export interface CalendarFiltersState {
  eventType?: string;
  assignedUserId?: string;
  dateRangePreset?: "today" | "thisWeek" | "thisMonth" | "custom";
  customStartDate?: Date;
  customEndDate?: Date;
  invitationStatus?: "myEvents" | "invited" | "all";
  searchQuery?: string;
}

interface CalendarFiltersProps {
  filters: CalendarFiltersState;
  onFiltersChange: (filters: CalendarFiltersState) => void;
  users?: Array<{ id: string; name: string | null; email: string }>;
  eventTypes?: Array<{ value: string; label: string }>;
  className?: string;
}

const DEFAULT_EVENT_TYPES = [
  { value: "PROPERTY_VIEWING", labelKey: "eventPage.eventTypes.propertyViewing" },
  { value: "CLIENT_CONSULTATION", labelKey: "eventPage.eventTypes.clientConsultation" },
  { value: "MEETING", labelKey: "eventPage.eventTypes.meeting" },
  { value: "REMINDER", labelKey: "eventPage.eventTypes.reminder" },
  { value: "TASK_DEADLINE", labelKey: "eventPage.eventTypes.taskDeadline" },
  { value: "OTHER", labelKey: "eventPage.eventTypes.other" },
];

export function CalendarFilters({
  filters,
  onFiltersChange,
  users = [],
  eventTypes,
  className,
}: CalendarFiltersProps) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== "" && v !== "all"
  ).length;

  const handleFilterChange = (key: keyof CalendarFiltersState, value: string | Date | undefined) => {
    if (value === "all" || value === "") {
      const newFilters = { ...filters };
      delete newFilters[key];
      onFiltersChange(newFilters);
    } else {
      onFiltersChange({ ...filters, [key]: value });
    }
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const usedEventTypes = eventTypes || DEFAULT_EVENT_TYPES.map((et) => ({
    value: et.value,
    label: t(et.labelKey),
  }));

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("accessibility.eventList")}
          value={filters.searchQuery || ""}
          onChange={(e) => handleFilterChange("searchQuery", e.target.value || undefined)}
          className="pl-9"
          aria-label={t("accessibility.eventList")}
        />
      </div>

      {/* Event Type Filter */}
      <Select
        value={filters.eventType || "all"}
        onValueChange={(value) => handleFilterChange("eventType", value)}
      >
        <SelectTrigger className="w-[160px]" aria-label={t("filters.eventType")}>
          <SelectValue placeholder={t("filters.allTypes")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
          {usedEventTypes.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assigned User Filter */}
      {users.length > 0 && (
        <Select
          value={filters.assignedUserId || "all"}
          onValueChange={(value) => handleFilterChange("assignedUserId", value)}
        >
          <SelectTrigger className="w-[160px]" aria-label={t("filters.assignedTo")}>
            <SelectValue placeholder={t("filters.anyone")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.anyone")}</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Date Range Preset */}
      <Select
        value={filters.dateRangePreset || "all"}
        onValueChange={(value) => {
          if (value === "custom") {
            handleFilterChange("dateRangePreset", value);
          } else {
            // Clear custom dates when selecting a preset
            const newFilters = { ...filters, dateRangePreset: value === "all" ? undefined : value };
            delete newFilters.customStartDate;
            delete newFilters.customEndDate;
            onFiltersChange(newFilters as CalendarFiltersState);
          }
        }}
      >
        <SelectTrigger className="w-[140px]" aria-label={t("filters.dateRange")}>
          <SelectValue placeholder={t("filters.dateRange")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.all")}</SelectItem>
          <SelectItem value="today">{t("filters.today")}</SelectItem>
          <SelectItem value="thisWeek">{t("filters.thisWeek")}</SelectItem>
          <SelectItem value="thisMonth">{t("filters.thisMonth")}</SelectItem>
          <SelectItem value="custom">{t("filters.custom")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Date Range */}
      {filters.dateRangePreset === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-[240px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.customStartDate && filters.customEndDate ? (
                <>
                  {format(filters.customStartDate, "d MMM", { locale: dateLocale })} -{" "}
                  {format(filters.customEndDate, "d MMM", { locale: dateLocale })}
                </>
              ) : (
                t("filters.custom")
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{
                from: filters.customStartDate,
                to: filters.customEndDate,
              }}
              onSelect={(range) => {
                onFiltersChange({
                  ...filters,
                  customStartDate: range?.from,
                  customEndDate: range?.to,
                });
              }}
              locale={dateLocale}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Invitation Status Filter */}
      <Select
        value={filters.invitationStatus || "all"}
        onValueChange={(value) => handleFilterChange("invitationStatus", value as CalendarFiltersState["invitationStatus"])}
      >
        <SelectTrigger className="w-[140px]" aria-label={t("filters.invitationStatus")}>
          <SelectValue placeholder={t("filters.all")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.all")}</SelectItem>
          <SelectItem value="myEvents">{t("filters.myEvents")}</SelectItem>
          <SelectItem value="invited">{t("filters.invited")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Active Filters Badge & Clear */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Filter className="h-3 w-3" />
            {t("filters.activeFilters", { count: activeFilterCount })}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 px-2"
            aria-label={t("filters.clearFilters")}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{t("filters.clearFilters")}</span>
          </Button>
        </div>
      )}
    </div>
  );
}

