"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import type { Achievement } from "@prisma/client";

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
  className?: string;
}

const tierStyles = {
  1: {
    // Bronze
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800",
    icon: "text-amber-600 dark:text-amber-400",
    text: "text-amber-900 dark:text-amber-100",
  },
  2: {
    // Silver
    bg: "bg-slate-50 dark:bg-slate-900/20",
    border: "border-slate-300 dark:border-slate-700",
    icon: "text-slate-600 dark:text-slate-300",
    text: "text-slate-900 dark:text-slate-100",
  },
  3: {
    // Gold
    bg: "bg-yellow-50 dark:bg-yellow-950/20",
    border: "border-yellow-300 dark:border-yellow-700",
    icon: "text-yellow-600 dark:text-yellow-400",
    text: "text-yellow-900 dark:text-yellow-100",
  },
  4: {
    // Platinum
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-300 dark:border-purple-700",
    icon: "text-purple-600 dark:text-purple-400",
    text: "text-purple-900 dark:text-purple-100",
  },
};

const sizeConfig = {
  sm: {
    container: "w-10 h-10",
    icon: 16,
  },
  default: {
    container: "w-12 h-12",
    icon: 20,
  },
  lg: {
    container: "w-16 h-16",
    icon: 28,
  },
};

export function AchievementBadge({
  achievement,
  size = "default",
  showLabel = false,
  className,
}: AchievementBadgeProps) {
  const t = useTranslations();

  const tier = Math.min(Math.max(achievement.tier, 1), 4) as 1 | 2 | 3 | 4;
  const style = tierStyles[tier];
  const sizeStyle = sizeConfig[size];

  const IconComponent = (
    LucideIcons[achievement.icon as keyof typeof LucideIcons] ||
    LucideIcons.Award
  ) as React.ComponentType<{ className?: string; size?: number; "aria-hidden"?: string }>;

  const name = t(achievement.nameKey);
  const description = t(achievement.descriptionKey);

  if (showLabel) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex flex-col items-center gap-2 cursor-pointer", className)}>
            <div
              className={cn(
                "flex items-center justify-center rounded-full border-2 transition-transform hover:scale-110",
                style.bg,
                style.border,
                sizeStyle.container
              )}
            >
              <IconComponent
                className={cn(style.icon)}
                size={sizeStyle.icon}
                aria-hidden="true"
              />
            </div>
            <div className="text-center">
              <p className={cn("text-sm font-semibold", style.text)}>{name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center justify-center rounded-full border-2 cursor-pointer transition-transform hover:scale-110",
            style.bg,
            style.border,
            sizeStyle.container,
            className
          )}
        >
          <IconComponent
            className={cn(style.icon)}
            size={sizeStyle.icon}
            aria-hidden="true"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface AchievementsGridProps {
  achievements: Array<{
    achievement: Achievement;
    earnedAt: Date;
  }>;
  maxDisplay?: number;
  className?: string;
}

export function AchievementsGrid({
  achievements,
  maxDisplay = 6,
  className,
}: AchievementsGridProps) {
  const displayAchievements = achievements.slice(0, maxDisplay);
  const remaining = Math.max(0, achievements.length - maxDisplay);

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {displayAchievements.map((item) => (
          <AchievementBadge
            key={item.achievement.id}
            achievement={item.achievement}
            size="default"
          />
        ))}
        {remaining > 0 && (
          <Badge variant="gray" size="default" className="h-12 px-3">
            +{remaining}
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}
