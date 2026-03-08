"use client";

import { useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useE2EE } from "@/hooks/useE2EE";
import { PinEntryDialog } from "@/components/e2ee/PinEntryDialog";

export function E2EESessionButton() {
  const { isSetUp, isUnlocked, unlock } = useE2EE();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Don't show button if E2EE isn't set up
  if (!isSetUp) return null;

  const handleUnlock = async (pin: string) => {
    await unlock(pin);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDialogOpen(true)}
          >
            {isUnlocked ? (
              <LockOpen className="h-4 w-4 text-green-600" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isUnlocked ? "E2EE active — click to re-enter PIN" : "Unlock E2EE messaging"}
        </TooltipContent>
      </Tooltip>

      <PinEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleUnlock}
      />
    </>
  );
}
