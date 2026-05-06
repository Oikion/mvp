"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CriterionScore } from "@/lib/matchmaking";

interface Props {
  breakdown: CriterionScore[];
  /** Limit displayed criteria — useful in tight spaces like tooltips. Omit to show all. */
  maxItems?: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

export function MatchScoreBreakdown({ breakdown, maxItems }: Props) {
  const t = useTranslations("matchmaking");

  // Sort by weight (highest first)
  const sortedBreakdown = [...breakdown].sort((a, b) => b.weight - a.weight);
  const visibleItems = maxItems !== undefined ? sortedBreakdown.slice(0, maxItems) : sortedBreakdown;
  const hiddenCount = sortedBreakdown.length - visibleItems.length;

  const getCriterionLabel = (criterion: string): string => {
    // v2 engine emits UPPERCASE criterion strings; locale keys are lowercase
    const key = criterion.toLowerCase();
    return t(`scoreBreakdown.criteria.${key}` as any) || criterion;
  };

  return (
    <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
      <div className="font-semibold text-sm border-b pb-2">{t("scoreBreakdown.title")}</div>
      {visibleItems.map((item) => (
        <div key={item.criterion} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {item.matched ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <X className="h-3 w-3 text-destructive" />
            )}
            <span className="text-muted-foreground">
              {getCriterionLabel(item.criterion)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${getScoreColor(item.score)}`}>
              {Math.round(item.score)}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({item.weight}% {t("scoreBreakdown.weightSuffix")})
            </span>
          </div>
        </div>
      ))}
      <div className="border-t pt-2 mt-2">
        <div className="text-xs text-muted-foreground">
          {hiddenCount > 0 && (
            <p className="text-center text-muted-foreground/70">+{hiddenCount} more</p>
          )}
          {sortedBreakdown[0]?.reason && (
            <p className="mt-1 italic">{t("scoreBreakdown.topFactor")}: {sortedBreakdown[0].reason}</p>
          )}
        </div>
      </div>
    </div>
  );
}
