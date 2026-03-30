"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";

interface ShareProfileButtonProps {
  url: string;
  title: string;
}

export function ShareProfileButton({ url, title }: ShareProfileButtonProps) {
  const t = useTranslations("profile");
  const { toast } = useAppToast();
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${url}`
    : url;

  const handleShare = async () => {
    // Try native share on mobile
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: fullUrl });
        return;
      } catch {
        // User cancelled or not supported — fall through to copy
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success(t("publicProfile.share.copied"), { isTranslationKey: false });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("publicProfile.share.copyFailed"), { isTranslationKey: false });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="gap-1.5"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
          <span className="hidden sm:inline">{t("publicProfile.share.copied")}</span>
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{t("publicProfile.share.share")}</span>
          <Link2 className="h-3.5 w-3.5 sm:hidden" aria-hidden="true" />
        </>
      )}
    </Button>
  );
}
