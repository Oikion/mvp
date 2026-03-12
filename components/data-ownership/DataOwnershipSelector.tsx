"use client";

import { Building2, UserCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface DataOwnershipSelectorProps {
  defaultValue?: "AGENCY" | "AGENT";
  onChange: (mode: "AGENCY" | "AGENT") => void;
  disabled?: boolean;
}

export function DataOwnershipSelector({
  defaultValue,
  onChange,
  disabled = false,
}: DataOwnershipSelectorProps) {
  const t = useTranslations("dataOwnership.selector");

  const options = [
    {
      mode: "AGENCY" as const,
      icon: Building2,
      title: t("agency.title"),
      description: t("agency.description"),
    },
    {
      mode: "AGENT" as const,
      icon: UserCircle,
      title: t("agent.title"),
      description: t("agent.description"),
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">{t("title")}</h3>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map(({ mode, icon: Icon, title, description }) => (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => onChange(mode)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
              "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              defaultValue === mode
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border",
              disabled && "pointer-events-none opacity-60"
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <span className="font-medium">{title}</span>
            </div>
            <span className="text-sm text-muted-foreground">{description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
