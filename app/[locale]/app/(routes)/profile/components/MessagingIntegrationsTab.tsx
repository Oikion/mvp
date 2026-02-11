"use client";

import { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { MessagingPlatform, PLATFORM_INFO } from "@/types/messaging";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";
import { useExternalIntegrations } from "@/hooks/swr/useExternalIntegrations";
import { PlatformStatusBadge } from "@/app/[locale]/app/(routes)/messages/components/integrations/PlatformStatusBadge";

const PLATFORM_LABELS: Record<MessagingPlatform, string> = {
  VIBER: "external.platforms.viber",
  WHATSAPP: "external.platforms.whatsapp",
  MESSENGER: "external.platforms.messenger",
};

export function MessagingIntegrationsTab() {
  const t = useTranslations("messages");
  const format = useFormatter();
  const { toast } = useAppToast();
  const { integrations, refresh, isLoading } = useExternalIntegrations();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const webhookUrls = useMemo(() => ({
    VIBER: baseUrl ? `${baseUrl}/api/messaging/webhooks/viber` : "",
    WHATSAPP: baseUrl ? `${baseUrl}/api/messaging/webhooks/whatsapp` : "",
    MESSENGER: baseUrl ? `${baseUrl}/api/messaging/webhooks/messenger` : "",
  }), [baseUrl]);

  const handleDisconnect = async (integrationId: string) => {
    try {
      const res = await fetch(`/api/messaging/integrations/${integrationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to disconnect");
      }

      toast.success("deleteSuccess");
      refresh();
    } catch (error) {
      console.error("[MESSAGING_INTEGRATIONS_DISCONNECT]", error);
      toast.error("deleteFailed");
    }
  };

  let content = (
    <div className="space-y-3">
      {integrations.map((integration) => (
        <div key={integration.id} className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {PLATFORM_INFO[integration.platform] && (
                <img
                  src={PLATFORM_INFO[integration.platform].icon}
                  alt=""
                  className="h-5 w-5"
                  width={20}
                  height={20}
                />
              )}
              <div>
                <div className="text-sm font-medium">
                  {t(PLATFORM_LABELS[integration.platform])}
                </div>
                {integration.displayName ? (
                  <div className="text-xs text-muted-foreground">{integration.displayName}</div>
                ) : null}
              </div>
            </div>
            <PlatformStatusBadge
              status={integration.isActive ? "connected" : "disconnected"}
              label={integration.isActive ? t("external.status.connected") : t("external.status.disconnected")}
            />
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            {webhookUrls[integration.platform] ? (
              <div>
                {t("integrations.webhookLabel")}: {webhookUrls[integration.platform]}
              </div>
            ) : null}
            {integration.lastSyncAt ? (
              <div>
                {t("integrations.lastSync")}:{" "}
                {format.dateTime(new Date(integration.lastSyncAt), { dateStyle: "medium", timeStyle: "short" })}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDisconnect(integration.id)}
            >
              {t("integrations.disconnect")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    content = <div className="text-sm text-muted-foreground">{t("integrations.loading")}</div>;
  } else if (integrations.length === 0) {
    content = <div className="text-sm text-muted-foreground">{t("integrations.empty")}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-base font-medium">{t("integrations.sectionTitle")}</h4>
        <p className="text-sm text-muted-foreground">{t("integrations.sectionDescription")}</p>
      </div>

      {content}
    </div>
  );
}
