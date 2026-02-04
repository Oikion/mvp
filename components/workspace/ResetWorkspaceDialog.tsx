// @ts-nocheck
// TODO: Fix type errors
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppToast } from "@/hooks/use-app-toast";
import { resetPersonalWorkspace } from "@/actions/organization/reset-personal-workspace";

interface ResetWorkspaceDialogProps {
  readonly trigger?: React.ReactNode;
}

export function ResetWorkspaceDialog({ trigger }: ResetWorkspaceDialogProps) {
  const router = useRouter();
  const t = useTranslations("workspace");
  const tCommon = useTranslations("common");
  const { toast } = useAppToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const confirmPhrase = "RESET";
  const isConfirmed = confirmText.toUpperCase() === confirmPhrase;

  const handleReset = async () => {
    if (!isConfirmed) return;

    setIsResetting(true);
    try {
      const result = await resetPersonalWorkspace();

      if (result.error) {
        toast.error(tCommon, { description: result.error, isTranslationKey: false });
        return;
      }

      toast.success(tCommon, { description: t, isTranslationKey: false });

      setOpen(false);
      setConfirmText("");
      router.refresh();
    } catch (error) {
      console.error("Error resetting workspace:", error);
      toast.error(tCommon, { description: tCommon, isTranslationKey: false });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {t("resetWorkspace")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t("resetWorkspace")}
          </DialogTitle>
          <DialogDescription className="text-left">
            {t("resetConfirm")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 mb-4">
            <p className="text-sm text-destructive font-medium mb-2">
              {t("resetWarningTitle")}
            </p>
            <ul className="text-sm text-destructive/80 list-disc list-inside space-y-1">
              <li>{t("resetWarningClients")}</li>
              <li>{t("resetWarningProperties")}</li>
              <li>{t("resetWarningDocuments")}</li>
              <li>{t("resetWarningTasks")}</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-reset">
              {t("resetTypeConfirm", { phrase: confirmPhrase })}
            </Label>
            <Input
              id="confirm-reset"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmPhrase}
              className="font-mono"
              disabled={isResetting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isResetting}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={!isConfirmed || isResetting}
          >
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tCommon("loading")}
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("resetWorkspace")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
