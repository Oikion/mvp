import useSWRMutation from "swr/mutation";
import { useSWRConfig } from "swr";
import type { Connection } from "./useConnections";

// ============================================================
// Types
// ============================================================

export interface ConnectionMutationResponse {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  followerId: string;
  followingId: string;
}

// ============================================================
// Fetchers
// ============================================================

async function removeConnectionFetcher(url: string): Promise<void> {
  const res = await fetch(url, {
    method: "DELETE",
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to remove connection");
  }
}

async function respondToConnectionFetcher(
  url: string,
  { arg }: { arg: { accept: boolean } }
): Promise<ConnectionMutationResponse> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to respond to connection");
  }

  return res.json();
}

async function sendConnectionRequestFetcher(
  url: string,
  { arg }: { arg: { targetUserId: string } }
): Promise<ConnectionMutationResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to send connection request");
  }

  return res.json();
}

// ============================================================
// Hooks
// ============================================================

/**
 * Hook to remove a connection (cancel request or remove accepted connection)
 * Supports optimistic updates - connection is removed from list immediately
 */
export function useRemoveConnection(connectionId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/connections/${connectionId}`,
    removeConnectionFetcher
  );

  // Wrap trigger to provide optimistic update
  const removeConnection = async () => {
    // Optimistically remove from all connection caches immediately
    globalMutate(
      (key) => typeof key === "string" && key.startsWith("/api/connections"),
      (currentData: Connection[] | undefined) => {
        if (!currentData || !Array.isArray(currentData)) return currentData;
        return currentData.filter((c) => c.id !== connectionId);
      },
      { revalidate: false }
    );

    try {
      return await trigger();
    } catch (err) {
      // Roll back on error by revalidating
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/connections"),
        undefined,
        { revalidate: true }
      );
      throw err;
    }
  };

  return {
    removeConnection,
    isRemoving: isMutating,
    error,
  };
}

/**
 * Hook to respond to a pending connection request (accept or reject)
 * Supports optimistic updates - status changes immediately
 */
export function useRespondToConnection(connectionId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/connections/${connectionId}`,
    respondToConnectionFetcher
  );

  // Wrap respond to provide optimistic update
  const respond = async (accept: boolean) => {
    const newStatus = accept ? "ACCEPTED" : "REJECTED";

    // Optimistically update status in all connection caches immediately
    globalMutate(
      (key) => typeof key === "string" && key.startsWith("/api/connections"),
      (currentData: Connection[] | undefined) => {
        if (!currentData || !Array.isArray(currentData)) return currentData;
        return currentData.map((c) =>
          c.id === connectionId ? { ...c, status: newStatus as Connection["status"] } : c
        );
      },
      { revalidate: false }
    );

    try {
      const result = await trigger({ accept });
      // Revalidate after success to ensure correct state
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/connections"),
        undefined,
        { revalidate: true }
      );
      return result;
    } catch (err) {
      // Roll back on error by revalidating
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/connections"),
        undefined,
        { revalidate: true }
      );
      throw err;
    }
  };

  return {
    respond,
    acceptConnection: () => respond(true),
    rejectConnection: () => respond(false),
    isResponding: isMutating,
    error,
  };
}

/**
 * Hook to send a new connection request
 * Invalidates all connection-related caches after mutation
 */
export function useSendConnectionRequest() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    "/api/connections",
    sendConnectionRequestFetcher,
    {
      onSuccess: () => {
        // Invalidate all connection caches including search
        globalMutate(
          (key) => typeof key === "string" && key.startsWith("/api/connections"),
          undefined,
          { revalidate: true }
        );
      },
    }
  );

  const sendRequest = async (targetUserId: string) => {
    return trigger({ targetUserId });
  };

  return {
    sendRequest,
    isSending: isMutating,
    error,
  };
}
