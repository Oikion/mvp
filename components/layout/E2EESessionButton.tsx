"use client";

import { useState } from "react";
import { Lock, LockOpen, RefreshCw, ShieldAlert } from "lucide-react";
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
  const { isSetUp, isUnlocked, isLoading, isSyncing, unlock, setup } = useE2EE();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Don't show while loading initial state, but keep mounted if dialog is open
  // (setup/unlock set isLoading too — unmounting would kill the dialog mid-operation)
  if (isLoading && !dialogOpen) return null;

  const handleUnlock = async (pin: string) => {
    await unlock(pin);
  };

  const handleSetup = async (pin: string) => {
    await setup(pin);
  };

  let statusIcon: JSX.Element;
  if (!isSetUp) {
    statusIcon = <ShieldAlert className="h-4 w-4 text-warning" />;
  } else if (isSyncing) {
    statusIcon = <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />;
  } else if (isUnlocked) {
    statusIcon = <LockOpen className="h-4 w-4 text-success" />;
  } else {
    statusIcon = <Lock className="h-4 w-4 text-muted-foreground" />;
  }

  let tooltipText: string;
  if (!isSetUp) {
    tooltipText = "Set up encryption PIN";
  } else if (isSyncing) {
    tooltipText = "Syncing encrypted sessions...";
  } else if (isUnlocked) {
    tooltipText = "E2EE active — click to re-enter PIN";
  } else {
    tooltipText = "Unlock E2EE";
  }

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
            {statusIcon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipText}
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
