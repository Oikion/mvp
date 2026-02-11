"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle,
  ChevronRight,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppToast } from "@/hooks/use-app-toast";

type Step = 1 | 2 | 3 | 4;

interface BotInfo {
  id: string;
  name: string;
  uri?: string;
}

interface ViberConnectionFormProps {
  onConnected: () => void;
  onCancel?: () => void;
}

export function ViberConnectionForm({ onConnected, onCancel }: ViberConnectionFormProps) {
  const t = useTranslations("messages");
  const { toast } = useAppToast();
  const [step, setStep] = useState<Step>(1);
  const [accessToken, setAccessToken] = useState("");
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleValidateToken = async () => {
    if (!accessToken.trim()) return;
    setError(null);
    setIsValidating(true);
    try {
      const res = await fetch("/api/messaging/integrations/connect/viber/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: accessToken.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "Invalid token");
        return;
      }
      const payload = json?.data ?? json;
      setBotInfo({
        id: payload.id ?? "",
        name: payload.name ?? "",
        uri: payload.uri,
      });
      setStep(3);
    } catch {
      setError("Validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  const step3Started = useRef(false);

  const handleConnect = async () => {
    if (!accessToken.trim()) return false;
    setError(null);
    try {
      const res = await fetch("/api/messaging/integrations/connect/viber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: accessToken.trim(),
          platformAccountId: botInfo?.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Connection failed");
        return false;
      }
      toast.success("connectionSuccess");
      setStep(4);
      return true;
    } catch {
      setError("Connection failed");
      return false;
    }
  };

  // Step 3: run connect once when we enter step 3 (webhook setup then success)
  useEffect(() => {
    if (step !== 3 || step3Started.current || !accessToken.trim()) return;
    step3Started.current = true;
    handleConnect();
  }, [step, accessToken]);

  const onDone = () => {
    onConnected();
  };

  return (
    <div className="space-y-4">
      {/* Step 1: Create bot instructions */}
      {step === 1 && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span aria-hidden>Step 1 of 3</span>
          </div>
          <Alert>
            <MessageSquare className="h-4 w-4" />
            <AlertTitle>{t("external.viber.step1Title")}</AlertTitle>
            <AlertDescription>{t("external.viber.step1Description")}</AlertDescription>
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("external.viber.step1InstructionTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  1
                </div>
                <div>
                  <p className="font-medium">{t("external.viber.step1Instruction1Title")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("external.viber.step1Instruction1Body")}{" "}
                    <a
                      href="https://partners.viber.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      partners.viber.com
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  2
                </div>
                <div>
                  <p className="font-medium">{t("external.viber.step1Instruction2Title")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("external.viber.step1Instruction2Body")}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  3
                </div>
                <div>
                  <p className="font-medium">{t("external.viber.step1Instruction3Title")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("external.viber.step1Instruction3Body")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={() => setStep(2)}>
              {t("external.viber.step1Next")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Step 2: Token input + validate */}
      {step === 2 && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-600" aria-hidden />
            <span>Step 1 complete</span>
            <ChevronRight className="h-4 w-4" />
            <span>Step 2 of 3</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="viber-token">{t("external.viber.step2Label")}</Label>
            <Input
              id="viber-token"
              type="password"
              placeholder={t("external.viber.tokenPlaceholder")}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">{t("external.viber.step2Hint")}</p>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("external.back")}
            </Button>
            <Button
              type="button"
              onClick={handleValidateToken}
              disabled={!accessToken.trim() || isValidating}
            >
              {isValidating ? t("external.viber.step2Validating") : t("external.viber.step2Validate")}
            </Button>
          </div>
        </>
      )}

      {/* Step 3: Webhook setup (loading) - we trigger connect in effect above; show loading UI */}
      {step === 3 && (
        <>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Token validated successfully</span>
          </div>
          {botInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bot details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bot name</span>
                  <span className="font-medium">{botInfo.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bot ID</span>
                  <span className="font-mono text-xs">{botInfo.id}</span>
                </div>
              </CardContent>
            </Card>
          )}
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>{t("external.viber.step3SettingUp")}</AlertDescription>
          </Alert>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
              <Button type="button" variant="outline" size="sm" onClick={() => setError(null)}>
                Retry
              </Button>
            </Alert>
          )}
        </>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-500/10 p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t("external.viber.successTitle")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("external.viber.successDescription")}
              </p>
            </div>
            <Card>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span>{t("external.viber.successSync")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span>{t("external.viber.successNotifications")}</span>
                </div>
              </CardContent>
            </Card>
            <Button onClick={onDone} className="w-full">
              {t("external.viber.done")}
            </Button>
          </div>
      )}
    </div>
  );
}
