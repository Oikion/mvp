"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { ReservedNameStatus, ReservedNameType } from "@prisma/client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createReservedName,
  deleteReservedName,
  updateReservedName,
} from "@/actions/platform-admin/reserved-names";
import { useAppToast } from "@/hooks/use-app-toast";
import type { ReservedNameItem } from "@/actions/platform-admin/reserved-names";

type ReservedDialogMode = "create" | "edit" | "delete";

interface ReservedNameActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ReservedDialogMode;
  item: ReservedNameItem | null;
}

export function ReservedNameActionDialog({
  open,
  onOpenChange,
  mode,
  item,
}: ReservedNameActionDialogProps) {
  const t = useTranslations("platformAdmin.reservedNames");
  const { toast } = useAppToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [type, setType] = React.useState<ReservedNameType>("USERNAME");
  const [status, setStatus] = React.useState<ReservedNameStatus>("ACTIVE");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (item) {
      setValue(item.value);
      setType(item.type);
      setStatus(item.status);
      setNotes(item.notes || "");
    } else {
      setValue("");
      setType("USERNAME");
      setStatus("ACTIVE");
      setNotes("");
    }
  }, [open, item]);

  const handleSave = async () => {
    if (!value.trim()) {
      toast.error(t("errors.valueRequired"), { isTranslationKey: false });
      return;
    }

    setIsLoading(true);
    try {
      const result =
        mode === "edit" && item
          ? await updateReservedName({
              id: item.id,
              value,
              type,
              status,
              notes: notes || undefined,
            })
          : await createReservedName({
              value,
              type,
              status,
              notes: notes || undefined,
            });

      if (result.success) {
        toast.success(
          mode === "edit" ? "updateSuccess" : "createSuccess",
          { isTranslationKey: true }
        );
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || t("errors.saveFailed"), { isTranslationKey: false });
      }
    } catch (error) {
      console.error("Failed to save reserved name:", error);
      toast.error(t("errors.saveFailed"), { isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    setIsLoading(true);
    try {
      const result = await deleteReservedName(item.id);
      if (result.success) {
        toast.success("deleteSuccess", { isTranslationKey: true });
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || t("errors.deleteFailed"), { isTranslationKey: false });
      }
    } catch (error) {
      console.error("Failed to delete reserved name:", error);
      toast.error(t("errors.deleteFailed"), { isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  const title =
    mode === "delete"
      ? t("dialog.deleteTitle")
      : mode === "edit"
      ? t("dialog.editTitle")
      : t("dialog.createTitle");
  const description =
    mode === "delete"
      ? t("dialog.deleteDescription")
      : mode === "edit"
      ? t("dialog.editDescription")
      : t("dialog.createDescription");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {mode === "delete" ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("dialog.deleteConfirm")}
            </p>
            {item && (
              <div className="rounded-md border border-muted p-3 text-sm">
                <p className="font-medium">{item.value}</p>
                <p className="text-xs text-muted-foreground">
                  {t(`types.${item.type.toLowerCase()}`)} •{" "}
                  {t(`status.${item.status.toLowerCase()}`)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="value">{t("form.valueLabel")}</Label>
              <Input
                id="value"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={t("form.valuePlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">{t("form.typeLabel")}</Label>
                <Select value={type} onValueChange={(val) => setType(val as ReservedNameType)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["USERNAME", "ORG_NAME", "ORG_SLUG"] as ReservedNameType[]).map((option) => (
                      <SelectItem key={option} value={option}>
                        {t(`types.${option.toLowerCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{t("form.statusLabel")}</Label>
                <Select
                  value={status}
                  onValueChange={(val) => setStatus(val as ReservedNameStatus)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["ACTIVE", "INACTIVE"] as ReservedNameStatus[]).map((option) => (
                      <SelectItem key={option} value={option}>
                        {t(`status.${option.toLowerCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">{t("form.notesLabel")}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t("form.notesPlaceholder")}
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t("dialog.cancel")}
          </Button>
          {mode === "delete" ? (
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("dialog.deleteAction")}
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "edit" ? t("dialog.saveAction") : t("dialog.createAction")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
