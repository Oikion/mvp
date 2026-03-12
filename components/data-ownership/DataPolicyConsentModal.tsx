"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface DataPolicyConsentModalProps {
  open: boolean;
  orgName: string;
  mode: "AGENCY" | "AGENT";
  variant: "invitation" | "policy-change";
  originalMode?: "AGENCY" | "AGENT";
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}

export function DataPolicyConsentModal({
  open,
  orgName,
  mode,
  variant,
  originalMode,
  onAccept,
  onDecline,
  loading = false,
}: DataPolicyConsentModalProps) {
  const tInv = useTranslations("dataOwnership.consent.invitation");
  const tChange = useTranslations("dataOwnership.consent.policyChange");
  const [accepted, setAccepted] = useState(false);
  const [showLeaveSection, setShowLeaveSection] = useState(false);

  const isInvitation = variant === "invitation";
  const t = isInvitation ? tInv : tChange;

  const policyKey = `policyDescription_${mode}` as const;
  const newPolicyKey = `newPolicy_${mode}` as const;

  // For "leave instead", consequence text depends on the original mode
  const leaveWarningKey = originalMode
    ? (`leaveWarning_${originalMode}` as const)
    : (`leaveWarning_${mode}` as const);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {isInvitation
              ? tInv("description", { orgName })
              : tChange("description", { orgName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm">
            {isInvitation
              ? tInv(policyKey as any)
              : tChange(newPolicyKey as any)}
          </p>

          {!isInvitation && (
            <p className="text-xs text-muted-foreground">
              {tChange("note")}
            </p>
          )}

          <div className="flex items-start gap-2">
            <Checkbox
              id="consent-checkbox"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              disabled={loading}
            />
            <label
              htmlFor="consent-checkbox"
              className="text-sm leading-tight cursor-pointer"
            >
              {t("checkboxLabel")}
            </label>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={onDecline}
              disabled={loading}
              className="flex-1"
            >
              {isInvitation ? tInv("decline") : null}
            </Button>
            <Button
              onClick={onAccept}
              disabled={!accepted || loading}
              className="flex-1"
            >
              {loading ? "..." : t("accept")}
            </Button>
          </div>

          {!isInvitation && !showLeaveSection && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowLeaveSection(true)}
              disabled={loading}
            >
              {tChange("leaveInstead")}
            </Button>
          )}

          {!isInvitation && showLeaveSection && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="text-sm">
                  {tChange(leaveWarningKey as any)}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDecline}
                  disabled={loading}
                >
                  {tChange("confirmLeave")}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
