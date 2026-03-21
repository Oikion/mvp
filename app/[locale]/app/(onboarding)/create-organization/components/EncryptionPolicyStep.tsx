"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Shield, ShieldCheck, Lock, AlertTriangle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EncryptionPolicyStepProps {
  data: { encryptionMode: "STANDARD" | "E2EE" | null };
  onDataChange: (data: { encryptionMode: "STANDARD" | "E2EE" }) => void;
  onValidationChange: (isValid: boolean) => void;
}

function getPinStrength(pin: string): { label: string; color: string } {
  if (pin.length < 4) return { label: "Too short", color: "text-destructive" };
  if (pin.length < 6) return { label: "Weak", color: "text-warning" };
  if (pin.length < 8) return { label: "Good", color: "text-primary" };
  return { label: "Strong", color: "text-green-600" };
}

export function EncryptionPolicyStep({
  data,
  onDataChange,
  onValidationChange,
}: EncryptionPolicyStepProps) {
  const t = useTranslations("createOrganization");

  // E2EE PIN state
  const [isCheckingPin, setIsCheckingPin] = useState(false);
  const [pinExists, setPinExists] = useState(false);
  const [pinReady, setPinReady] = useState(false);

  // PIN creation form state
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState(false);

  const pinStrength = getPinStrength(pin);
  const pinsMatch = pin.length >= 4 && pin === confirmPin;
  const canSubmit = pinsMatch && !isSubmitting;

  // Check if user already has E2EE identity
  useEffect(() => {
    if (data.encryptionMode !== "E2EE") return;

    let cancelled = false;
    setIsCheckingPin(true);

    fetch("/api/e2ee/identity")
      .then((res) => {
        if (!cancelled) {
          const exists = res.ok;
          setPinExists(exists);
          setPinReady(exists);
          setIsCheckingPin(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPinExists(false);
          setPinReady(false);
          setIsCheckingPin(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [data.encryptionMode]);

  // Notify parent of validation state
  useEffect(() => {
    const mode = data.encryptionMode;
    const isValid =
      mode !== null && (mode === "STANDARD" || pinReady);
    onValidationChange(isValid);
  }, [data.encryptionMode, pinReady, onValidationChange]);

  const handleSetup = async () => {
    if (!canSubmit) return;
    setSetupError(null);
    setIsSubmitting(true);
    try {
      // Fetch pepper from server
      const pepperRes = await fetch("/api/e2ee/pepper");
      if (!pepperRes.ok) throw new Error("Failed to fetch pepper");
      const { pepper } = await pepperRes.json();

      // Dynamic import to avoid loading heavy crypto on non-E2EE pages
      const e2ee = await import("@/lib/e2ee");
      const result = await e2ee.setupIdentity(pin, pepper);

      // Upload to server
      const setupRes = await fetch("/api/e2ee/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: result.publicKey,
          wrappedPrivateKey: result.wrappedPrivateKey,
          salt: result.salt,
          pbkdfIterations: 100_000,
          signedPreKey: result.signedPreKey,
          oneTimePreKeys: result.oneTimePreKeys.map((k) => k.publicKey),
        }),
      });
      if (!setupRes.ok) throw new Error("Failed to upload identity");

      setSetupSuccess(true);
      setPinReady(true);
      setPinExists(true);
      setPin("");
      setConfirmPin("");
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const options = [
    {
      mode: "STANDARD" as const,
      icon: Shield,
      title: t("encryption.standardTitle"),
      description: t("encryption.standardDescription"),
    },
    {
      mode: "E2EE" as const,
      icon: ShieldCheck,
      title: t("encryption.enhancedTitle"),
      description: t("encryption.enhancedDescription"),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center flex-shrink-0 mb-4"
      >
        <h2 className="text-2xl font-bold mb-2">{t("encryption.title")}</h2>
        <p className="text-muted-foreground">{t("encryption.description")}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 overflow-y-auto space-y-4 pr-2"
      >
        {/* Mode selector cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map(({ mode, icon: Icon, title, description }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onDataChange({ encryptionMode: mode })}
              className={cn(
                "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
                "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                data.encryptionMode === mode
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <span className="font-medium">{title}</span>
              </div>
              <span className="text-sm text-muted-foreground">{description}</span>
            </button>
          ))}
        </div>

        {/* E2EE PIN section */}
        {data.encryptionMode === "E2EE" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-lg border p-4 space-y-4"
          >
            {isCheckingPin ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span className="text-sm">Checking encryption status...</span>
              </div>
            ) : pinExists || setupSuccess ? (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm font-medium">{t("encryption.pinExists")}</span>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="font-medium text-sm mb-1 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
                    {t("encryption.pinCreateTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("encryption.pinRequired")}
                  </p>
                </div>

                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>
                    If you forget this PIN, your encrypted data cannot be recovered. Store it securely.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="enc-pin">PIN (4–8 digits)</Label>
                    <Input
                      id="enc-pin"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter PIN"
                    />
                    {pin.length > 0 && (
                      <p className={cn("text-xs", pinStrength.color)}>
                        Strength: {pinStrength.label}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="enc-confirm-pin">Confirm PIN</Label>
                    <Input
                      id="enc-confirm-pin"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="Confirm PIN"
                    />
                    {confirmPin.length > 0 && !pinsMatch && (
                      <p className="text-xs text-destructive">PINs do not match</p>
                    )}
                    {pinsMatch && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="h-3 w-3" aria-hidden="true" /> PINs match
                      </p>
                    )}
                  </div>
                </div>

                {setupError && (
                  <p className="text-sm text-destructive">{setupError}</p>
                )}

                <Button
                  onClick={handleSetup}
                  disabled={!canSubmit}
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      Setting up...
                    </>
                  ) : (
                    "Enable E2EE"
                  )}
                </Button>
              </>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
