"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare, Plus } from "lucide-react";
import { MessagingPlatform } from "@/types/messaging";
import { PLATFORM_ICONS } from "@/lib/platform-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlatformStatusBadge } from "./integrations/PlatformStatusBadge";
import type { ExternalConversation } from "@/hooks/swr/useExternalConversations";
import type { ExternalIntegration } from "@/hooks/swr/useExternalIntegrations";

interface ExternalConversationListProps {
  conversations: ExternalConversation[];
  integrations: ExternalIntegration[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConnect: () => void;
  isLoading?: boolean;
}

const PLATFORM_STYLES: Record<MessagingPlatform, string> = {
  VIBER: "bg-primary/10 text-primary",
  WHATSAPP: "bg-success/10 text-success",
  MESSENGER: "bg-info/10 text-info",
};

function getPlatformLabel(platform: MessagingPlatform, t: (key: string) => string) {
  switch (platform) {
    case MessagingPlatform.VIBER:
      return t("external.platforms.viber");
    case MessagingPlatform.WHATSAPP:
      return t("external.platforms.whatsapp");
    case MessagingPlatform.MESSENGER:
      return t("external.platforms.messenger");
    default:
      return platform;
  }
}

export function ExternalConversationList({
  conversations,
  integrations,
  selectedId,
  onSelect,
  onConnect,
  isLoading,
}: ExternalConversationListProps) {
  const t = useTranslations("messages");

  const grouped = useMemo(() => {
    return conversations.reduce<Record<MessagingPlatform, ExternalConversation[]>>(
      (acc, convo) => {
        acc[convo.platform] = acc[convo.platform] || [];
        acc[convo.platform].push(convo);
        return acc;
      },
      {
        VIBER: [],
        WHATSAPP: [],
        MESSENGER: [],
      }
    );
  }, [conversations]);

  const hasIntegrations = integrations.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        {t("external.loading")}
      </div>
    );
  }

  if (!hasIntegrations) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" aria-hidden />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t("external.emptyTitle")}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {t("external.emptyDescription")}
        </p>
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {Object.entries(PLATFORM_ICONS).map(([platform, iconUrl]) => (
            <Badge key={platform} variant="secondary" className="gap-1">
              <img src={iconUrl} alt="" className="h-3 w-3" aria-hidden />
              {getPlatformLabel(platform as MessagingPlatform, t)}
            </Badge>
          ))}
        </div>
        <Button onClick={onConnect} size="lg">
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          {t("external.connectPlatform")}
        </Button>
      </div>
    );
  }

  const platforms = Object.values(MessagingPlatform);

  return (
    <div className="space-y-4">
      {platforms.map((platform) => {
        const items = grouped[platform];
        const platformIntegrations = integrations.filter((integration) => integration.platform === platform);
        const isConnected = platformIntegrations.some((integration) => integration.isActive);
        const statusLabel = isConnected
          ? t("external.status.connected")
          : t("external.status.disconnected");

        return (
          <div key={platform} className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span>{getPlatformLabel(platform, t)}</span>
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  {items.length}
                </Badge>
              </div>
              <PlatformStatusBadge
                status={isConnected ? "connected" : "disconnected"}
                label={statusLabel}
              />
            </div>

            {items.length === 0 ? (
              <div className="px-2 text-xs text-muted-foreground">
                {t("external.noConversations")}
              </div>
            ) : (
              <div className="space-y-1">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                      "hover:bg-accent/50",
                      selectedId === item.id && "bg-accent"
                    )}
                  >
                    <div
                      className={cn(
                        "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold",
                        PLATFORM_STYLES[platform]
                      )}
                    >
                      {getPlatformLabel(platform, t).slice(0, 1)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "truncate text-sm",
                          selectedId === item.id ? "font-medium" : "font-normal",
                          item.unreadCount > 0 && "font-semibold"
                        )}>
                          {item.displayName}
                        </span>
                      </div>
                      {item.lastMessage?.content ? (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.lastMessage.content}
                        </p>
                      ) : null}
                    </div>

                    {item.unreadCount > 0 ? (
                      <Badge className="h-5 min-w-5 flex items-center justify-center rounded-full text-[10px] px-1.5">
                        {item.unreadCount > 99 ? "99+" : item.unreadCount}
                      </Badge>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="px-2">
        <Button variant="outline" size="sm" className="w-full" onClick={onConnect}>
          {t("external.connectPlatform")}
        </Button>
      </div>
    </div>
  );
}
