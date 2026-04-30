"use client";

import { useState, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreEntity(entityType, id);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error ?? t("actions.restore"));
      }
    });
  }

  function handlePurge() {
    startTransition(async () => {
      const result = await purgeEntity(entityType, id);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error ?? t("actions.purge"));
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}

      {canRestore && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestore}
          disabled={isPending}
        >
          {t("actions.restore")}
        </Button>
      )}

      {canPurge && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isPending}>
              {t("actions.purgeButton")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("actions.purgeConfirm")}</AlertDialogTitle>
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
