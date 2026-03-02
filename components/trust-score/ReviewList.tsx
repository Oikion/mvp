"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AgentReviewWithReviewer } from "@/actions/trust-score/get-reviews";
import Link from "next/link";
import { useLocale } from "next-intl";

interface ReviewListProps {
  reviews: AgentReviewWithReviewer[];
  currentUserId?: string;
  onEdit?: (review: AgentReviewWithReviewer) => void;
  onDelete?: (reviewId: string) => void;
  className?: string;
}

export function ReviewList({
  reviews,
  currentUserId,
  onEdit,
  onDelete,
  className,
}: ReviewListProps) {
  const t = useTranslations("trust-score");
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  const toggleExpanded = (reviewId: string) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  };

  if (reviews.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        {t("noReviews")}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {reviews.map((review) => {
        const isOwn = currentUserId === review.reviewerId;
        const isExpanded = expandedReviews.has(review.id);
        const commentExcerpt = review.comment && review.comment.length > 200
          ? review.comment.slice(0, 200) + "..."
          : review.comment;

        return (
          <Card key={review.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Link
                    href={review.Reviewer.AgentProfile ? `/agent/${review.Reviewer.AgentProfile.slug}` : "#"}
                    className="shrink-0"
                  >
                    <Avatar>
                      <AvatarImage src={review.Reviewer.avatar || undefined} />
                      <AvatarFallback>
                        {review.Reviewer.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={review.Reviewer.AgentProfile ? `/agent/${review.Reviewer.AgentProfile.slug}` : "#"}
                          className="font-medium hover:underline"
                        >
                          {review.Reviewer.name || "Anonymous"}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(review.createdAt), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-3">
                        <StarRating rating={review.overallScore} size="sm" />
                        <span className="text-sm font-medium">{review.overallScore.toFixed(1)}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">{t("professionalism")}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <StarRating rating={review.professionalismScore} size="sm" />
                            <span className="font-medium">{review.professionalismScore}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("responsiveness")}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <StarRating rating={review.responsivenessScore} size="sm" />
                            <span className="font-medium">{review.responsivenessScore}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("reliability")}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <StarRating rating={review.reliabilityScore} size="sm" />
                            <span className="font-medium">{review.reliabilityScore}</span>
                          </div>
                        </div>
                      </div>

                      {review.comment && (
                        <div className="mt-3">
                          <p className="text-sm whitespace-pre-wrap">
                            {isExpanded ? review.comment : commentExcerpt}
                          </p>
                          {review.comment.length > 200 && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => toggleExpanded(review.id)}
                              className="mt-1 px-0 h-auto"
                            >
                              {isExpanded ? t("showLess") : t("showMore")}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isOwn && (onEdit || onDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical size={16} aria-hidden="true" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(review)}>
                          <Pencil size={16} className="mr-2" aria-hidden="true" />
                          {t("editReview")}
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          onClick={() => onDelete(review.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 size={16} className="mr-2" aria-hidden="true" />
                          {t("deleteReview")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
