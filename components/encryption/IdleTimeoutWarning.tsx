// @ts-nocheck — WIP: depends on EncryptionProvider (not yet wired)
"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useEncryption } from "@/components/providers/EncryptionProvider";
import { formatRemainingTime } from "@/hooks/use-idle-timer";

interface IdleTimeoutWarningProps {
  /** Warning threshold in seconds (default: 60) */
  warningThreshold?: number;
}

/**
 * Visual warning component that shows when encryption is about to auto-lock
 * 
 * Shows a progress bar and countdown when remaining time is below the threshold.
 * Displays prominently as an alert when under 60 seconds.
 */
export function IdleTimeoutWarning({ warningThreshold = 60 }: IdleTimeoutWarningProps) {
  const { isUnlocked, remainingTime, resetIdleTimer } = useEncryption();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (isUnlocked && remainingTime !== null && remainingTime <= warningThreshold) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [isUnlocked, remainingTime, warningThreshold]);

  if (!isUnlocked || !showWarning || remainingTime === null) {
    return null;
  }

  const progress = (remainingTime / warningThreshold) * 100;
  const isUrgent = remainingTime <= 30;

  return (
    <Alert 
      variant={isUrgent ? "destructive" : "default"}
      className="fixed bottom-4 right-4 w-96 z-50 shadow-lg animate-in slide-in-from-bottom-4"
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Session Timeout Warning
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>
          Your encryption session will lock in{" "}
          <strong>{formatRemainingTime(remainingTime * 1000)}</strong> due to inactivity.
        </p>
        
        <Progress value={progress} className="h-2" />
        
        <div className="flex justify-end">
          <Button 
            size="sm" 
            variant={isUrgent ? "destructive" : "default"}
            onClick={resetIdleTimer}
          >
            Stay Active
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Inline version of the timeout warning for embedding in pages
 */
export function IdleTimeoutBanner() {
  const { isUnlocked, remainingTime, resetIdleTimer, lock } = useEncryption();

  if (!isUnlocked || remainingTime === null) {
    return null;
  }

  // Only show when under 2 minutes
  if (remainingTime > 120) {
    return null;
  }

  const isUrgent = remainingTime <= 30;

  return (
    <div 
      className={`
        flex items-center justify-between p-3 rounded-lg mb-4
        ${isUrgent ? "bg-destructive/10 border border-destructive/20" : "bg-muted"}
      `}
    >
      <div className="flex items-center gap-3">
        <Clock className={`h-5 w-5 ${isUrgent ? "text-destructive animate-pulse" : "text-muted-foreground"}`} />
        <div>
          <p className={`text-sm font-medium ${isUrgent ? "text-destructive" : ""}`}>
            Auto-lock in {formatRemainingTime(remainingTime * 1000)}
          </p>
          <p className="text-xs text-muted-foreground">
            Move your mouse or press a key to stay active
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={lock}>
          Lock Now
        </Button>
        <Button size="sm" onClick={resetIdleTimer}>
          Stay Active
        </Button>
      </div>
    </div>
  );
}
