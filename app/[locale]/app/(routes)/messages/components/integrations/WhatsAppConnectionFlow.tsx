"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { MESSAGING_ERRORS } from "@/lib/messaging-errors";
import { MessagingPlatform } from "@/types/messaging";

interface FacebookSDK {
  init: (params: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
  login: (
    callback: (response: { authResponse?: { code?: string } }) => void,
    options: { config_id: string; response_type: string; override_default_response_type: boolean; extras?: object }
  ) => void;
}

interface GlobalWithFB {
  fbAsyncInit?: () => void;
  FB?: FacebookSDK;
  addEventListener: typeof globalThis.addEventListener;
  removeEventListener: typeof globalThis.removeEventListener;
}

type Step = "pre" | "connecting" | "success" | "error";

interface EmbeddedSignupData {
  phoneNumberId?: string;
  wabaId?: string;
  businessId?: string;
}

export function WhatsAppConnectionFlow({
  onConnected,
  onCancel,
}: {
  onConnected: () => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("messages");
  const { toast } = useAppToast();
  const [step, setStep] = useState<Step>("pre");
  const [embeddedData, setEmbeddedData] = useState<EmbeddedSignupData>({});
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const connectingStarted = useRef(false);

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID;

  // Load Facebook SDK
  useEffect(() => {
    const g = globalThis as unknown as GlobalWithFB & { window?: unknown };
    if (g.window === undefined || g.FB) return;
    g.fbAsyncInit = function () {
      if (g.FB && appId) {
        g.FB.init({
          appId,
          cookie: true,
          xfbml: true,
          version: "v18.0",
        });
      }
    };
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  }, [appId]);

  // Listen for WA_EMBEDDED_SIGNUP message event (phone_number_id, waba_id)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.origin?.endsWith("facebook.com")) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type !== "WA_EMBEDDED_SIGNUP" || data?.event !== "FINISH") return;
        const payload = data?.data ?? {};
        setEmbeddedData({
          phoneNumberId: payload.phone_number_id,
          wabaId: payload.waba_id,
          businessId: payload.business_id,
        });
      } catch {
        // ignore
      }
    };
    globalThis.addEventListener("message", handler);
    return () => globalThis.removeEventListener("message", handler);
  }, []);

  // When we have both code and phoneNumberId, call connect API
  useEffect(() => {
    if (
      step !== "connecting" ||
      connectingStarted.current ||
      !authCode ||
      !embeddedData.phoneNumberId
    ) {
      return;
    }
    connectingStarted.current = true;

    (async () => {
      try {
        const res = await fetch("/api/messaging/integrations/connect/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: authCode,
            phoneNumberId: embeddedData.phoneNumberId,
            wabaId: embeddedData.wabaId,
          }),
        });
        const json = await res.json().catch(() => null);
        const integration = json?.data?.integration;

        if (!res.ok) {
          setErrorCode(
            json?.error?.code === "USER_CANCELLED" || res.status === 400 ? "USER_CANCELLED" : "CONNECTION_FAILED"
          );
          setStep("error");
          return;
        }

        setBusinessName(integration?.displayName ?? "WhatsApp Business");
        setPhoneNumber(integration?.phoneNumber ?? "");
        setStep("success");
        toast.success("connectionSuccess");
      } catch {
        setErrorCode("CONNECTION_FAILED");
        setStep("error");
      } finally {
        connectingStarted.current = false;
      }
    })();
  }, [step, authCode, embeddedData.phoneNumberId, embeddedData.wabaId, toast]);

  const handleContinueWithFacebook = () => {
    const g = globalThis as unknown as GlobalWithFB;
    if (!g.FB || !configId) {
      toast.error("WhatsApp connection is not configured");
      return;
    }
    setAuthCode(null);
    setEmbeddedData({});
    setErrorCode(null);
    connectingStarted.current = false;
    setStep("connecting");

    g.FB!.login(
      (response) => {
        if (response.authResponse?.code) {
          setAuthCode(response.authResponse.code);
        } else {
          setErrorCode("USER_CANCELLED");
          setStep("error");
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {} },
      }
    );
  };

  const errorInfo =
    errorCode && MESSAGING_ERRORS[MessagingPlatform.WHATSAPP][errorCode]
      ? MESSAGING_ERRORS[MessagingPlatform.WHATSAPP][errorCode]
      : MESSAGING_ERRORS[MessagingPlatform.WHATSAPP].USER_CANCELLED;

  return (
    <div className="space-y-4">
      {step === "pre" && (
        <>
          <div className="flex items-center gap-3">
            <img
              src="https://cdn.simpleicons.org/whatsapp"
              className="h-12 w-12"
              alt="WhatsApp"
              width={48}
              height={48}
            />
            <div>
              <h3 className="font-semibold text-lg">
                {t("external.whatsapp.preConnectionTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("external.whatsapp.preConnectionSubtitle")}
              </p>
            </div>
          </div>

          <Alert>
            <AlertTitle>{t("external.whatsapp.whatYouNeed")}</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>{t("external.whatsapp.whatYouNeed1")}</li>
                <li>{t("external.whatsapp.whatYouNeed2")}</li>
                <li>{t("external.whatsapp.whatYouNeed3")}</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("external.whatsapp.howItWorks")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p>{t("external.whatsapp.howItWorks1")}</p>
              </div>
              <div className="flex gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p>{t("external.whatsapp.howItWorks2")}</p>
              </div>
              <div className="flex gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p>{t("external.whatsapp.howItWorks3")}</p>
              </div>
              <div className="flex gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p>{t("external.whatsapp.howItWorks4")}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleContinueWithFacebook}>
              {t("external.whatsapp.continueWithFacebook")}
            </Button>
          </div>
        </>
      )}

      {step === "connecting" && (
        <div className="space-y-4 text-center py-8">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <div>
            <h3 className="font-semibold">
              {t("external.whatsapp.connectingTitle")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("external.whatsapp.connectingSubtitle")}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("external.whatsapp.connectingHint")}
          </p>
        </div>
      )}

      {step === "success" && (
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-500/10 p-3">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {t("external.whatsapp.successTitle")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("external.whatsapp.successDescription")}
            </p>
          </div>
          <Card>
            <CardContent className="pt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("external.whatsapp.businessName")}:
                </span>
                <span className="font-medium">{businessName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("external.whatsapp.phoneNumberLabel")}:
                </span>
                <span className="font-medium">{phoneNumber || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                  {t("external.whatsapp.statusActive")}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              {t("external.whatsapp.successNote")}
            </AlertDescription>
          </Alert>
          <Button onClick={onConnected} className="w-full">
            {t("external.whatsapp.startMessaging")}
          </Button>
        </div>
      )}

      {step === "error" && (
        <Alert variant="destructive">
            <AlertTitle>{errorInfo.title}</AlertTitle>
            <AlertDescription>
              {errorInfo.message}
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStep("pre");
                    setErrorCode(null);
                  }}
                >
                  {errorInfo.action}
                </Button>
                {errorInfo.helpUrl && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={errorInfo.helpUrl} target="_blank" rel="noopener noreferrer">
                      Learn more
                    </a>
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
      )}
    </div>
  );
}
