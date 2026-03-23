"use client";

import { useState } from "react";
import { Lock, LockOpen, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useE2EE } from "@/hooks/useE2EE";
import { PinEntryDialog } from "@/components/e2ee/PinEntryDialog";
import { PinSetupDialog } from "@/components/e2ee/PinSetupDialog";

export function E2EESessionButton() {
  const { isSetUp, isUnlocked, isLoading, unlock, setup } = useE2EE();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Don't show while loading initial state
  if (isLoading) return null;

  const handleUnlock = async (pin: string) => {
    await unlock(pin);
  };

  const handleSetup = async (pin: string) => {
    await setup(pin);
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
            {!isSetUp ? (
              <ShieldAlert className="h-4 w-4 text-warning" />
            ) : isUnlocked ? (
              <LockOpen className="h-4 w-4 text-success" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {!isSetUp
            ? "Set up encryption PIN"
            : isUnlocked
              ? "E2EE active — click to re-enter PIN"
              : "Unlock E2EE"}
        </TooltipContent>
      </Tooltip>

      {isSetUp ? (
        <PinEntryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleUnlock}
        />
      ) : (
        <PinSetupDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSetup={handleSetup}
        />
      )}
    </>
  );
}
