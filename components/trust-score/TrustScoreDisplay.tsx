"use client";

import { useTranslations } from "next-intl";
import { StarRating } from "./StarRating";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TrustScore } from "@prisma/client";

interface TrustScoreDisplayProps {
  trustScore: TrustScore | null;
  variant?: "default" | "compact";
  className?: string;
}

export function TrustScoreDisplay({
  trustScore,
  variant = "default",
  className,
}: TrustScoreDisplayProps) {
  const t = useTranslations("trust-score");

  if (!trustScore || trustScore.totalReviews === 0) {
    return (
      <Card className={cn("text-center", className)}>
        <CardContent className="py-8">
          <p className="text-muted-foreground">{t("noReviews")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("beFirstToReview")}</p>
        </CardContent>
      </Card>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <div>
          <div className="text-3xl font-bold">{trustScore.averageOverall.toFixed(1)}</div>
          <StarRating rating={trustScore.averageOverall} size="md" />
        </div>
        <div className="text-sm text-muted-foreground">
          {t("totalReviews", { count: trustScore.totalReviews })}
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("trustScore")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="text-5xl font-bold">{trustScore.averageOverall.toFixed(1)}</div>
          <div>
            <StarRating rating={trustScore.averageOverall} size="lg" />
            <p className="text-sm text-muted-foreground mt-1">
              {t("totalReviews", { count: trustScore.totalReviews })}
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("professionalism")}</span>
            <div className="flex items-center gap-2">
              <StarRating rating={trustScore.averageProfessionalism} size="sm" />
              <span className="text-sm font-medium min-w-[2rem] text-right">
                {trustScore.averageProfessionalism.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("responsiveness")}</span>
            <div className="flex items-center gap-2">
              <StarRating rating={trustScore.averageResponsiveness} size="sm" />
              <span className="text-sm font-medium min-w-[2rem] text-right">
                {trustScore.averageResponsiveness.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("reliability")}</span>
            <div className="flex items-center gap-2">
              <StarRating rating={trustScore.averageReliability} size="sm" />
              <span className="text-sm font-medium min-w-[2rem] text-right">
                {trustScore.averageReliability.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
