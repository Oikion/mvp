"use client";

import { useState } from "react";
import { Lock, LockOpen, AlertTriangle, Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useE2EE } from "@/hooks/useE2EE";
import { PinEntryDialog } from "@/components/e2ee/PinEntryDialog";

function getPinStrength(pin: string, t: (key: string) => string): { label: string; color: string } {
  if (pin.length < 6) return { label: t("security.e2eeSettings.strengthTooShort"), color: "text-destructive" };
  if (pin.length < 7) return { label: t("security.e2eeSettings.strengthGood"), color: "text-primary" };
  return { label: t("security.e2eeSettings.strengthStrong"), color: "text-green-600" };
}

export function E2EEPinSetup() {
  const t = useTranslations("common");
  const { isSetUp, isUnlocked, isLoading, setup, unlock, lock, error: e2eeError } = useE2EE();

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);

  const pinStrength = getPinStrength(pin, (k: string) => t(k as Parameters<typeof t>[0]));
  const pinsMatch = pin.length >= 6 && pin === confirmPin;
  const canSubmit = pinsMatch && !isSubmitting;

  const handleSetup = async () => {
    if (!canSubmit) return;
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await setup(pin);
      await unlock(pin);
      setSuccess(true);
      setPin("");
      setConfirmPin("");
      setShowSetup(false);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t("security.e2eeSettings.setupFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || e2eeError;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
            <CardTitle>{t("security.e2eeSettings.title")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>{t("security.e2eeSettings.checkingStatus")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
          <CardTitle>{t("security.e2eeSettings.title")}</CardTitle>
          {isSetUp && (
            <Badge variant={isUnlocked ? "default" : "secondary"}>
              {isUnlocked ? t("security.e2eeSettings.badgeActive") : t("security.e2eeSettings.badgeSetUp")}
            </Badge>
          )}
        </div>
        <CardDescription>
          {t("security.e2eeSettings.description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isSetUp ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                {isUnlocked ? (
                  <LockOpen className="h-4 w-4 text-success" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                )}
                <span className="text-sm font-medium">
                  {isUnlocked ? t("security.e2eeSettings.statusActive") : t("security.e2eeSettings.statusSetUp")}
                </span>
              </div>
              {isUnlocked ? (
                <Button variant="outline" size="sm" onClick={lock}>
                  {t("security.e2eeSettings.lockNow")}
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setUnlockDialogOpen(true)}>
                  <LockOpen className="h-4 w-4 mr-2" aria-hidden="true" />
                  {t("security.e2eeSettings.unlockButton")}
                </Button>
              )}
            </div>
            {isUnlocked && (
              <p className="text-xs text-muted-foreground">
                {t("security.e2eeSettings.unlockedInfo")}
              </p>
            )}
            <PinEntryDialog
              open={unlockDialogOpen}
              onOpenChange={setUnlockDialogOpen}
              onSubmit={unlock}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {!showSetup ? (
              <Button onClick={() => setShowSetup(true)}>
                <Lock className="h-4 w-4 mr-2" aria-hidden="true" />
                {t("security.e2eeSettings.setupButton")}
              </Button>
            ) : (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>
                    <strong>{t("security.e2eeSettings.setupWarningImportant")}</strong>{" "}
                    {t("security.e2eeSettings.setupWarning")}
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="e2ee-pin">{t("security.e2eeSettings.pinLabel")}</Label>
                    <Input
                      id="e2ee-pin"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                      placeholder={t("security.e2eeSettings.pinPlaceholder")}
                      className="mt-1"
                    />
                    {pin.length > 0 && (
                      <p className={`text-xs mt-1 ${pinStrength.color}`}>
                        {t("security.e2eeSettings.strengthLabel", { strength: pinStrength.label })}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="e2ee-confirm-pin">{t("security.e2eeSettings.confirmPinLabel")}</Label>
                    <Input
                      id="e2ee-confirm-pin"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                      placeholder={t("security.e2eeSettings.confirmPinPlaceholder")}
                      className="mt-1"
                    />
                    {confirmPin.length > 0 && !pinsMatch && (
                      <p className="text-xs mt-1 text-destructive">{t("security.e2eeSettings.pinsMismatch")}</p>
                    )}
                    {pinsMatch && (
                      <p className="text-xs mt-1 text-green-600 flex items-center gap-1">
                        <Check className="h-3 w-3" aria-hidden="true" /> {t("security.e2eeSettings.pinsMatch")}
                      </p>
                    )}
                  </div>
                </div>

                {displayError && (
                  <p className="text-sm text-destructive">{displayError}</p>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleSetup} disabled={!canSubmit}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                        {t("security.e2eeSettings.settingUp")}
                      </>
                    ) : (
                      t("security.e2eeSettings.enableE2EE")
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowSetup(false); setPin(""); setConfirmPin(""); }}>
                    {t("security.e2eeSettings.cancel")}
                  </Button>
                </div>
              </>
            )}

            {success && (
              <Alert>
                <Check className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  {t("security.e2eeSettings.setupSuccessMessage")}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
