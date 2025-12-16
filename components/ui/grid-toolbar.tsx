"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PlusCircledIcon, CheckIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface GridFilter {
  id: string;
  title: string;
  options: FilterOption[];
}

export interface GridToolbarProps {
  /** Current search value */
  searchValue: string;
  /** Callback when search value changes */
  onSearchChange: (value: string) => void;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Available filters */
  filters?: GridFilter[];
  /** Currently selected filter values by filter id */
  selectedFilters?: Record<string, string[]>;
  /** Callback when filter selection changes */
  onFilterChange?: (filterId: string, values: string[]) => void;
  /** Callback to reset all filters */
  onReset?: () => void;
}

/**
 * Toolbar component for grid views that mimics the DataTable toolbar.
 * Provides search and faceted filtering capabilities.
 */
export function GridToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Filter...",
  filters = [],
  selectedFilters = {},
  onFilterChange,
  onReset,
}: GridToolbarProps) {
  const t = useTranslations("common");

  const hasActiveFilters = Object.values(selectedFilters).some(
    (values) => values.length > 0
  );

  const handleFilterToggle = (filterId: string, value: string) => {
    if (!onFilterChange) return;

    const currentValues = selectedFilters[filterId] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    onFilterChange(filterId, newValues);
  };

  const handleClearFilter = (filterId: string) => {
    if (!onFilterChange) return;
    onFilterChange(filterId, []);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {filters.map((filter) => {
          const selectedValues = selectedFilters[filter.id] || [];
          const selectedCount = selectedValues.length;

          return (
            <DropdownMenu key={filter.id}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-dashed"
                >
                  <PlusCircledIcon className="mr-2 h-4 w-4" />
                  {filter.title}
                  {selectedCount > 0 && (
                    <>
                      <Separator orientation="vertical" className="mx-2 h-4" />
                      <Badge
                        variant="secondary"
                        className="rounded-sm px-1 font-normal lg:hidden"
                      >
                        {selectedCount}
                      </Badge>
                      <div className="hidden space-x-1 lg:flex">
                        {selectedCount > 2 ? (
                          <Badge
                            variant="secondary"
                            className="rounded-sm px-1 font-normal"
                          >
                            {selectedCount} selected
                          </Badge>
                        ) : (
                          filter.options
                            .filter((opt) => selectedValues.includes(opt.value))
                            .map((opt) => (
                              <Badge
                                variant="secondary"
                                key={opt.value}
                                className="rounded-sm px-1 font-normal"
                              >
                                {opt.label}
                              </Badge>
                            ))
                        )}
                      </div>
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                {filter.options.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={isSelected}
                      onCheckedChange={() =>
                        handleFilterToggle(filter.id, option.value)
                      }
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <CheckIcon className={cn("h-4 w-4")} />
                      </div>
                      {option.icon && (
                        <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      )}
                      <span>{option.label}</span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
                {selectedCount > 0 && (
                  <>
                    <Separator className="my-1" />
                    <Button
                      variant="ghost"
                      className="w-full justify-center text-sm"
                      onClick={() => handleClearFilter(filter.id)}
                    >
                      Clear filter
                    </Button>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
        {(hasActiveFilters || searchValue) && (
          <Button
            variant="ghost"
            onClick={onReset}
            className="h-8 px-2 lg:px-3"
          >
            {t("reset")}
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

