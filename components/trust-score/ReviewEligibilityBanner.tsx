"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { ReviewEligibilityResult } from "@/actions/trust-score/check-review-eligibility";

interface ReviewEligibilityBannerProps {
  eligibility: ReviewEligibilityResult;
  className?: string;
}

export function ReviewEligibilityBanner({
  eligibility,
  className,
}: ReviewEligibilityBannerProps) {
  const t = useTranslations("trust-score");

  if (eligibility.eligible) {
    return (
      <Alert variant="default" className={cn("border-success bg-success/10", className)}>
        <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
        <AlertTitle className="text-success">{t("eligibility.canReview")}</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          {t("eligibility.requirements")}
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>{t("eligibility.req1")}</li>
            <li>{t("eligibility.req2")}</li>
            <li>{t("eligibility.req3")}</li>
          </ul>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive" className={className}>
      <XCircle className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{t("eligibility.cannotReview")}</AlertTitle>
      <AlertDescription>
        <p className="mb-2">{eligibility.reason}</p>
        <p className="text-sm font-medium mb-1">{t("eligibility.requirements")}</p>
        <ul className="list-inside space-y-1 text-sm">
          <li className="flex items-center gap-2">
            {eligibility.details.isConnected ? (
              <CheckCircle2 size={14} className="text-success shrink-0" aria-hidden="true" />
            ) : (
              <XCircle size={14} className="text-destructive shrink-0" aria-hidden="true" />
            )}
            {t("eligibility.req1")}
          </li>
          <li className="flex items-center gap-2">
            {eligibility.details.hasSharedProperty ? (
              <CheckCircle2 size={14} className="text-success shrink-0" aria-hidden="true" />
            ) : (
              <XCircle size={14} className="text-destructive shrink-0" aria-hidden="true" />
            )}
            {t("eligibility.req2")}
          </li>
          <li className="flex items-center gap-2">
            {eligibility.details.connectedLongEnough ? (
              <CheckCircle2 size={14} className="text-success shrink-0" aria-hidden="true" />
            ) : (
              <XCircle size={14} className="text-destructive shrink-0" aria-hidden="true" />
            )}
            {t("eligibility.req3")}
            {eligibility.details.connectionDays !== undefined && (
              <span className="text-muted-foreground">
                ({t("eligibility.notLongEnough", { days: eligibility.details.connectionDays })})
              </span>
            )}
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
