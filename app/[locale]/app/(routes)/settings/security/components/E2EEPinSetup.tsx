"use client";

import { useState } from "react";
import { Lock, AlertTriangle, Check, Loader2 } from "lucide-react";
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

function getPinStrength(pin: string): { label: string; color: string } {
  if (pin.length < 6) return { label: "Too short", color: "text-destructive" };
  if (pin.length < 7) return { label: "Good", color: "text-primary" };
  return { label: "Strong", color: "text-green-600" };
}

export function E2EEPinSetup() {
  const { isSetUp, isUnlocked, isLoading, setup, unlock, lock, error: e2eeError } = useE2EE();

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const pinStrength = getPinStrength(pin);
  const pinsMatch = pin.length >= 6 && pin === confirmPin;
  const canSubmit = pinsMatch && !isSubmitting;

  const handleSetup = async () => {
    if (!canSubmit) return;
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await setup(pin);
      // Auto-unlock after setup
      await unlock(pin);
      setSuccess(true);
      setPin("");
      setConfirmPin("");
      setShowSetup(false);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Setup failed");
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
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle>End-to-End Encryption</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking E2EE status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <CardTitle>End-to-End Encryption</CardTitle>
          {isSetUp && (
            <Badge variant={isUnlocked ? "default" : "secondary"}>
              {isUnlocked ? "Active" : "Set up"}
            </Badge>
          )}
        </div>
        <CardDescription>
          Protect your messages with a PIN-based encryption key.
          Messages are encrypted on your device before being sent.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isSetUp ? (
          // Already set up — show status and lock/unlock
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">
                  E2EE is {isUnlocked ? "active" : "locked"}
                </span>
              </div>
              {isUnlocked && (
                <Button variant="outline" size="sm" onClick={lock}>
                  Lock now
                </Button>
              )}
            </div>
            {isUnlocked && (
              <p className="text-xs text-muted-foreground">
                Your messages are encrypted end-to-end. Only you and the recipient can read them.
              </p>
            )}
            {!isUnlocked && (
              <p className="text-xs text-muted-foreground">
                Enter your PIN in the header lock icon to unlock E2EE messaging.
              </p>
            )}
          </div>
        ) : (
          // Not set up — show setup form
          <div className="space-y-4">
            {!showSetup ? (
              <Button onClick={() => setShowSetup(true)}>
                <Lock className="h-4 w-4 mr-2" />
                Set up E2EE PIN
              </Button>
            ) : (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> If you forget this PIN, your encrypted message
                    history cannot be recovered. Store it securely.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="e2ee-pin">PIN (4-8 digits)</Label>
                    <Input
                      id="e2ee-pin"
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
                    <Label htmlFor="e2ee-confirm-pin">Confirm PIN</Label>
                    <Input
                      id="e2ee-confirm-pin"
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

                <div className="flex gap-2">
                  <Button onClick={handleSetup} disabled={!canSubmit}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      "Enable E2EE"
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowSetup(false); setPin(""); setConfirmPin(""); }}>
                    Cancel
                  </Button>
                </div>
              </>
            )}

            {success && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  E2EE has been enabled successfully. Your messages are now encrypted end-to-end.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
