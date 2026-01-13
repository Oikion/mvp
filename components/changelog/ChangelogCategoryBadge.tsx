"use client";

import {
  Sparkles,
  Bug,
  Zap,
  Shield,
  Rocket,
  Wrench,
  Bell,
  Globe,
  Lock,
  Database,
  Layout,
  Palette,
  Server,
  Smartphone,
  Settings,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChangelogCategoryData } from "@/lib/changelog-constants";

interface ChangelogCategoryBadgeProps {
  category: ChangelogCategoryData | null;
  size?: "sm" | "md";
  translatedName?: string;
}

// Color styles
const colorStyles: Record<string, string> = {
  gray: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  red: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  yellow: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  lime: "bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/20",
  green: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  fuchsia: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20",
  pink: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

// Icon component map
const iconComponents: Record<string, React.ElementType> = {
  sparkles: Sparkles,
  bug: Bug,
  zap: Zap,
  shield: Shield,
  rocket: Rocket,
  wrench: Wrench,
  bell: Bell,
  globe: Globe,
  lock: Lock,
  database: Database,
  layout: Layout,
  palette: Palette,
  server: Server,
  smartphone: Smartphone,
  settings: Settings,
  star: Star,
};

export function ChangelogCategoryBadge({
  category,
  size = "sm",
  translatedName,
}: ChangelogCategoryBadgeProps) {
  if (!category) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border font-medium",
          colorStyles.gray,
          size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
        )}
      >
        Uncategorized
      </span>
    );
  }

  const Icon = iconComponents[category.icon] || Sparkles;
  const colorStyle = colorStyles[category.color] || colorStyles.gray;
  // Use translated name if provided, otherwise fall back to category name
  const displayName = translatedName || category.name;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        colorStyle,
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      {displayName}
    </span>
  );
}
