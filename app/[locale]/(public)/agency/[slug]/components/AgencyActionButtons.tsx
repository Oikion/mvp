"use client";

import { useEffect, Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { ClipboardList, Handshake } from "lucide-react";

interface AgencyActionButtonsProps {
  locale: string;
  profilePath: string;
  onCollaborate?: () => void;
}

function AgencyActionButtonsInner({
  locale,
  profilePath,
  onCollaborate,
}: AgencyActionButtonsProps) {
  const t = useTranslations("profile");
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const buildSignInUrl = (action: string) => {
    const returnUrl = encodeURIComponent(`${profilePath}?action=${action}`);
    return `/${locale}/app/sign-in?redirect_url=${returnUrl}`;
  };

  // After returning from sign-in with ?action=collaborate, auto-trigger collaborate
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const action = searchParams.get("action");
    if (action !== "collaborate") return;
    globalThis.history.replaceState(null, "", pathname);
    onCollaborate?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  const handleAssign = () => {
    if (!isSignedIn) {
      router.push(buildSignInUrl("assign"));
      return;
    }
    router.push(`/${locale}/app`);
  };

  const handleCollaborate = () => {
    if (!isSignedIn) {
      router.push(buildSignInUrl("collaborate"));
      return;
    }
    onCollaborate?.();
  };

  if (!isLoaded) {
    return (
      <div className="flex gap-3 mt-8 justify-center">
        <div className="h-11 w-36 rounded-md bg-muted animate-pulse" />
        <div className="h-11 w-36 rounded-md bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex gap-3 mt-8 justify-center flex-wrap">
      <Button size="lg" onClick={handleAssign} className="min-w-[140px]">
        <ClipboardList className="h-4 w-4 mr-2" aria-hidden="true" />
        {t("agentProfile.assign")}
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={handleCollaborate}
        className="min-w-[140px]"
      >
        <Handshake className="h-4 w-4 mr-2" aria-hidden="true" />
        {t("agentProfile.collaborate")}
      </Button>
    </div>
  );
}

export function AgencyActionButtons(props: AgencyActionButtonsProps) {
  return (
    <Suspense
      fallback={
        <div className="flex gap-3 mt-8 justify-center">
          <div className="h-11 w-36 rounded-md bg-muted animate-pulse" />
          <div className="h-11 w-36 rounded-md bg-muted animate-pulse" />
        </div>
      }
    >
      <AgencyActionButtonsInner {...props} />
    </Suspense>
  );
}
