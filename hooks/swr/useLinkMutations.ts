import useSWRMutation from "swr/mutation";
import { useSWRConfig } from "swr";
import { getPropertyLinkedKey } from "./usePropertyLinked";
import { getClientLinkedKey } from "./useClientLinked";

// ============================================================
// Types
// ============================================================

interface LinkResponse {
  links: Array<{ clientId: string; propertyId: string }>;
}

interface UnlinkResponse {
  success: boolean;
}

// ============================================================
// Fetchers
// ============================================================

async function linkClientsToPropertyFetcher(
  url: string,
  { arg }: { arg: { propertyId: string; clientIds: string[] } }
): Promise<LinkResponse> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to link clients");
  }

  return res.json();
}

async function unlinkClientFromPropertyFetcher(
  url: string,
  { arg }: { arg: { clientId: string; propertyId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(
    `${url}?clientId=${arg.clientId}&propertyIds=${arg.propertyId}`,
    { method: "DELETE" }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to unlink client");
  }

  return res.json();
}

async function linkPropertiesToClientFetcher(
  url: string,
  { arg }: { arg: { clientId: string; propertyIds: string[] } }
): Promise<LinkResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to link properties");
  }

  return res.json();
}

async function unlinkPropertyFromClientFetcher(
  url: string,
  { arg }: { arg: { clientId: string; propertyId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(
    `${url}?clientId=${arg.clientId}&propertyIds=${arg.propertyId}`,
    { method: "DELETE" }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to unlink property");
  }

  return res.json();
}

// ============================================================
// Hooks
// ============================================================

/**
 * Hook to link clients to a property
 * Invalidates property linked entities cache after mutation
 */
export function useLinkClientsToProperty(propertyId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    "/api/crm/clients/link-properties",
    linkClientsToPropertyFetcher,
    {
      onSuccess: () => {
        // Invalidate property linked cache
        globalMutate(getPropertyLinkedKey(propertyId));
      },
    }
  );

  const linkClients = async (clientIds: string[]) => {
    return trigger({ propertyId, clientIds });
  };

  return {
    linkClients,
    isLinking: isMutating,
    error,
  };
}

/**
 * Hook to unlink a client from a property
 * Invalidates property linked entities cache after mutation
 */
export function useUnlinkClientFromProperty(propertyId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    "/api/crm/clients/link-properties",
    unlinkClientFromPropertyFetcher,
    {
      onSuccess: () => {
        // Invalidate property linked cache
        globalMutate(getPropertyLinkedKey(propertyId));
      },
    }
  );

  const unlinkClient = async (clientId: string) => {
    return trigger({ clientId, propertyId });
  };

  return {
    unlinkClient,
    isUnlinking: isMutating,
    error,
  };
}

/**
 * Hook to link properties to a client
 * Invalidates client linked entities cache after mutation
 */
export function useLinkPropertiesToClient(clientId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    "/api/crm/clients/link-properties",
    linkPropertiesToClientFetcher,
    {
      onSuccess: () => {
        // Invalidate client linked cache
        globalMutate(getClientLinkedKey(clientId));
      },
    }
  );

  const linkProperties = async (propertyIds: string[]) => {
    return trigger({ clientId, propertyIds });
  };

  return {
    linkProperties,
    isLinking: isMutating,
    error,
  };
}

/**
 * Hook to unlink a property from a client
 * Invalidates client linked entities cache after mutation
 */
export function useUnlinkPropertyFromClient(clientId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    "/api/crm/clients/link-properties",
    unlinkPropertyFromClientFetcher,
    {
      onSuccess: () => {
        // Invalidate client linked cache
        globalMutate(getClientLinkedKey(clientId));
      },
    }
  );

  const unlinkProperty = async (propertyId: string) => {
    return trigger({ clientId, propertyId });
  };

  return {
    unlinkProperty,
    isUnlinking: isMutating,
    error,
  };
}
