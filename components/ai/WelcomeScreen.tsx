"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Users,
  Building2,
  Calendar,
  Search,
  PlusCircle,
  Link2,
  MessageSquare,
  TrendingUp,
  FileText,
  ArrowRight,
} from "lucide-react";
import type { Dictionary } from "@/dictionaries";
import type { LucideIcon } from "lucide-react";

// ============================================
// Types
// ============================================

type WelcomeScreenProps = Readonly<{
  onSelectAction: (prompt: string) => void;
  dict: Dictionary;
  userName?: string;
}>;

interface SuggestedAction {
  icon: LucideIcon;
  label: string;
  description: string;
  prompt: string;
  color: string;
  bgColor: string;
}

// ============================================
// Constants
// ============================================

const DEFAULT_SUGGESTIONS: Array<{
  icon: LucideIcon;
  labelKey: string;
  descriptionKey: string;
  promptKey: string;
  color: string;
  bgColor: string;
}> = [
  {
    icon: PlusCircle,
    labelKey: "createClient",
    descriptionKey: "createClientDesc",
    promptKey: "createClientPrompt",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Building2,
    labelKey: "createProperty",
    descriptionKey: "createPropertyDesc",
    promptKey: "createPropertyPrompt",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Calendar,
    labelKey: "scheduleEvent",
    descriptionKey: "scheduleEventDesc",
    promptKey: "scheduleEventPrompt",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Search,
    labelKey: "searchClients",
    descriptionKey: "searchClientsDesc",
    promptKey: "searchClientsPrompt",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
  },
];

const EXAMPLE_PROMPTS = [
  "Schedule a viewing for tomorrow at 3pm",
  "Find clients with budget over €200,000",
  "Create a new property listing in Athens",
  "What's on my calendar this week?",
  "Add a reminder for the Smith meeting",
  "Find properties matching John's preferences",
];

// ============================================
// Components
// ============================================

function SuggestionCard({
  action,
  onSelect,
}: Readonly<{
  action: SuggestedAction;
  onSelect: (prompt: string) => void;
}>) {
  const Icon = action.icon;

  return (
    <button
      onClick={() => onSelect(action.prompt)}
      className={cn(
        "group relative flex flex-col items-start gap-3 p-4 rounded-xl border border-border/50",
        "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
        "transition-all duration-200 text-left bg-card"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          action.bgColor
        )}
      >
        <Icon className={cn("h-5 w-5", action.color)} />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
          {action.label}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {action.description}
        </p>
      </div>
      <ArrowRight
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/0",
          "group-hover:text-primary group-hover:translate-x-1 transition-all duration-200"
        )}
      />
    </button>
  );
}

function ExamplePrompt({
  prompt,
  onSelect,
}: Readonly<{
  prompt: string;
  onSelect: (prompt: string) => void;
}>) {
  return (
    <button
      onClick={() => onSelect(prompt)}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "text-sm text-muted-foreground hover:text-foreground",
        "bg-muted/50 hover:bg-muted transition-colors",
        "border border-transparent hover:border-border/50"
      )}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{prompt}</span>
    </button>
  );
}

// ============================================
// Main Component
// ============================================

export function WelcomeScreen({
  onSelectAction,
  dict,
  userName,
}: WelcomeScreenProps) {
  const t = dict.ai || {};
  const quickActions = (t.quickActions || {}) as Record<string, string>;

  // Build suggested actions with translations
  const suggestedActions: SuggestedAction[] = DEFAULT_SUGGESTIONS.map((s) => ({
    icon: s.icon,
    label: quickActions[s.labelKey] || s.labelKey.replaceAll(/([A-Z])/g, " $1").trim(),
    description:
      quickActions[s.descriptionKey] ||
      `${s.labelKey.replaceAll(/([A-Z])/g, " $1").trim()} with AI assistance`,
    prompt: quickActions[s.promptKey] || "",
    color: s.color,
    bgColor: s.bgColor,
  }));

  // Get translated example prompts or use defaults
  const examplePrompts = (t.examplePrompts as string[] | undefined) || EXAMPLE_PROMPTS;

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.greetingMorning || "Good morning";
    if (hour < 18) return t.greetingAfternoon || "Good afternoon";
    return t.greetingEvening || "Good evening";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-10 max-w-2xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-6 shadow-lg shadow-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-semibold mb-3">
          {getGreeting()}
          {userName && <span className="text-primary">, {userName}</span>}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t.welcomeMessage ||
            "I'm your AI assistant. I can help you manage clients, properties, schedule events, and more."}
        </p>
      </div>

      {/* Suggested Actions Grid */}
      <div className="w-full max-w-3xl mb-10">
        <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {t.suggestedActions || "Suggested actions"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {suggestedActions.map((action) => (
            <SuggestionCard
              key={action.label}
              action={action}
              onSelect={onSelectAction}
            />
          ))}
        </div>
      </div>

      {/* Example Prompts */}
      <div className="w-full max-w-3xl">
        <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {t.tryAsking || "Try asking"}
        </h2>
        <div className="flex flex-wrap gap-2">
          {examplePrompts.slice(0, 6).map((prompt) => (
            <ExamplePrompt
              key={prompt}
              prompt={prompt}
              onSelect={onSelectAction}
            />
          ))}
        </div>
      </div>

      {/* Capabilities Section */}
      <div className="w-full max-w-3xl mt-10 pt-8 border-t border-border/50">
        <div className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>{t.capabilityCrm || "CRM Management"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span>{t.capabilityMls || "Property Listings"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{t.capabilityCalendar || "Calendar & Events"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>{t.capabilityDocs || "Documents"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            <span>{t.capabilityMatching || "Smart Matching"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
