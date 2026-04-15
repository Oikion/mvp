"use client";

import { useState } from "react";
import { RefreshCw, Trash2, Cloud, CloudOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useE2EE } from "@/hooks/useE2EE";
import * as e2ee from "@/lib/e2ee";
import { useAppToast } from "@/hooks/use-app-toast";

export function SessionBackupStatus() {
  const t = useTranslations("common");
  const { isUnlocked } = useE2EE();
  const { toast } = useAppToast();
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  if (!isUnlocked) return null;

  const manager = e2ee.getBackupManager();

  const handleForceSync = async () => {
    if (!manager) return;
    setIsForceSyncing(true);
    try {
      await manager.flush();
      toast.success(t("security.sessionBackup.syncSuccess"));
    } catch {
      toast.error(t("security.sessionBackup.syncError"));
    } finally {
      setIsForceSyncing(false);
    }
  };

  const handleClearBackups = async () => {
    if (!manager) return;
    setIsClearing(true);
    try {
      await manager.clearAll();
      toast.success(t("security.sessionBackup.clearSuccess"));
    } catch {
      toast.error(t("security.sessionBackup.clearError"));
    } finally {
      setIsClearing(false);
    }
  };

  const isDirty = manager ? manager.dirtyCount > 0 : false;
  const lastSynced = manager?.lastFlushedAt;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isDirty ? (
            <CloudOff className="h-5 w-5 text-warning" aria-hidden="true" />
          ) : (
            <Cloud className="h-5 w-5 text-success" aria-hidden="true" />
          )}
          {t("security.sessionBackup.title")}
        </CardTitle>
        <CardDescription>
          {t("security.sessionBackup.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("security.sessionBackup.statusLabel")}</span>
          <span className={isDirty ? "text-warning" : "text-success"}>
            {isDirty ? t("security.sessionBackup.statusPending") : t("security.sessionBackup.statusSynced")}
          </span>
        </div>

        {lastSynced && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("security.sessionBackup.lastSynced")}</span>
            <span>{lastSynced.toLocaleTimeString()}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleForceSync}
            disabled={isForceSyncing || !isDirty}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2${isForceSyncing ? " animate-spin" : ""}`}
              aria-hidden="true"
            />
            {t("security.sessionBackup.syncNow")}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isClearing}>
                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                {t("security.sessionBackup.clearAll")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("security.sessionBackup.clearDialogTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("security.sessionBackup.clearDialogDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("security.sessionBackup.clearCancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearBackups}>
                  {t("security.sessionBackup.clearConfirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
