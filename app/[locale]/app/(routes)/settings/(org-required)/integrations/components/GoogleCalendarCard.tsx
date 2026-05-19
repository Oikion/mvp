"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type GoogleSyncStatus = "ACTIVE" | "NEEDS_REAUTH" | "PAUSED" | "DISCONNECTED";

interface Props {
  connected: boolean;
  googleEmail?: string | null;
  status?: GoogleSyncStatus;
  lastSyncedAt?: string | null;
}

export function GoogleCalendarCard({ connected, googleEmail, status, lastSyncedAt }: Props) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState(false);
  const router = useRouter();

  async function handleDisconnect() {
    setDisconnecting(true);
    setDisconnectError(false);
    try {
      const res = await fetch("/api/auth/google-calendar/disconnect", { method: "POST" });
      if (!res.ok) {
        setDisconnectError(true);
        return;
      }
      router.refresh();
    } catch {
      setDisconnectError(true);
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Google Calendar</CardTitle>
              <CardDescription className="text-xs">
                Two-way sync — events created in either place stay in sync
              </CardDescription>
            </div>
          </div>
          <StatusBadge connected={connected} status={status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {connected && googleEmail && (
          <p className="text-sm text-muted-foreground">
            Connected as <span className="font-medium text-foreground">{googleEmail}</span>
          </p>
        )}

        {connected && status === "NEEDS_REAUTH" && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Your Google connection needs to be reconnected. Please disconnect and reconnect.</p>
          </div>
        )}

        {connected && lastSyncedAt && (
          <p className="text-xs text-muted-foreground">
            Last synced {new Date(lastSyncedAt).toLocaleString()}
          </p>
        )}

        {disconnectError && (
          <p className="text-xs text-destructive">Failed to disconnect. Please try again.</p>
        )}

        <div className="flex gap-2">
          {connected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Disconnect
            </Button>
          ) : (
            <Button asChild size="sm">
              <a href="/api/auth/google-calendar/connect">Connect Google Calendar</a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({
  connected,
  status,
}: {
  connected: boolean;
  status?: GoogleSyncStatus;
}) {
  if (!connected) {
    return <Badge variant="secondary">Not connected</Badge>;
  }
  if (status === "NEEDS_REAUTH") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Reconnect required
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-3 w-3" />
      Active
    </Badge>
  );
}
