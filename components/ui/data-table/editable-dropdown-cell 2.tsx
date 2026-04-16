"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
  variant?: string;
  icon?: LucideIcon;
}

interface EditableDropdownCellProps {
  value: string | null | undefined;
  onSave: (value: string) => Promise<void>;
  options: DropdownOption[];
  useBadge?: boolean;
  placeholder?: string;
}

export const EditableDropdownCell = ({
  value,
  onSave,
  options,
  useBadge = true,
  placeholder = "—",
}: EditableDropdownCellProps) => {
  const [loading, setLoading] = useState(false);

  const currentValue = value || "";
  const currentOption = options.find((o) => o.value === currentValue);
  const displayLabel = currentOption?.label || placeholder;
  const displayVariant = currentOption?.variant || "secondary";
  const DisplayIcon = currentOption?.icon;

  const handleValueChange = async (newValue: string) => {
    if (newValue === currentValue) return;
    setLoading(true);
    try {
      await onSave(newValue);
    } finally {
      setLoading(false);
    }
  };

  const trigger = useBadge ? (
    <button
      className="outline-none focus:ring-2 focus:ring-ring rounded-full cursor-pointer flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <Badge
        variant={displayVariant as any}
        className="hover:opacity-80 transition-opacity"
      >
        {DisplayIcon && <DisplayIcon className="mr-1 h-3 w-3" />}
        {displayLabel}
        <ChevronDown className="ml-1 h-3 w-3" />
      </Badge>
    </button>
  ) : (
    <button
      className="outline-none focus:ring-2 focus:ring-ring rounded cursor-pointer flex items-center gap-1 whitespace-nowrap hover:bg-muted/50 px-2 py-1 -mx-2 transition-colors text-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <span>{displayLabel}</span>
      <ChevronDown className="h-3 w-3 text-muted-foreground" />
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={loading}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => handleValueChange(opt.value)}
              className="cursor-pointer"
            >
              {opt.variant && !Icon && (
                <Badge
                  variant={opt.variant as any}
                  className="mr-2 w-2 h-2 rounded-full p-0"
                />
              )}
              {Icon && <Icon className="mr-2 h-4 w-4" />}
              {opt.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
