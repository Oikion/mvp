"use client";

import { Lock, Shield, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemVisibility } from "@prisma/client";

interface Option {
  value: ItemVisibility;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const OPTIONS: Option[] = [
  {
    value: "PERSONAL",
    icon: <Lock className="h-4 w-4" />,
    label: "Personal",
    description: "Only you and your org",
  },
  {
    value: "SECURE",
    icon: <Shield className="h-4 w-4" />,
    label: "Secure",
    description: "App users & network peers",
  },
  {
    value: "PUBLIC",
    icon: <Globe className="h-4 w-4" />,
    label: "Public",
    description: "Everyone, shown on profile",
  },
];

interface ItemVisibilitySelectorProps {
  value: ItemVisibility;
  onChange: (value: ItemVisibility) => void;
  disabled?: boolean;
}

export function ItemVisibilitySelector({
  value,
  onChange,
  disabled = false,
}: ItemVisibilitySelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
              "hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50",
              isSelected
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "shrink-0",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}
            >
              {opt.icon}
            </span>
            <span className="flex flex-col gap-0.5 min-w-0">
              <span
                className={cn(
                  "text-sm font-medium leading-none",
                  isSelected ? "text-primary" : "text-foreground"
                )}
              >
                {opt.label}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {opt.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
