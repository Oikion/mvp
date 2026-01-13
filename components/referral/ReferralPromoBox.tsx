"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, Gift, ArrowRight } from "lucide-react";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ReferralPromoBoxProps {
  initialDismissed?: boolean;
  hasReferralCode?: boolean;
  applicationStatus?: "PENDING" | "APPROVED" | "DENIED" | null;
}

export function ReferralPromoBox({
  initialDismissed = false,
  hasReferralCode = false,
  applicationStatus = null,
}: ReferralPromoBoxProps) {
  const t = useTranslations("referrals");
  const [isDismissed, setIsDismissed] = useState(initialDismissed);
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  const [isSessionDismissed, setIsSessionDismissed] = useState(false);

  // Check session storage on mount
  useEffect(() => {
    const sessionDismissed = sessionStorage.getItem("referralBoxDismissed");
    if (sessionDismissed === "true") {
      setIsSessionDismissed(true);
    }
  }, []);

  // Don't show if user already has a referral code (approved referrer)
  // or if permanently dismissed or session dismissed
  if (hasReferralCode || isDismissed || isSessionDismissed) {
    return null;
  }

  // Don't show if application is pending or approved
  if (applicationStatus === "PENDING" || applicationStatus === "APPROVED") {
    return null;
  }

  const handleDismissClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDismissDialog(true);
  };

  const handleNeverShowAgain = async () => {
    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralBoxDismissed: true }),
      });
      setIsDismissed(true);
    } catch (error) {
      console.error("Failed to save preference:", error);
    }
    setShowDismissDialog(false);
  };

  const handleShowLater = () => {
    sessionStorage.setItem("referralBoxDismissed", "true");
    setIsSessionDismissed(true);
    setShowDismissDialog(false);
  };

  return (
    <>
      <div className="mx-2 mb-2">
        <div
          className={cn(
            "relative overflow-hidden rounded-lg",
            "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
            "border border-primary/20",
            "p-3"
          )}
        >
          {/* Dismiss button */}
          <button
            onClick={handleDismissClick}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {/* Content */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
              <Gift className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <h4 className="text-sm font-semibold text-foreground mb-0.5">
                {t("promoBox.title")}
              </h4>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {t("promoBox.description")}
              </p>

              {/* Commission highlight */}
              <div className="flex items-baseline gap-1.5 mb-3">
                <span className="text-2xl font-bold text-primary">
                  {t("promoBox.commission")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("promoBox.commissionLabel")}
                </span>
              </div>

              {/* CTA */}
              <Link href="/app/referral-portal" className="block">
                <Button
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5"
                >
                  {t("promoBox.cta")}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Dismiss Dialog */}
      <Dialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("promoBox.dismiss.title")}</DialogTitle>
            <DialogDescription>
              {t("promoBox.dismiss.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              onClick={handleNeverShowAgain}
              className="w-full"
            >
              {t("promoBox.dismiss.never")}
            </Button>
            <Button
              variant="secondary"
              onClick={handleShowLater}
              className="w-full"
            >
              {t("promoBox.dismiss.later")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
