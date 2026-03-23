"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, ArrowRight } from "lucide-react";
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

  useEffect(() => {
    const sessionDismissed = sessionStorage.getItem("referralBoxDismissed");
    if (sessionDismissed === "true") {
      setIsSessionDismissed(true);
    }
  }, []);

  if (hasReferralCode || isDismissed || isSessionDismissed) {
    return null;
  }

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
            "relative overflow-hidden rounded-xl",
            "bg-gradient-to-br from-violet-600/20 via-primary/15 to-fuchsia-500/10",
            "dark:from-violet-500/25 dark:via-primary/20 dark:to-fuchsia-400/15",
            "border border-primary/20 dark:border-primary/30",
            "p-3 backdrop-blur-sm"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent pointer-events-none" />

          {/* Dismiss button — 48px touch target */}
          <button
            onClick={handleDismissClick}
            className="absolute top-0 right-0 z-10 flex items-center justify-center w-12 h-12 hover:bg-primary/10 rounded-bl-xl transition-colors"
            aria-label={t("promoBox.dismiss.title")}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Content */}
          <div className="relative z-10 pr-8">
            <p className="text-sm text-foreground leading-snug mb-3">
              {t.rich("promoBox.headline", {
                commission: (chunks) => (
                  <span className="font-bold text-base bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                    {chunks}
                  </span>
                ),
                duration: (chunks) => (
                  <span className="font-bold text-foreground">
                    {chunks}
                  </span>
                ),
              })}
            </p>

            <Button
              size="sm"
              className="w-full h-auto min-h-8 py-1.5 text-xs gap-1.5 bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 text-white font-medium"
              asChild
            >
              <Link href="/app/referral-portal" className="block">
                <span className="text-center leading-tight">{t("promoBox.cta")}</span>
                <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
              </Link>
            </Button>
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
          <DialogFooter className="flex flex-col items-center gap-2 sm:flex-col sm:items-center sm:space-x-0">
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
