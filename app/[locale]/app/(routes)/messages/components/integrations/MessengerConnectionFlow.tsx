"use client";

import { useTranslations } from "next-intl";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function MessengerConnectionFlow({
  onConnected,
  onCancel,
}: {
  onConnected: () => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("messages");

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const redirectUri = baseUrl
    ? `${baseUrl}/api/messaging/integrations/connect/messenger/callback`
    : "";
  const scope = "pages_manage_metadata,pages_messaging,pages_read_engagement";

  const handleContinueWithFacebook = () => {
    if (!appId || !redirectUri) {
      return;
    }
    const state = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${state}`;
    globalThis.location.href = authUrl;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <img
          src="https://cdn.simpleicons.org/messenger"
          className="h-12 w-12"
          alt="Messenger"
          width={48}
          height={48}
        />
        <div>
          <h3 className="font-semibold text-lg">
            {t("external.messenger.preConnectionTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("external.messenger.preConnectionSubtitle")}
          </p>
        </div>
      </div>

      <Alert>
        <AlertTitle>{t("external.messenger.whatYouNeed")}</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>{t("external.messenger.whatYouNeed1")}</li>
            <li>{t("external.messenger.whatYouNeed2")}</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("external.messenger.howItWorks")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p>{t("external.messenger.howItWorks1")}</p>
          </div>
          <div className="flex gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p>{t("external.messenger.howItWorks2")}</p>
          </div>
          <div className="flex gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p>{t("external.messenger.howItWorks3")}</p>
          </div>
          <div className="flex gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p>{t("external.messenger.howItWorks4")}</p>
          </div>
        </CardContent>
      </Card>

      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <strong>Note:</strong> {t("external.messenger.pageNote")}
        </AlertDescription>
      </Alert>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleContinueWithFacebook}
          disabled={!appId || !redirectUri}
        >
          {t("external.messenger.continueWithFacebook")}
        </Button>
      </div>
    </div>
  );
}
