"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";
import { UserPlus, Check, Clock, Loader2, UserMinus, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConnectionButtonProps {
  targetUserId: string;
  initialStatus?: {
    status: string;
    connectionId?: string;
    isIncoming?: boolean;
  };
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
}

export function ConnectionButton({
  targetUserId,
  initialStatus = { status: "NONE" },
  size = "default",
  variant = "default",
  className,
}: ConnectionButtonProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const router = useRouter();
  const { toast } = useAppToast();
  const t = useTranslations("connections");

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post("/api/connections", { targetUserId });
      setStatus({ status: "PENDING", connectionId: response.data.id });
      toast.success(t("toast.requestSent"), { description: t("toast.requestSentDesc"), isTranslationKey: false });
      router.refresh();
    } catch (error: any) {
      toast.error(t("toast.error"), { description: error.response?.data || t("toast.sendError"), isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!status.connectionId) return;

    try {
      setIsLoading(true);
      await axios.delete(`/api/connections/${status.connectionId}`);
      setStatus({ status: "NONE" });
      toast.success(t("toast.connectionRemoved"), { description: t("toast.connectionRemovedDesc"), isTranslationKey: false });
      setShowRemoveDialog(false);
      router.refresh();
    } catch (error: any) {
      toast.error(t("toast.error"), { description: error.response?.data || t("toast.removeError"), isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!status.connectionId) return;

    try {
      setIsLoading(true);
      await axios.put(`/api/connections/${status.connectionId}`, { accept: true });
      setStatus({ ...status, status: "ACCEPTED" });
      toast.success(t("toast.connectionAccepted"), { description: t("toast.connectionAcceptedDesc"), isTranslationKey: false });
      router.refresh();
    } catch (error: any) {
      toast.error(t("toast.error"), { description: error.response?.data || t("toast.respondError"), isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Button size={size} variant={variant} className={className} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  switch (status.status) {
    case "ACCEPTED":
      return (
        <>
          <Button
            size={size}
            variant="secondary"
            className={className}
            onClick={() => setShowRemoveDialog(true)}
          >
            <Check className="h-4 w-4 mr-2" />
            {t("actions.connected")}
          </Button>
          <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("dialogs.removeConnection.title")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("dialogs.removeConnection.description")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("dialogs.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemove}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  {t("dialogs.removeConnection.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      );

    case "PENDING":
      if (status.isIncoming) {
        return (
          <div className="flex gap-2">
            <Button
              size={size}
              variant="outline"
              className={className}
              onClick={() => setShowRemoveDialog(true)}
            >
              <X className="h-4 w-4 mr-1" />
              {t("actions.decline")}
            </Button>
            <Button size={size} variant={variant} className={className} onClick={handleAccept}>
              <Check className="h-4 w-4 mr-1" />
              {t("actions.accept")}
            </Button>
            <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("dialogs.declineRequest.title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("dialogs.declineRequest.description")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("dialogs.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemove}>{t("dialogs.declineRequest.confirm")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      }
      return (
        <Button
          size={size}
          variant="secondary"
          className={className}
          onClick={() => setShowRemoveDialog(true)}
        >
          <Clock className="h-4 w-4 mr-2" />
          {t("actions.pending")}
          <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("dialogs.cancelRequest.title")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("dialogs.cancelRequest.description")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("dialogs.cancelRequest.keep")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemove}>{t("dialogs.cancelRequest.confirm")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Button>
      );

    case "REJECTED":
    case "NONE":
    default:
      return (
        <Button
          size={size}
          variant={variant}
          className={className}
          onClick={handleConnect}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {t("actions.connect")}
        </Button>
      );
  }
}
