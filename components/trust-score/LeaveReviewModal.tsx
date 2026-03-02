"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useAppToast } from "@/hooks/use-app-toast";
import { upsertAgentReview } from "@/actions/trust-score/upsert-agent-review";
import type { AgentReview } from "@prisma/client";

const reviewSchema = z.object({
  overallScore: z.number().min(1).max(5),
  professionalismScore: z.number().min(1).max(5),
  responsivenessScore: z.number().min(1).max(5),
  reliabilityScore: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface LeaveReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revieweeId: string;
  revieweeName: string;
  existingReview?: AgentReview | null;
  onSuccess?: () => void;
}

export function LeaveReviewModal({
  open,
  onOpenChange,
  revieweeId,
  revieweeName,
  existingReview,
  onSuccess,
}: LeaveReviewModalProps) {
  const t = useTranslations("trust-score");
  const { toast } = useAppToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      overallScore: existingReview?.overallScore || 0,
      professionalismScore: existingReview?.professionalismScore || 0,
      responsivenessScore: existingReview?.responsivenessScore || 0,
      reliabilityScore: existingReview?.reliabilityScore || 0,
      comment: existingReview?.comment || "",
    },
  });

  const onSubmit = async (values: ReviewFormValues) => {
    try {
      setIsSubmitting(true);

      const result = await upsertAgentReview({
        revieweeId,
        ...values,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to submit review", {
          isTranslationKey: false,
        });
        return;
      }

      toast.success(existingReview ? t("reviewUpdated") : t("reviewSubmitted"), {
        isTranslationKey: false,
      });

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("[SUBMIT_REVIEW]", error);
      toast.error("An unexpected error occurred", { isTranslationKey: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingReview ? t("editReview") : t("leaveReview")}
          </DialogTitle>
          <DialogDescription>
            Review your experience with {revieweeName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="overallScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">{t("overallRating")}</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-4">
                      <StarRating
                        rating={field.value}
                        size="lg"
                        interactive
                        onChange={field.onChange}
                      />
                      {field.value > 0 && (
                        <span className="text-lg font-medium">{field.value}</span>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 pt-4 border-t">
              <FormField
                control={form.control}
                name="professionalismScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("professionalism")}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <StarRating
                          rating={field.value}
                          size="md"
                          interactive
                          onChange={field.onChange}
                        />
                        {field.value > 0 && (
                          <span className="font-medium">{field.value}</span>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsivenessScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("responsiveness")}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <StarRating
                          rating={field.value}
                          size="md"
                          interactive
                          onChange={field.onChange}
                        />
                        {field.value > 0 && (
                          <span className="font-medium">{field.value}</span>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reliabilityScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("reliability")}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <StarRating
                          rating={field.value}
                          size="md"
                          interactive
                          onChange={field.onChange}
                        />
                        {field.value > 0 && (
                          <span className="font-medium">{field.value}</span>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("reviewComment")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("commentPlaceholder")}
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {existingReview ? t("editReview") : t("leaveReview")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
