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
  const [linkedCounts, setLinkedCounts] = useState<Record<string, number> | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);

  async function handlePurgeClick() {
    setCountsLoading(true);
    try {
      const res = await fetch(`/api/archive/${entityType}/${id}/linked-counts`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setLinkedCounts(json.data ?? {});
      } else {
        setLinkedCounts({});
      }
    } catch {
      setLinkedCounts({});
    } finally {
      setCountsLoading(false);
      setPurgeDialogOpen(true);
    }
  }

  function handlePurgeConfirm() {
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

  const nonZeroCounts = linkedCounts
    ? Object.entries(linkedCounts).filter(([, v]) => v > 0)
    : [];
  const hasLinkedRecords = nonZeroCounts.length > 0;

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
        <AlertDialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending || countsLoading}
              onClick={(e) => {
                e.preventDefault();
                handlePurgeClick();
              }}
            >
              {countsLoading ? "…" : t("actions.purgeButton")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("actions.purge")}</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  <p>
                    {hasLinkedRecords
                      ? t("actions.purgeConfirmLinked")
                      : t("actions.purgeConfirm")}
                  </p>
                  {hasLinkedRecords && (
                    <ul className="mt-2 list-disc pl-4 text-sm">
                      {nonZeroCounts.map(([key, count]) => (
                        <li key={key}>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {(t as any)(`actions.linkedCounts.${key}`, { count })}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("actions.cancelButton")}</AlertDialogCancel>
              <AlertDialogAction onClick={handlePurgeConfirm} disabled={isPending}>
                {t("actions.purgeButton")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
