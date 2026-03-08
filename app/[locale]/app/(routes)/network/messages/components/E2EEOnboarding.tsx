"use client";

import { useState } from "react";
import { Lock, AlertTriangle, Check, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useE2EE } from "@/hooks/useE2EE";

function getPinStrength(pin: string): { label: string; color: string } {
  if (pin.length < 4) return { label: "Too short", color: "text-destructive" };
  if (pin.length < 6) return { label: "Weak", color: "text-warning" };
  if (pin.length < 8) return { label: "Good", color: "text-primary" };
  return { label: "Strong", color: "text-green-600" };
}

/**
 * Full-page onboarding gate shown when user hasn't set up E2EE.
 * Blocks access to messaging until PIN is configured.
 */
export function E2EEOnboarding() {
  const { setup, unlock, error: e2eeError } = useE2EE();

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pinStrength = getPinStrength(pin);
  const pinsMatch = pin.length >= 4 && pin === confirmPin;
  const canSubmit = pinsMatch && !isSubmitting;

  const handleSetup = async () => {
    if (!canSubmit) return;
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await setup(pin);
      await unlock(pin);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || e2eeError;

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Set up End-to-End Encryption
          </h2>
          <p className="text-muted-foreground mt-2">
            Before you can use messaging, you need to create a PIN to protect
            your encryption keys. Messages are encrypted on your device — only
            you and the recipient can read them.
          </p>
        </div>

        <Alert variant="destructive" className="text-left">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> If you forget this PIN, your encrypted
            message history cannot be recovered. Store it securely.
          </AlertDescription>
        </Alert>

        <div className="space-y-3 text-left">
          <div>
            <Label htmlFor="onboard-pin">PIN (4-8 digits)</Label>
            <Input
              id="onboard-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter PIN"
              className="mt-1"
            />
            {pin.length > 0 && (
              <p className={`text-xs mt-1 ${pinStrength.color}`}>
                Strength: {pinStrength.label}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="onboard-confirm-pin">Confirm PIN</Label>
            <Input
              id="onboard-confirm-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Confirm PIN"
              className="mt-1"
            />
            {confirmPin.length > 0 && !pinsMatch && (
              <p className="text-xs mt-1 text-destructive">PINs do not match</p>
            )}
            {pinsMatch && (
              <p className="text-xs mt-1 text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> PINs match
              </p>
            )}
          </div>
        </div>

        {displayError && (
          <p className="text-sm text-destructive">{displayError}</p>
        )}

        <Button
          onClick={handleSetup}
          disabled={!canSubmit}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Setting up encryption...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Enable E2EE & Start Messaging
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
