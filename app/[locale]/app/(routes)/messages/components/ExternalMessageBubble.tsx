"use client";

import { useTranslations } from "next-intl";
import { MessagingPlatform } from "@/types/messaging";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Message } from "@/hooks/swr/useMessaging";

const PLATFORM_BADGE: Record<MessagingPlatform, string> = {
  VIBER: "bg-primary/10 text-primary",
  WHATSAPP: "bg-success/10 text-success",
  MESSENGER: "bg-info/10 text-info",
};

export function ExternalMessageBubble({
  message,
  className,
}: {
  message: Message;
  className?: string;
}) {
  const t = useTranslations("messages");
  const platform = message.externalPlatform ?? MessagingPlatform.VIBER;
  const platformLabel = t(`external.platforms.${platform.toLowerCase()}`);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px] px-2 py-0 h-4">
          {t("external.messageLabel")}
        </Badge>
        {message.externalPlatform ? (
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-medium",
              PLATFORM_BADGE[platform]
            )}
          >
            {platformLabel}
          </span>
        ) : null}
      </div>
      <div className="text-sm whitespace-pre-wrap break-words">
        {message.content}
      </div>
    </div>
  );
}
