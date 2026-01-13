"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, Ban, UserCheck, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import type { PlatformUser } from "@/actions/platform-admin/get-users";
import {
  sendUserWarning,
  suspendUser,
  unsuspendUser,
  deleteUser,
} from "@/actions/platform-admin/user-actions";

interface UserActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PlatformUser | null;
  actionType: "warn" | "suspend" | "unsuspend" | "delete";
  locale: string;
}

export function UserActionDialog({
  open,
  onOpenChange,
  user,
  actionType,
  locale,
}: UserActionDialogProps) {
  const t = useTranslations("platformAdmin");
  const { toast } = useToast();
  const router = useRouter();
  
  const [reason, setReason] = React.useState("");
  const [confirmText, setConfirmText] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setReason("");
      setConfirmText("");
    }
  }, [open]);

  const actionConfig = {
    warn: {
      title: t("actions.warn.title"),
      description: t("actions.warn.description"),
      icon: AlertTriangle,
      iconColor: "text-yellow-500",
      buttonLabel: t("actions.warn.button"),
      buttonVariant: "default" as const,
      requiresConfirm: false,
    },
    suspend: {
      title: t("actions.suspend.title"),
      description: t("actions.suspend.description"),
      icon: Ban,
      iconColor: "text-orange-500",
      buttonLabel: t("actions.suspend.button"),
      buttonVariant: "destructive" as const,
      requiresConfirm: false,
    },
    unsuspend: {
      title: t("actions.unsuspend.title"),
      description: t("actions.unsuspend.description"),
      icon: UserCheck,
      iconColor: "text-green-500",
      buttonLabel: t("actions.unsuspend.button"),
      buttonVariant: "default" as const,
      requiresConfirm: false,
    },
    delete: {
      title: t("actions.delete.title"),
      description: t("actions.delete.description"),
      icon: Trash2,
      iconColor: "text-destructive",
      buttonLabel: t("actions.delete.button"),
      buttonVariant: "destructive" as const,
      requiresConfirm: true,
    },
  };

  const config = actionConfig[actionType];
  const Icon = config.icon;

  const handleSubmit = async () => {
    if (!user) return;
    
    // Validate reason (must be at least 10 characters for warn, suspend, delete)
    if (actionType !== "unsuspend") {
      if (!reason.trim()) {
        toast({
          title: t("actions.error"),
          description: t("actions.reasonRequired"),
          variant: "destructive",
        });
        return;
      }
      if (reason.trim().length < 10) {
        toast({
          title: t("actions.error"),
          description: t("actions.reasonTooShort"),
          variant: "destructive",
        });
        return;
      }
    }

    if (config.requiresConfirm && confirmText !== "DELETE") {
      toast({
        title: t("actions.error"),
        description: t("actions.confirmRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let result;
      
      switch (actionType) {
        case "warn":
          result = await sendUserWarning(user.id, reason);
          break;
        case "suspend":
          result = await suspendUser(user.id, reason);
          break;
        case "unsuspend":
          result = await unsuspendUser(user.id, reason || undefined);
          break;
        case "delete":
          result = await deleteUser(user.id, reason);
          break;
      }

      if (result?.success) {
        toast({
          title: t("actions.success"),
          description: t(`actions.${actionType}.success`),
        });
        onOpenChange(false);
        router.refresh();
      } else {
        toast({
          title: t("actions.error"),
          description: result?.error || t("actions.genericError"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Action error:", error);
      toast({
        title: t("actions.error"),
        description: t("actions.genericError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-muted ${config.iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User info */}
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm font-medium">{t("actions.targetUser")}</p>
            <p className="text-sm text-muted-foreground font-mono">
              {user.email}
            </p>
            {user.name && (
              <p className="text-sm text-muted-foreground">{user.name}</p>
            )}
          </div>

          {/* Reason input (not required for unsuspend) */}
          {actionType !== "unsuspend" && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                {t("actions.reason")}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder={t("actions.reasonPlaceholder")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {t("actions.reasonNote")}
              </p>
            </div>
          )}

          {/* Optional reason for unsuspend */}
          {actionType === "unsuspend" && (
            <div className="space-y-2">
              <Label htmlFor="reason">{t("actions.optionalNote")}</Label>
              <Textarea
                id="reason"
                placeholder={t("actions.optionalNotePlaceholder")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
          )}

          {/* Delete confirmation */}
          {config.requiresConfirm && (
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-destructive">
                {t("actions.delete.confirmLabel")}
              </Label>
              <Input
                id="confirm"
                placeholder={t("actions.delete.confirmPlaceholder")}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-muted-foreground">
                {t("actions.delete.confirmNote")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t("actions.cancel")}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {config.buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}






