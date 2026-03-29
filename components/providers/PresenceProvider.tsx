"use client";

import { createContext, useCallback, useEffect, useRef } from "react";
import { useMessagingCredentials } from "@/hooks/swr/useMessaging";
import { useAblyPresence } from "@/hooks/useAbly";
import { updateUserPresence } from "@/actions/messaging/sync-user";

interface PresenceContextValue {
  /** Check if a user is currently online (ONLINE or AWAY) */
  isUserOnline: (userId: string) => boolean;
  /** Get the presence status for a user */
  getUserStatus: (userId: string) => "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";
}

const defaultValue: PresenceContextValue = {
  isUserOnline: () => false,
  getUserStatus: () => "OFFLINE",
};

export const PresenceContext = createContext<PresenceContextValue>(defaultValue);

const HEARTBEAT_INTERVAL_MS = 60_000; // 1 minute

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { credentials } = useMessagingCredentials();
  const hasPublishedOnline = useRef(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { isUserOnline, getUserStatus, onlineUsers } = useAblyPresence({
    organizationId: credentials?.organizationId,
    credentials,
  });

  // Publish ONLINE when credentials load (once per mount)
  useEffect(() => {
    if (!credentials?.userId || hasPublishedOnline.current) return;
    hasPublishedOnline.current = true;
    updateUserPresence("ONLINE").catch(console.error);
  }, [credentials?.userId]);

  // Tab visibility: AWAY when hidden, ONLINE when visible
  useEffect(() => {
    if (!credentials?.userId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        updateUserPresence("AWAY").catch(console.error);
      } else {
        updateUserPresence("ONLINE").catch(console.error);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [credentials?.userId]);

  // Heartbeat: re-publish ONLINE every 60s to catch stale sessions
  useEffect(() => {
    if (!credentials?.userId) return;

    heartbeatRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        updateUserPresence("ONLINE").catch(console.error);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [credentials?.userId]);

  // Publish OFFLINE on page unload
  useEffect(() => {
    if (!credentials?.userId) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery during unload
      const body = JSON.stringify({ status: "OFFLINE" });
      navigator.sendBeacon("/api/messaging/presence", body);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [credentials?.userId]);

  const getStatus = useCallback(
    (userId: string) => (getUserStatus(userId) as "ONLINE" | "AWAY" | "BUSY" | "OFFLINE"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onlineUsers]
  );

  const checkOnline = useCallback(
    (userId: string) => isUserOnline(userId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onlineUsers]
  );

  return (
    <PresenceContext.Provider value={{ isUserOnline: checkOnline, getUserStatus: getStatus }}>
      {children}
    </PresenceContext.Provider>
  );
}
