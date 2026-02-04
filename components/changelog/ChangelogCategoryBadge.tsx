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
import { getTagColorString } from "@/lib/changelog/category-colors";

interface ChangelogCategoryBadgeProps {
  category: ChangelogCategoryData | null;
  size?: "sm" | "md";
  translatedName?: string;
}

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
          getTagColorString("gray"),
          size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
        )}
      >
        Uncategorized
      </span>
    );
  }

  const Icon = iconComponents[category.icon] || Sparkles;
  const colorClasses = getTagColorString(category.color);
  // Use translated name if provided, otherwise fall back to category name
  const displayName = translatedName || category.name;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        colorClasses,
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      {displayName}
    </span>
  );
}
