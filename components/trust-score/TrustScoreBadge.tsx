"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustScoreBadgeProps {
  score: number;
  totalReviews: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}

export function TrustScoreBadge({
  score,
  totalReviews,
  size = "md",
  showCount = true,
  className,
}: TrustScoreBadgeProps) {
  const sizeClasses = {
    sm: "text-xs gap-1",
    md: "text-sm gap-1.5",
    lg: "text-base gap-2",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  if (totalReviews === 0) {
    return (
      <div className={cn("flex items-center text-muted-foreground", sizeClasses[size], className)}>
        <Star size={iconSizes[size]} className="fill-muted stroke-muted" aria-hidden="true" />
        <span>No reviews</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", sizeClasses[size], className)}>
      <Star size={iconSizes[size]} className="fill-warning stroke-warning" aria-hidden="true" />
      <span className="font-medium">{score.toFixed(1)}</span>
      {showCount && (
        <span className="text-muted-foreground">({totalReviews})</span>
      )}
    </div>
  );
}
