"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OnboardingPrivacyPreferences, ProfileVisibility } from "@/types/onboarding";
import {
  Lock,
  Shield,
  ShieldCheck,
  Globe,
  BarChart3,
  KeyRound,
  Check,
  Loader2,
} from "lucide-react";

interface SecurityPrivacyStepDict {
  title: string;
  description: string;
  security: {
    title: string;
    description: string;
    pinLabel: string;
    pinPlaceholder: string;
    confirmLabel: string;
    confirmPlaceholder: string;
    strengthWeak: string;
    strengthGood: string;
    strengthStrong: string;
    mismatch: string;
    setupButton: string;
    skipButton: string;
    setupSuccess: string;
    setupError: string;
    alreadySetUp: string;
    info: string;
  };
  profileVisibility: {
    title: string;
    description: string;
    options: {
      personal: { title: string; description: string };
      secure: { title: string; description: string };
      public: { title: string; description: string };
    };
  };
  analytics: {
    title: string;
    description: string;
    label: string;
  };
}

interface SecurityPrivacyStepProps {
  dict: SecurityPrivacyStepDict;
  data: OnboardingPrivacyPreferences;
  onDataChange: (data: OnboardingPrivacyPreferences) => void;
  onPinStatusChange?: (isSetUp: boolean) => void;
}

const VISIBILITY_OPTIONS: Array<{
  value: ProfileVisibility;
  key: "personal" | "secure" | "public";
  icon: typeof Lock;
  color: string;
  bgColor: string;
}> = [
  { value: "PRIVATE", key: "personal", icon: Lock, color: "text-muted-foreground", bgColor: "bg-gray-500/10" },
  { value: "SECURE", key: "secure", icon: Shield, color: "text-warning", bgColor: "bg-warning/10" },
  { value: "PUBLIC", key: "public", icon: Globe, color: "text-success", bgColor: "bg-success/10" },
];

function getPinStrength(pin: string): { label: string; key: "weak" | "good" | "strong"; color: string } {
  if (pin.length < 6) return { label: "weak", key: "weak", color: "text-warning" };
  if (pin.length < 8) return { label: "good", key: "good", color: "text-primary" };
  return { label: "strong", key: "strong", color: "text-success" };
}

export function SecurityPrivacyStep({ dict, data, onDataChange, onPinStatusChange }: SecurityPrivacyStepProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinExists, setPinExists] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check if user already has a PIN (e.g., from a previous onboarding attempt)
  useEffect(() => {
    async function checkIdentity() {
      try {
        const res = await fetch("/api/e2ee/identity");
        if (res.ok) {
          const data = await res.json();
          if (data.isSetUp) {
            setPinExists(true);
            onPinStatusChange?.(true);
          }
        }
      } catch {
        // Not set up — show form
      } finally {
        setIsChecking(false);
      }
    }
    checkIdentity();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pinValid = pin.length >= 6 && pin.length <= 8;
  const pinsMatch = pin === confirmPin;
  const canSubmit = pinValid && pinsMatch && !isSubmitting;
  const strength = pin.length >= 6 ? getPinStrength(pin) : null;

  const handleSetup = async () => {
    if (!canSubmit) return;
    setSetupError(null);
    setIsSubmitting(true);
    try {
      const pepperRes = await fetch("/api/e2ee/pepper");
      if (!pepperRes.ok) throw new Error("Failed to fetch pepper");
      const { pepper } = await pepperRes.json();

      const e2ee = await import("@/lib/e2ee");
      const result = await e2ee.setupIdentity(pin, pepper);

      const setupRes = await fetch("/api/e2ee/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: result.publicKey,
          wrappedPrivateKey: result.wrappedPrivateKey,
          salt: result.salt,
          pbkdfIterations: 600_000,
          signedPreKey: result.signedPreKey,
          oneTimePreKeys: result.oneTimePreKeys.map((k) => k.publicKey),
        }),
      });
      if (!setupRes.ok) throw new Error("Failed to upload identity");

      setSetupSuccess(true);
      setPinExists(true);
      setPin("");
      setConfirmPin("");
      onPinStatusChange?.(true);
    } catch {
      setSetupError(dict.security.setupError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVisibilityChange = (visibility: ProfileVisibility) => {
    onDataChange({ ...data, profileVisibility: visibility });
  };

  const handleAnalyticsToggle = () => {
    onDataChange({ ...data, analyticsConsent: !data.analyticsConsent });
  };

  const pinIsReady = pinExists || setupSuccess;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold mb-2">{dict.title}</h2>
        <p className="text-muted-foreground">{dict.description}</p>
      </motion.div>

      {/* Security — E2EE PIN Setup */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-3"
      >
        <Label className="text-base font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {dict.security.title}
        </Label>
        <p className="text-sm text-muted-foreground">{dict.security.description}</p>

        {isChecking ? (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Checking security status...</span>
            </div>
          </Card>
        ) : pinIsReady ? (
          <Card className="p-4 border-success/50 bg-success/5">
            <div className="flex items-center gap-2 text-success">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">
                {setupSuccess ? dict.security.setupSuccess : dict.security.alreadySetUp}
              </span>
            </div>
          </Card>
        ) : (
          <Card className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">{dict.security.info}</p>

            <div className="space-y-2">
              <Label className="text-sm">{dict.security.pinLabel}</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={8}
                placeholder={dict.security.pinPlaceholder}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
              {strength && (
                <p className={cn("text-xs", strength.color)}>
                  {dict.security[`strength${strength.key.charAt(0).toUpperCase()}${strength.key.slice(1)}` as keyof typeof dict.security]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{dict.security.confirmLabel}</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={8}
                placeholder={dict.security.confirmPlaceholder}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              />
              {confirmPin.length > 0 && !pinsMatch && (
                <p className="text-xs text-destructive">{dict.security.mismatch}</p>
              )}
            </div>

            {setupError && (
              <p className="text-xs text-destructive">{setupError}</p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSetup}
                disabled={!canSubmit}
                className="flex-1"
                size="sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 mr-1" />
                    {dict.security.setupButton}
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}
      </motion.div>

      {/* Profile Visibility */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="space-y-3"
      >
        <Label className="text-base font-semibold">{dict.profileVisibility.title}</Label>
        <p className="text-sm text-muted-foreground">{dict.profileVisibility.description}</p>

        <div className="grid gap-2 px-1">
          {VISIBILITY_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            const isSelected = data.profileVisibility === option.value;
            const optionDict = dict.profileVisibility.options[option.key];

            return (
              <motion.div
                key={option.value}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.25 + index * 0.05 }}
              >
                <Card
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  className={cn(
                    "p-3 cursor-pointer transition-all",
                    isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                  onClick={() => handleVisibilityChange(option.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleVisibilityChange(option.value);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", option.bgColor)}>
                      <Icon className={cn("w-4 h-4", option.color)} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{optionDict.title}</p>
                      <p className="text-xs text-muted-foreground">{optionDict.description}</p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center",
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                    )}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Analytics Consent */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <BarChart3 className="w-4 h-4 text-success" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{dict.analytics.title}</p>
                  <p className="text-xs text-muted-foreground">{dict.analytics.description}</p>
                </div>
                <Switch
                  checked={data.analyticsConsent}
                  onCheckedChange={handleAnalyticsToggle}
                  aria-label={dict.analytics.title}
                />
              </div>
              <Label className="text-sm cursor-pointer" onClick={handleAnalyticsToggle}>
                {dict.analytics.label}
              </Label>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
