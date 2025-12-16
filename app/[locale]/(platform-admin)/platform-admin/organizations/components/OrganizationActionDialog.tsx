"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AlertTriangle, Ban, Trash2, Building2, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { 
  warnOrganizationMembers, 
  suspendOrganization, 
  deleteOrganization 
} from "@/actions/platform-admin/organization-actions";
import type { PlatformOrganization } from "@/actions/platform-admin/get-organizations";

interface OrganizationActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: PlatformOrganization | null;
  actionType: "warnAll" | "suspendAll" | "deleteOrg";
  locale: string;
}

export function OrganizationActionDialog({
  open,
  onOpenChange,
  organization,
  actionType,
  locale,
}: OrganizationActionDialogProps) {
  const t = useTranslations("platformAdmin");
  const router = useRouter();
  const { toast } = useToast();
  
  const [reason, setReason] = React.useState("");
  const [confirmText, setConfirmText] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setReason("");
      setConfirmText("");
    }
  }, [open]);

  if (!organization) return null;

  const getDialogConfig = () => {
    switch (actionType) {
      case "warnAll":
        return {
          icon: AlertTriangle,
          iconColor: "text-yellow-500",
          title: t("actions.orgWarnAll.title"),
          description: t("actions.orgWarnAll.description"),
          buttonText: t("actions.orgWarnAll.button"),
          buttonVariant: "default" as const,
          successMessage: t("actions.orgWarnAll.success"),
          requiresConfirm: false,
        };
      case "suspendAll":
        return {
          icon: Ban,
          iconColor: "text-orange-500",
          title: t("actions.orgSuspend.title"),
          description: t("actions.orgSuspend.description"),
          buttonText: t("actions.orgSuspend.button"),
          buttonVariant: "default" as const,
          successMessage: t("actions.orgSuspend.success"),
          requiresConfirm: false,
        };
      case "deleteOrg":
        return {
          icon: Trash2,
          iconColor: "text-destructive",
          title: t("actions.orgDelete.title"),
          description: t("actions.orgDelete.description"),
          buttonText: t("actions.orgDelete.button"),
          buttonVariant: "destructive" as const,
          successMessage: t("actions.orgDelete.success"),
          requiresConfirm: true,
        };
    }
  };

  const config = getDialogConfig();
  const Icon = config.icon;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: t("actions.error"),
        description: t("actions.reasonRequired"),
        variant: "destructive",
      });
      return;
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
        case "warnAll":
          result = await warnOrganizationMembers({
            organizationId: organization.id,
            reason,
          });
          break;
        case "suspendAll":
          result = await suspendOrganization({
            organizationId: organization.id,
            reason,
          });
          break;
        case "deleteOrg":
          result = await deleteOrganization({
            organizationId: organization.id,
            reason,
          });
          break;
      }

      if (result.success) {
        toast({
          title: t("actions.success"),
          description: config.successMessage,
        });
        onOpenChange(false);
        router.refresh();
      } else {
        toast({
          title: t("actions.error"),
          description: result.error || t("actions.genericError"),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t("actions.error"),
        description: t("actions.genericError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-muted ${config.iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription>{config.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Target Organization */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{t("actions.targetOrganization")}</p>
              <p className="text-sm text-muted-foreground">
                {organization.name} ({organization.memberCount} members)
              </p>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">{t("actions.reason")}</Label>
            <Textarea
              id="reason"
              placeholder={t("actions.reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {t("actions.reasonNoteOrg")}
            </p>
          </div>

          {/* Confirm deletion */}
          {config.requiresConfirm && (
            <div className="space-y-2">
              <Label htmlFor="confirm">{t("actions.orgDelete.confirmLabel")}</Label>
              <Input
                id="confirm"
                placeholder={t("actions.orgDelete.confirmPlaceholder")}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
              <p className="text-xs text-destructive">
                {t("actions.orgDelete.confirmNote")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t("actions.cancel")}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleSubmit}
            disabled={isLoading || (config.requiresConfirm && confirmText !== "DELETE")}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {config.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


