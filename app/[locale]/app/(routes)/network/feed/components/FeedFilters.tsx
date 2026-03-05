"use client";

import { Building2, User, FileText, LayoutGrid, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeedFiltersProps {
  filter: string;
  onFilterChange: (filter: string) => void;
  t: any;
}

const FILTERS = [
  { value: "all", icon: LayoutGrid, labelKey: "all", fallback: "All" },
  {
    value: "properties",
    icon: Building2,
    labelKey: "properties",
    fallback: "Properties",
  },
  { value: "clients", icon: User, labelKey: "clients", fallback: "Clients" },
  {
    value: "mandates",
    icon: ClipboardList,
    labelKey: "mandates",
    fallback: "Mandates",
  },
  {
    value: "updates",
    icon: FileText,
    labelKey: "updates",
    fallback: "Updates",
  },
] as const;

export function FeedFilters({ filter, onFilterChange, t }: FeedFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {FILTERS.map(({ value, icon: Icon, labelKey, fallback }) => {
        const isActive = filter === value;
        return (
          <Button
            key={value}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(value)}
            className={`rounded-full ${
              isActive
                ? ""
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5 mr-1.5" />
            {t?.filters?.[labelKey] || fallback}
          </Button>
        );
      })}
    </div>
  );
}
