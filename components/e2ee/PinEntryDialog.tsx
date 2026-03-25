"use client";

import { useState } from "react";
import { Loader2, Lock, RefreshCw } from "lucide-react";
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

interface PinEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (pin: string) => Promise<void>;
}

export function PinEntryDialog({ open, onOpenChange, onSubmit }: PinEntryDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSubmit = async () => {
    if (pin.length < 6) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(pin);
      // Show brief syncing feedback before closing
      setIsSubmitting(false);
      setIsSyncing(true);
      await new Promise((r) => setTimeout(r, 800));
      setPin("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wrong PIN or unlock failed");
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && pin.length >= 6) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSubmitting && !isSyncing) { onOpenChange(v); setPin(""); setError(null); } }}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Unlock E2EE
          </DialogTitle>
          <DialogDescription>
            Enter your PIN to decrypt messages end-to-end.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="pin-entry">PIN</Label>
            <Input
              id="pin-entry"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={handleKeyDown}
              placeholder="Enter your PIN"
              className="mt-1"
              autoFocus
              disabled={isSubmitting || isSyncing}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => { onOpenChange(false); setPin(""); setError(null); }}
            disabled={isSubmitting || isSyncing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={pin.length < 6 || isSubmitting || isSyncing}
          >
            {isSubmitting && <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Unlocking...</>}
            {isSyncing && <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Syncing sessions...</>}
            {!isSubmitting && !isSyncing && "Unlock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
