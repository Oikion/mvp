"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CalendarDays,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useGoogleCalendarConnection } from "@/hooks/swr";
import { useAppToast } from "@/hooks/use-app-toast";
import { cn } from "@/lib/utils";

const CALENDAR_RETURN_PATH = "/app/calendar";
const SESSION_KEY_PREFIX = "gcal_banner_dismissed_";

function getSessionKey(email: string | null) {
  return `${SESSION_KEY_PREFIX}${email ?? "unknown"}`;
}

interface Props {
  className?: string;
}

export function GoogleCalendarBanner({ className }: Props) {
  const t = useTranslations("calendar.googleCalendar");
  const { connection, isConnected, isLoading, refresh } = useGoogleCalendarConnection();
  const { toast } = useAppToast();
  const { success: toastSuccess, error: toastError } = toast;
  const searchParams = useSearchParams();

  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  // confirmDisconnect: true = user clicked Disconnect once, awaiting confirmation
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Restore dismissed state from sessionStorage (keyed to email so it resets on account change)
  useEffect(() => {
    if (!connection?.googleEmail) return;
    try {
      if (sessionStorage.getItem(getSessionKey(connection.googleEmail)) === "1") {
        setDismissed(true);
      }
    } catch {
      // sessionStorage unavailable (e.g. private mode with storage blocked)
    }
  }, [connection?.googleEmail]);

  // Show success / error toasts when returning from the OAuth callback.
  // Empty dependency array is intentional — runs once on mount only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "google") {
      toastSuccess(t("connectSuccess"));
      refresh();
    } else if (error === "google_auth_failed") {
      toastError(t("connectError"));
    }
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(getSessionKey(connection?.googleEmail ?? null), "1");
    } catch {
      // ignore
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/auth/google-calendar/sync", { method: "POST" });
      if (!res.ok) {
        toastError(t("syncError"));
        return;
      }
      const data = await res.json();
      toastSuccess(t("syncSuccess", { count: data.synced ?? 0 }));
      refresh();
    } catch {
      toastError(t("syncError"));
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setConfirmDisconnect(false);
    try {
      const res = await fetch("/api/auth/google-calendar/disconnect", { method: "POST" });
      if (!res.ok) {
        toastError(t("disconnectError"));
        return;
      }
      toastSuccess(t("disconnectSuccess"));
      refresh();
    } catch {
      toastError(t("disconnectError"));
    } finally {
      setDisconnecting(false);
    }
  }

  // While loading, render nothing to avoid layout shift on initial paint
  if (isLoading) return null;

  // Connected + Active — dismissible compact status bar
  if (isConnected && connection?.status === "ACTIVE") {
    if (dismissed) return null;

    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm",
          className
        )}
        role="status"
        aria-label={t("connectedLabel")}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span className="text-emerald-700 dark:text-emerald-400 truncate">
            {t("connectedAs", { email: connection.googleEmail ?? "" })}
          </span>
          <Badge
            variant="outline"
            className="shrink-0 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
          >
            {t("statusActive")}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {confirmDisconnect ? (
            <>
              <span className="text-xs text-muted-foreground">{t("disconnectConfirm")}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  t("disconnectConfirmYes")
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setConfirmDisconnect(false)}
              >
                {t("disconnectCancel")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmDisconnect(true)}
                aria-label={t("disconnectLabel")}
              >
                {t("disconnect")}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                onClick={handleDismiss}
                aria-label={t("dismissLabel")}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Connected but needs re-auth — non-dismissible warning
  if (isConnected && connection?.status === "NEEDS_REAUTH") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-sm",
          className
        )}
        role="alert"
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <span className="text-destructive">{t("reauthRequired")}</span>
        </div>
        <Button asChild size="sm" variant="destructive" className="shrink-0 h-7 text-xs">
          <a href={`/api/auth/google-calendar/connect?returnTo=${CALENDAR_RETURN_PATH}`}>
            {t("reconnect")}
          </a>
        </Button>
      </div>
    );
  }

  // Not connected — connect prompt (no sync button in toolbar either)
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="text-muted-foreground">{t("connectPrompt")}</span>
      </div>
      <Button asChild size="sm" className="shrink-0 h-7 text-xs">
        <a href={`/api/auth/google-calendar/connect?returnTo=${CALENDAR_RETURN_PATH}`}>
          {t("connectButton")}
        </a>
      </Button>
    </div>
  );
}

/**
 * Standalone sync button for the calendar toolbar.
 * Only renders when the user has an active Google Calendar connection.
 */
export function GoogleCalendarSyncButton() {
  const t = useTranslations("calendar.googleCalendar");
  const { connection, isConnected, isLoading, refresh } = useGoogleCalendarConnection();
  const { toast } = useAppToast();
  const { success: toastSuccess, error: toastError } = toast;
  const [syncing, setSyncing] = useState(false);

  if (isLoading || !isConnected || connection?.status !== "ACTIVE") return null;

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/auth/google-calendar/sync", { method: "POST" });
      if (!res.ok) {
        toastError(t("syncError"));
        return;
      }
      const data = await res.json();
      toastSuccess(t("syncSuccess", { count: data.synced ?? 0 }));
      refresh();
    } catch {
      toastError(t("syncError"));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="h-8 w-8 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
      onClick={handleSync}
      disabled={syncing}
      aria-label={t("syncNow")}
    >
      <RefreshCw
        className={cn("h-4 w-4", syncing && "animate-spin")}
        aria-hidden="true"
      />
    </Button>
  );
}
