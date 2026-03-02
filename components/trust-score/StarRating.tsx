"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onChange,
  className,
}: StarRatingProps) {
  const sizeClasses = {
    sm: 14,
    md: 18,
    lg: 24,
  };

  const iconSize = sizeClasses[size];

  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index + 1);
    }
  };

  return (
    <div className={cn("flex gap-0.5", className)}>
      {Array.from({ length: maxRating }).map((_, index) => {
        const isFilled = index < Math.floor(rating);
        const isPartial = index === Math.floor(rating) && rating % 1 !== 0;

        return (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(index)}
            disabled={!interactive}
            className={cn(
              "relative transition-transform",
              interactive && "hover:scale-110 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded",
              !interactive && "cursor-default"
            )}
            aria-label={`${index + 1} star${index + 1 > 1 ? "s" : ""}`}
          >
            <Star
              size={iconSize}
              className={cn(
                "transition-colors",
                isFilled && "fill-warning stroke-warning",
                !isFilled && !isPartial && "fill-none stroke-muted",
                isPartial && "fill-warning/50 stroke-warning"
              )}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
