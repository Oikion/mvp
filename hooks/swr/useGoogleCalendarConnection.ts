import useSWR from "swr";
import fetcher from "@/lib/fetcher";

export interface GoogleCalendarConnectionStatus {
  connected: boolean;
  googleEmail: string | null;
  status: "ACTIVE" | "NEEDS_REAUTH" | "PAUSED" | "DISCONNECTED" | null;
  lastSyncedAt: string | null;
}

const GOOGLE_CALENDAR_STATUS_KEY = "/api/auth/google-calendar/status";

export function useGoogleCalendarConnection() {
  const { data, error, isLoading, mutate } = useSWR<{ data: GoogleCalendarConnectionStatus }>(
    GOOGLE_CALENDAR_STATUS_KEY,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    }
  );

  return {
    connection: data?.data ?? null,
    isConnected: data?.data?.connected ?? false,
    isLoading,
    error,
    refresh: () => mutate(),
  };
}
