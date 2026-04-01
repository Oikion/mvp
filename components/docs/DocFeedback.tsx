"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface DocFeedbackProps {
  pageSlug: string;
  docScope: "public" | "private";
  locale: string;
}

type FeedbackState = "idle" | "selected" | "commenting" | "submitting" | "submitted";

export function DocFeedback({ pageSlug, docScope, locale }: DocFeedbackProps) {
  const t = useTranslations("docs.feedback");
  const [state, setState] = useState<FeedbackState>("idle");
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");

  const handleRating = async (value: "up" | "down") => {
    setRating(value);
    setState("commenting");
  };

  const handleSubmit = async () => {
    if (!rating) return;

    setState("submitting");

    try {
      await fetch("/api/docs-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageSlug,
          docScope,
          locale,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      setState("submitted");
    } catch {
      setState("submitted");
    }
  };

  const handleSkipComment = async () => {
    if (!rating) return;

    setState("submitting");

    try {
      await fetch("/api/docs-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageSlug,
          docScope,
          locale,
          rating,
        }),
      });
    } catch {
      // Silently fail
    }

    setState("submitted");
  };

  if (state === "submitted") {
    return (
      <div className="mt-8 border-t pt-6">
        <p className="text-sm text-muted-foreground text-center">
          {t("thanks")}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t pt-6">
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          {t("question")}
        </p>

        {(state === "idle" || state === "selected") && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRating("up")}
              className={cn(
                "gap-1.5",
                rating === "up" && "border-success text-success bg-success/10"
              )}
            >
              <ThumbsUp className="h-4 w-4" />
              {t("yes")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRating("down")}
              className={cn(
                "gap-1.5",
                rating === "down" && "border-destructive text-destructive bg-destructive/10"
              )}
            >
              <ThumbsDown className="h-4 w-4" />
              {t("no")}
            </Button>
          </div>
        )}

        {state === "commenting" && (
          <div className="w-full max-w-md space-y-3">
            <div className="flex items-center gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled
                className={cn(
                  "gap-1.5",
                  rating === "up" && "border-success text-success bg-success/10",
                  rating === "down" && "border-destructive text-destructive bg-destructive/10"
                )}
              >
                {rating === "up" ? (
                  <><ThumbsUp className="h-4 w-4" /> {t("helpful")}</>
                ) : (
                  <><ThumbsDown className="h-4 w-4" /> {t("notHelpful")}</>
                )}
              </Button>
            </div>

            <Textarea
              placeholder={t("commentPlaceholder")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              className="text-sm"
            />

            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {t("send")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipComment}
              >
                {t("skip")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
