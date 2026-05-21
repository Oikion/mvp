"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useGoogleCalendarConnection } from "@/hooks/swr";
import { useAppToast } from "@/hooks/use-app-toast";

// URL-encode the returnTo so the tab query param survives the cookie round-trip.
// The connect route decodes it via searchParams.get() before storing in the cookie,
// and the callback uses new URL() to merge ?connected=google cleanly.
const CONNECT_URL = `/api/auth/google-calendar/connect?returnTo=${encodeURIComponent("/app/profile?tab=integrations")}`;

export function GoogleCalendarSection() {
  const t = useTranslations("calendar.googleCalendar");
  const { connection, isConnected, isLoading, refresh } = useGoogleCalendarConnection();
  const { toast } = useAppToast();
  const { success: toastSuccess, error: toastError } = toast;

  const searchParams = useSearchParams();
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  // Show success/error toast when returning from the OAuth callback.
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

  const needsReauth = isConnected && connection?.status === "NEEDS_REAUTH";
  const isActive = isConnected && connection?.status === "ACTIVE";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
              Google Calendar
              {isActive && (
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
                  {t("statusActive")}
                </Badge>
              )}
              {needsReauth && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                  {t("reauthRequired").split("—")[0].trim()}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{t("connectPrompt")}</CardDescription>
          </div>

          {/* Header action — only shown when not connected */}
          {!isLoading && !isConnected && (
            <Button asChild>
              <a href={CONNECT_URL}>
                <CalendarDays className="h-4 w-4 mr-2" aria-hidden="true" />
                {t("connectButton")}
              </a>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : needsReauth ? (
          /* Re-auth required state */
          <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <span className="text-sm text-destructive">{t("reauthRequired")}</span>
            </div>
            <Button asChild size="sm" variant="destructive" className="shrink-0">
              <a href={CONNECT_URL}>{t("reconnect")}</a>
            </Button>
          </div>
        ) : isActive ? (
          /* Connected + active state */
          <div className="flex items-center justify-between gap-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span className="text-sm text-emerald-700 dark:text-emerald-400 truncate">
                {t("connectedAs", { email: connection?.googleEmail ?? "" })}
              </span>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmDisconnect(true)}
                  aria-label={t("disconnectLabel")}
                >
                  {t("disconnect")}
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Not connected state */
          <div className="text-center py-8">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/40 mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t("connectPrompt")}</p>
            <Button asChild className="mt-4">
              <a href={CONNECT_URL}>{t("connectButton")}</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
