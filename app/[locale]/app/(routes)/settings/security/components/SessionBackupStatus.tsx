"use client";

import { useState } from "react";
import { RefreshCw, Trash2, Cloud, CloudOff } from "lucide-react";
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
      toast.success("Session backup synced");
    } catch {
      toast.error("Failed to sync session backups");
    } finally {
      setIsForceSyncing(false);
    }
  };

  const handleClearBackups = async () => {
    if (!manager) return;
    setIsClearing(true);
    try {
      await manager.clearAll();
      toast.success("All session backups cleared");
    } catch {
      toast.error("Failed to clear backups");
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
          Session Backup
        </CardTitle>
        <CardDescription>
          Encrypted session backups enable multi-device access and session recovery.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <span className={isDirty ? "text-warning" : "text-success"}>
            {isDirty ? "Pending changes" : "Synced"}
          </span>
        </div>

        {lastSynced && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last synced</span>
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
            Sync Now
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isClearing}>
                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Clear All Backups
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all session backups?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all encrypted session backups from the server.
                  You will not be able to restore sessions on other devices until
                  new backups are created. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearBackups}>
                  Clear Backups
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
