"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  reviewDataDeletion,
  executeDataDeletion,
} from "@/actions/platform-admin/manage-data-requests";

interface DataRequestItem {
  id: string;
  type: "EXPORT" | "DELETION";
  userEmail: string;
  userName: string | null;
  organizationId: string;
  status: string;
  reason?: string | null;
  gracePeriodEndsAt?: Date | null;
  reviewNote?: string | null;
  createdAt: Date;
}

interface DataRequestActionDialogProps {
  request: DataRequestItem;
  actionType: "approve" | "reject" | "execute";
  open: boolean;
  onClose: () => void;
  locale: string;
}

export function DataRequestActionDialog({
  request,
  actionType,
  open,
  onClose,
  locale,
}: DataRequestActionDialogProps) {
  const t = useTranslations("platformAdmin.dataRequests.actions");
  const router = useRouter();
  const { toast } = useAppToast();
  const [note, setNote] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (actionType === "reject" && !note.trim()) {
      toast.error(t("noteRequired"), { isTranslationKey: false });
      return;
    }

    if (actionType === "execute" && deleteConfirmation !== "DELETE") {
      toast.error(t("executeConfirm"), { isTranslationKey: false });
      return;
    }

    setIsSubmitting(true);
    try {
      let result: { success: boolean; error?: string };

      if (actionType === "execute") {
        result = await executeDataDeletion(request.id);
      } else {
        result = await reviewDataDeletion(
          request.id,
          actionType,
          note || undefined
        );
      }

      if (result.success) {
        toast.success(t("success"), { isTranslationKey: false });
        onClose();
        router.refresh();
      } else {
        toast.error(result.error || t("error"), { isTranslationKey: false });
      }
    } catch {
      toast.error(t("error"), { isTranslationKey: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDialogContent = () => {
    switch (actionType) {
      case "approve":
        return {
          title: t("approveTitle"),
          description: t("approveDescription"),
          buttonLabel: t("approve"),
          buttonVariant: "default" as const,
        };
      case "reject":
        return {
          title: t("rejectTitle"),
          description: t("rejectDescription"),
          buttonLabel: t("reject"),
          buttonVariant: "destructive" as const,
        };
      case "execute":
        return {
          title: t("executeTitle"),
          description: t("executeDescription"),
          buttonLabel: t("execute"),
          buttonVariant: "destructive" as const,
        };
    }
  };

  const content = getDialogContent();

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Show request info */}
          <div className="p-3 rounded-lg border bg-muted/50 space-y-1">
            <p className="text-sm">
              <strong>User:</strong> {request.userEmail}
            </p>
            <p className="text-sm">
              <strong>Org:</strong> {request.organizationId}
            </p>
            {request.reason && (
              <p className="text-sm">
                <strong>Reason:</strong> {request.reason}
              </p>
            )}
          </div>

          {/* Note field for approve/reject */}
          {actionType !== "execute" && (
            <div className="space-y-2">
              <Label>
                {actionType === "reject" ? t("noteRequired") : t("noteLabel")}
              </Label>
              <Textarea
                placeholder={t("notePlaceholder")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Confirmation for execute */}
          {actionType === "execute" && (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Irreversible Action</AlertTitle>
                <AlertDescription>
                  This will permanently delete ALL data for organization{" "}
                  <strong>{request.organizationId}</strong>. This cannot be
                  undone.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>{t("executeConfirm")}</Label>
                <Input
                  placeholder="DELETE"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant={content.buttonVariant}
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (actionType === "reject" && !note.trim()) ||
              (actionType === "execute" && deleteConfirmation !== "DELETE")
            }
          >
            {isSubmitting && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {content.buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
