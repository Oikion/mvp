import useSWRMutation from "swr/mutation";
import { useSWRConfig } from "swr";

// ============================================================
// Types
// ============================================================

export type ShareEntityType = "PROPERTY" | "CLIENT" | "DOCUMENT";
export type SharePermission = "VIEW_ONLY" | "VIEW_COMMENT";

export interface ShareEntityData {
  entityType: ShareEntityType;
  entityId: string;
  sharedWithId?: string;
  audienceId?: string;
  permissions?: SharePermission;
  message?: string | null;
}

export interface ShareResponse {
  id: string;
  entityType: ShareEntityType;
  entityId: string;
  sharedById: string;
  sharedWithId: string;
  permissions: SharePermission;
  message: string | null;
  createdAt: string;
}

export interface BulkShareResponse {
  success: boolean;
  sharedCount: number;
  audienceName: string;
}

// ============================================================
// Fetchers
// ============================================================

async function shareEntityFetcher(
  url: string,
  { arg }: { arg: ShareEntityData }
): Promise<ShareResponse | BulkShareResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to share");
  }

  return res.json();
}

// ============================================================
// Hooks
// ============================================================

/**
 * Hook to share an entity with another user or audience
 * Invalidates share-related caches after mutation
 */
export function useShareEntity() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error, data } = useSWRMutation(
    "/api/share",
    shareEntityFetcher,
    {
      onSuccess: () => {
        // Invalidate share-related caches
        globalMutate(
          (key) => typeof key === "string" && key.startsWith("/api/share"),
          undefined,
          { revalidate: true }
        );
      },
    }
  );

  const shareWithUser = async (
    entityType: ShareEntityType,
    entityId: string,
    sharedWithId: string,
    permissions: SharePermission = "VIEW_COMMENT",
    message?: string
  ) => {
    return trigger({
      entityType,
      entityId,
      sharedWithId,
      permissions,
      message: message || null,
    });
  };

  const shareWithAudience = async (
    entityType: ShareEntityType,
    entityId: string,
    audienceId: string,
    permissions: SharePermission = "VIEW_COMMENT",
    message?: string
  ) => {
    return trigger({
      entityType,
      entityId,
      audienceId,
      permissions,
      message: message || null,
    });
  };

  return {
    shareEntity: trigger,
    shareWithUser,
    shareWithAudience,
    isSharing: isMutating,
    error,
    result: data,
  };
}
