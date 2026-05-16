"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { restoreEntity } from "@/actions/archive/restore-entity";
import { purgeEntity } from "@/actions/archive/purge-entity";
import type { ArchivableEntityType } from "@/actions/archive/archive-entity";
import { useAppToast } from "@/hooks/use-app-toast";

interface ArchiveActionsProps {
  entityType: ArchivableEntityType;
  id: string;
  canRestore: boolean;
  canPurge: boolean;
  onSuccess: () => void;
}

export default function ArchiveActions({
  entityType,
  id,
  canRestore,
  canPurge,
  onSuccess,
}: ArchiveActionsProps) {
  const t = useTranslations("archive");
  const { toast } = useAppToast();
  const [isPending, startTransition] = useTransition();

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreEntity(entityType, id);
      if (result.success) {
        toast.success("restoreSuccess");
        onSuccess();
      } else {
        toast.error("restoreFailed");
      }
    });
  }

  function handlePurge() {
    startTransition(async () => {
      const result = await purgeEntity(entityType, id);
      if (result.success) {
        toast.success("purgeSuccess");
        onSuccess();
      } else {
        toast.error("purgeFailed");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {canRestore && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isPending}>
              {isPending ? "…" : t("actions.restore")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("actions.restore")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("actions.restoreConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("actions.cancelButton")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleRestore}>
                {t("actions.restore")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {canPurge && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isPending}>
              {isPending ? "…" : t("actions.purgeButton")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("actions.purge")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("actions.purgeConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("actions.cancelButton")}</AlertDialogCancel>
              <AlertDialogAction onClick={handlePurge}>
                {t("actions.purgeButton")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
