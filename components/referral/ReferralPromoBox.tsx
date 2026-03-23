"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, ArrowRight, Sparkles } from "lucide-react";
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
            "group relative overflow-hidden rounded-xl",
            "bg-gradient-to-br from-violet-950/80 via-primary/10 to-fuchsia-950/60",
            "dark:from-violet-950/90 dark:via-primary/15 dark:to-fuchsia-950/70",
            "border border-violet-500/20 dark:border-violet-400/15",
            "p-4 backdrop-blur-sm",
          )}
        >
          {/* Animated shimmer accent */}
          <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-violet-500/10 blur-2xl group-hover:bg-violet-500/20 transition-all duration-700" />
          <div className="absolute -bottom-8 -left-8 w-20 h-20 rounded-full bg-fuchsia-500/8 blur-2xl" />

          {/* Dismiss button — 48px touch target */}
          <button
            onClick={handleDismissClick}
            className="absolute top-0 right-0 z-20 flex items-center justify-center w-12 h-12 hover:bg-white/5 rounded-bl-xl transition-colors"
            aria-label={t("promoBox.dismiss.title")}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground/60" />
          </button>

          {/* Content */}
          <div className="relative z-10">
            {/* Sparkle badge */}
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="h-3 w-3 text-violet-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/90">
                {t("promoBox.title")}
              </span>
            </div>

            {/* Commission highlight */}
            <div className="mb-2">
              <span className="text-3xl font-black bg-gradient-to-r from-violet-400 via-primary to-fuchsia-400 bg-clip-text text-transparent leading-none">
                5%
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed mb-3 pr-6">
              {t.rich("promoBox.headline", {
                commission: (chunks) => (
                  <span className="font-semibold text-foreground">{chunks}</span>
                ),
                duration: (chunks) => (
                  <span className="font-semibold text-violet-300">{chunks}</span>
                ),
              })}
            </p>

            {/* CTA */}
            <Button
              size="sm"
              variant="ghost"
              className="w-full h-8 text-xs gap-1.5 border border-violet-500/30 hover:border-violet-400/50 hover:bg-violet-500/10 text-violet-300 hover:text-violet-200 font-medium transition-all"
              asChild
            >
              <Link href="/app/referral-portal">
                {t("promoBox.learnMore")}
                <ArrowRight className="h-3 w-3" />
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
