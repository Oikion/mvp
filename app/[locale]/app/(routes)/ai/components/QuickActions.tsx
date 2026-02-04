"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  Calendar,
  Search,
  PlusCircle,
  Link2,
  Bell,
} from "lucide-react";
import type { Dictionary } from "@/dictionaries";
import type { LucideIcon } from "lucide-react";

interface QuickActionsProps {
  onSelect: (action: string) => void;
  dict: Dictionary;
}

interface QuickAction {
  icon: LucideIcon;
  labelKey: keyof NonNullable<NonNullable<Dictionary["ai"]>["quickActions"]>;
  promptKey: keyof NonNullable<NonNullable<Dictionary["ai"]>["quickActions"]>;
  category: string;
}

const defaultActions: QuickAction[] = [
  {
    icon: PlusCircle,
    labelKey: "createClient",
    promptKey: "createClientPrompt",
    category: "crm",
  },
  {
    icon: Building2,
    labelKey: "createProperty",
    promptKey: "createPropertyPrompt",
    category: "mls",
  },
  {
    icon: Calendar,
    labelKey: "scheduleEvent",
    promptKey: "scheduleEventPrompt",
    category: "calendar",
  },
  {
    icon: Bell,
    labelKey: "setReminder",
    promptKey: "setReminderPrompt",
    category: "calendar",
  },
  {
    icon: Search,
    labelKey: "checkCalendar",
    promptKey: "checkCalendarPrompt",
    category: "calendar",
  },
  {
    icon: Users,
    labelKey: "searchClients",
    promptKey: "searchClientsPrompt",
    category: "crm",
  },
  {
    icon: Building2,
    labelKey: "searchProperties",
    promptKey: "searchPropertiesPrompt",
    category: "mls",
  },
  {
    icon: Link2,
    labelKey: "linkEntities",
    promptKey: "linkEntitiesPrompt",
    category: "system",
  },
];

export function QuickActions({ onSelect, dict }: QuickActionsProps) {
  const t = dict.ai?.quickActions || {};

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
      {defaultActions.map((action) => {
        const Icon = action.icon;
        const labelKeyStr = String(action.labelKey);
        const promptKeyStr = String(action.promptKey);
        const label = (t as Record<string, string>)[labelKeyStr] || labelKeyStr;
        const prompt = (t as Record<string, string>)[promptKeyStr] || promptKeyStr;
        
        return (
          <Button
            key={labelKeyStr}
            variant="outline"
            className="h-auto py-3 px-4 justify-start gap-2 hover:bg-primary/5 hover:border-primary/20 transition-colors"
            onClick={() => onSelect(prompt)}
          >
            <Icon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-normal text-left">
              {label}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
