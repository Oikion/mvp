"use client";

import { useState } from "react";
import { Loader2, KeyRound, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAppToast } from "@/hooks/use-app-toast";

interface PinSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetup: (pin: string) => Promise<void>;
}

export function PinSetupDialog({ open, onOpenChange, onSetup }: PinSetupDialogProps) {
  const t = useTranslations("common.e2ee");
  const { toast } = useAppToast();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pinValid = pin.length >= 6 && pin.length <= 8;
  const pinsMatch = pin === confirmPin;
  const canSubmit = pinValid && pinsMatch && !isSubmitting;

  function getPinStrength(): { label: string; color: string } | null {
    if (pin.length < 6) return null;
    if (pin.length < 7) return { label: t("strengthGood"), color: "text-primary" };
    return { label: t("strengthStrong"), color: "text-success" };
  }

  const strength = getPinStrength();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onSetup(pin);
      toast.success(t("setupSuccess"), { isTranslationKey: false });
      setPin("");
      setConfirmPin("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("setupError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      setPin("");
      setConfirmPin("");
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("setupTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("setupDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="pin-setup">{t("pinLabel")}</Label>
            <Input
              id="pin-setup"
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replaceAll(/\D/g, ""))}
              placeholder={t("setupPinPlaceholder")}
              className="mt-1"
              autoFocus
              disabled={isSubmitting}
            />
            {strength && (
              <p className={cn("text-xs mt-1", strength.color)}>{strength.label}</p>
            )}
          </div>

          <div>
            <Label htmlFor="pin-confirm">{t("confirmPinLabel")}</Label>
            <Input
              id="pin-confirm"
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replaceAll(/\D/g, ""))}
              placeholder={t("confirmPinPlaceholder")}
              className="mt-1"
              disabled={isSubmitting}
            />
            {confirmPin.length > 0 && !pinsMatch && (
              <p className="text-xs text-destructive mt-1">{t("pinMismatch")}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <p className="text-xs text-muted-foreground">
            {t("pinInfo")}
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("creating")}
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4 mr-1" />
                {t("createPin")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
