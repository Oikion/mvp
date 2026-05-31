"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  UserPlus,
  Clock,
  UserCheck,
  MessageCircle,
  Share2,
  MoreHorizontal,
  ExternalLink,
  UserMinus,
  Check,
  Link2,
  Flag,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppToast } from "@/hooks/use-app-toast";
import { sendConnectionRequest, removeConnection } from "@/actions/social/connections";
import { startDirectMessage } from "@/actions/messaging/direct-messages";

interface AgentProfileActionsProps {
  targetUserId: string;
  initialConnectionStatus: "NONE" | "PENDING" | "ACCEPTED";
  isIncomingRequest: boolean;
  username: string;
  locale: string;
}

export function AgentProfileActions({
  targetUserId,
  initialConnectionStatus,
  isIncomingRequest,
  username,
  locale,
}: AgentProfileActionsProps) {
  const t = useTranslations("profile");
  const tn = useTranslations("network");
  const router = useRouter();
  const { toast } = useAppToast();
  const [connectionStatus, setConnectionStatus] = useState(initialConnectionStatus);
  const [isFollowing, startFollowTransition] = useTransition();
  const [isMessaging, startMessageTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const handleFollow = () => {
    startFollowTransition(async () => {
      try {
        await sendConnectionRequest(targetUserId);
        setConnectionStatus("PENDING");
        toast.success(t("inAppProfile.followSent"), { isTranslationKey: false });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : tn("agentActions.sendRequestFailed");
        // Handle "already connected" gracefully
        if (msg.includes("already")) {
          setConnectionStatus("ACCEPTED");
        } else {
          toast.error(msg, { isTranslationKey: false });
        }
      }
    });
  };

  const handleRemoveConnection = () => {
    startFollowTransition(async () => {
      try {
        await removeConnection(targetUserId);
        setConnectionStatus("NONE");
        toast.success(t("inAppProfile.connectionRemoved"), { isTranslationKey: false });
      } catch {
        toast.error(tn("agentActions.removeConnectionFailed"), { isTranslationKey: false });
      }
    });
  };

  const handleMessage = () => {
    startMessageTransition(async () => {
      try {
        const result = await startDirectMessage(targetUserId);
        if (result?.conversationId) {
          router.push(`/${locale}/app/network/messages?conversationId=${result.conversationId}`);
        }
      } catch {
        toast.error(tn("agentActions.startConversationFailed"), { isTranslationKey: false });
      }
    });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/${locale}/agent/${username}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("publicProfile.share.copied"), { isTranslationKey: false });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("publicProfile.share.copyFailed"), { isTranslationKey: false });
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Follow / Pending / Connected */}
      {connectionStatus === "NONE" && (
        <Button
          size="sm"
          onClick={handleFollow}
          disabled={isFollowing}
          className="gap-1.5"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {t("inAppProfile.follow")}
        </Button>
      )}
      {connectionStatus === "PENDING" && (
        <Button size="sm" variant="secondary" disabled className="gap-1.5">
          <Clock className="h-4 w-4" aria-hidden="true" />
          {isIncomingRequest
            ? t("inAppProfile.respondToRequest")
            : t("inAppProfile.followPending")}
        </Button>
      )}
      {connectionStatus === "ACCEPTED" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <UserCheck className="h-4 w-4 text-success" aria-hidden="true" />
              {t("inAppProfile.connected")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={handleRemoveConnection}
              className="text-destructive focus:text-destructive"
            >
              <UserMinus className="h-4 w-4 mr-2" aria-hidden="true" />
              {t("inAppProfile.removeConnection")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Message */}
      <Button
        size="sm"
        variant="outline"
        onClick={handleMessage}
        disabled={isMessaging}
        className="gap-1.5"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {t("inAppProfile.message")}
      </Button>

      {/* Share */}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleShare}
        className="gap-1.5"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-success" aria-hidden="true" />
            {t("publicProfile.share.copied")}
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4" aria-hidden="true" />
            {t("inAppProfile.share")}
          </>
        )}
      </Button>

      {/* More */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 pointer-coarse:min-h-11 pointer-coarse:min-w-11">
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{tn("agentActions.moreActions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a
              href={`/${locale}/agent/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {t("inAppProfile.viewPublicProfile")}
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-muted-foreground">
            <Flag className="h-4 w-4 mr-2" aria-hidden="true" />
            {t("inAppProfile.report")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
