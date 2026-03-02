"use client";

import { useState, useEffect, Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2, Handshake, ClipboardList } from "lucide-react";
import { PropertyInquirySheet } from "./PropertyInquirySheet";

function CollaborateIcon({ isLoading, isSent }: { isLoading: boolean; isSent: boolean }) {
  if (isLoading) return <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />;
  if (isSent) return <CheckCircle2 className="h-4 w-4 mr-2 text-success" aria-hidden="true" />;
  return <Handshake className="h-4 w-4 mr-2" aria-hidden="true" />;
}

interface ProfileActionButtonsProps {
  targetUserId: string;
  locale: string;
  profilePath: string;
  agentName?: string;
  isOwnProfile?: boolean;
  initialConnectionStatus?: "NONE" | "PENDING" | "ACCEPTED";
  allowAnonymousInquiries?: boolean;
}

type CollaborateStatus = "none" | "loading" | "sent" | "connected";

function ProfileActionButtonsInner({ 
  targetUserId, 
  locale, 
  profilePath,
  agentName = "Agent",
  isOwnProfile: _isOwnProfile = false,
  initialConnectionStatus = "NONE",
  allowAnonymousInquiries = true,
}: ProfileActionButtonsProps) {
  const t = useTranslations("profile");
  const { isSignedIn, isLoaded } = useUser();
  
  // Initialize status based on server-provided connection status
  const getInitialStatus = (): CollaborateStatus => {
    if (initialConnectionStatus === "ACCEPTED") return "connected";
    if (initialConnectionStatus === "PENDING") return "sent";
    return "none";
  };
  
  const [collaborateStatus, setCollaborateStatus] = useState<CollaborateStatus>(getInitialStatus());
  const [inquirySheetOpen, setInquirySheetOpen] = useState(false);
  const { toast } = useAppToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const sendCollaborationRequest = async () => {
    if (collaborateStatus === "sent") return;
    try {
      setCollaborateStatus("loading");
      await axios.post("/api/connections", { targetUserId });
      setCollaborateStatus("sent");
      toast.success(t("agentProfile.requestSentTitle"), {
        description: t("agentProfile.requestSentDesc"),
        isTranslationKey: false,
      });
    } catch (error: unknown) {
      const errMsg =
        axios.isAxiosError(error)
          ? (error.response?.data as string) || ""
          : "";
      // Already connected / already pending — still treat as "sent"
      if (
        errMsg.includes("already connected") ||
        errMsg.includes("already exists") ||
        errMsg.includes("PENDING")
      ) {
        setCollaborateStatus("sent");
      } else {
        setCollaborateStatus("none");
        toast.error("Error", {
          description: errMsg || t("agentProfile.requestError"),
          isTranslationKey: false,
        });
      }
    }
  };

  // After returning from sign-in with ?action=collaborate, auto-send the request
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const action = searchParams.get("action");
    if (action !== "collaborate") return;
    // Remove the query param from URL without a reload
    globalThis.history.replaceState(null, "", pathname);
    sendCollaborationRequest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  const buildSignInUrl = (action: string) => {
    const returnUrl = encodeURIComponent(`${profilePath}?action=${action}`);
    return `/${locale}/app/sign-in?redirect_url=${returnUrl}`;
  };

  const handleAssign = () => {
    // If not signed in and anonymous inquiries not allowed, redirect to sign-in
    if (!isSignedIn && !allowAnonymousInquiries) {
      router.push(buildSignInUrl("assign"));
      return;
    }
    // Open the inquiry sheet
    setInquirySheetOpen(true);
  };

  const handleCollaborate = () => {
    if (!isSignedIn) {
      router.push(buildSignInUrl("collaborate"));
      return;
    }
    sendCollaborationRequest();
  };

  if (!isLoaded) {
    return (
      <div className="flex gap-3 mt-8 justify-center">
        <div className="h-11 w-36 rounded-md bg-muted animate-pulse" />
        <div className="h-11 w-36 rounded-md bg-muted animate-pulse" />
      </div>
    );
  }

  const isSent = collaborateStatus === "sent";
  const isLoading = collaborateStatus === "loading";
  const isConnected = collaborateStatus === "connected";

  // Determine collaborate button text and state
  const getCollaborateText = () => {
    if (isConnected) return t("agentProfile.connected") || "Connected";
    if (isSent) return t("agentProfile.requestSent");
    return t("agentProfile.collaborate");
  };

  // Extract username from profilePath
  const username = profilePath.split("/agent/")[1] || "";

  return (
    <>
      <div className="flex gap-3 mt-8 justify-center flex-wrap">
        <Button size="lg" onClick={handleAssign} className="min-w-[140px]">
          <ClipboardList className="h-4 w-4 mr-2" aria-hidden="true" />
          {t("agentProfile.assign")}
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={handleCollaborate}
          disabled={isLoading || isSent || isConnected}
          className="min-w-[140px]"
        >
          <CollaborateIcon isLoading={isLoading} isSent={isSent || isConnected} />
          {getCollaborateText()}
        </Button>
      </div>

      <PropertyInquirySheet
        open={inquirySheetOpen}
        onOpenChange={setInquirySheetOpen}
        agentUsername={username}
        agentName={agentName}
        locale={locale}
      />
    </>
  );
}

export function ProfileActionButtons(props: ProfileActionButtonsProps) {
  return (
    <Suspense
      fallback={
        <div className="flex gap-3 mt-8 justify-center">
          <div className="h-11 w-36 rounded-md bg-muted animate-pulse" />
          <div className="h-11 w-36 rounded-md bg-muted animate-pulse" />
        </div>
      }
    >
      <ProfileActionButtonsInner {...props} />
    </Suspense>
  );
}
