"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CriterionScore } from "@/lib/matchmaking";

interface Props {
  breakdown: CriterionScore[];
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

export function MatchScoreBreakdown({ breakdown }: Props) {
  const t = useTranslations("matchmaking");
  
  // Sort by weight (highest first)
  const sortedBreakdown = [...breakdown].sort((a, b) => b.weight - a.weight);

  const getCriterionLabel = (criterion: string): string => {
    return t(`scoreBreakdown.criteria.${criterion}` as any) || criterion;
  };

  return (
    <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
      <div className="font-semibold text-sm border-b pb-2">{t("scoreBreakdown.title")}</div>
      {sortedBreakdown.map((item) => (
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
          {sortedBreakdown[0]?.reason && (
            <p className="mt-1 italic">{t("scoreBreakdown.topFactor")}: {sortedBreakdown[0].reason}</p>
          )}
        </div>
      </div>
    </div>
  );
}
