import useSWRMutation from "swr/mutation";
import { useSWRConfig } from "swr";
import { getPropertyLinkedKey } from "./usePropertyLinked";
import { getClientLinkedKey } from "./useClientLinked";
import { getMandateLinkedKey } from "./useMandateLinked";

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
// Mandate Fetchers
// ============================================================

async function linkPropertiesToMandateFetcher(
  url: string,
  { arg }: { arg: { mandateId: string; propertyIds: string[] } }
): Promise<{ links: any[] }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to link properties");
  return res.json();
}

async function unlinkPropertyFromMandateFetcher(
  url: string,
  { arg }: { arg: { mandateId: string; propertyId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(
    `${url}?mandateId=${arg.mandateId}&propertyIds=${arg.propertyId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error((await res.text()) || "Failed to unlink property");
  return res.json();
}

async function linkClientsToMandateFetcher(
  url: string,
  { arg }: { arg: { mandateId: string; clientIds: string[] } }
): Promise<{ links: any[] }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to link clients");
  return res.json();
}

async function unlinkClientFromMandateFetcher(
  url: string,
  { arg }: { arg: { mandateId: string; clientId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(
    `${url}?mandateId=${arg.mandateId}&clientIds=${arg.clientId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error((await res.text()) || "Failed to unlink client");
  return res.json();
}

async function linkMandatesToPropertyFetcher(
  url: string,
  { arg }: { arg: { propertyId: string; mandateIds: string[] } }
): Promise<{ links: any[] }> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to link mandates");
  return res.json();
}

async function unlinkMandateFromPropertyFetcher(
  url: string,
  { arg }: { arg: { propertyId: string; mandateId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(
    `${url}?mandateId=${arg.mandateId}&propertyIds=${arg.propertyId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error((await res.text()) || "Failed to unlink mandate");
  return res.json();
}

async function linkMandatesToClientFetcher(
  url: string,
  { arg }: { arg: { clientId: string; mandateIds: string[] } }
): Promise<{ links: any[] }> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to link mandates");
  return res.json();
}

async function unlinkMandateFromClientFetcher(
  url: string,
  { arg }: { arg: { clientId: string; mandateId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(
    `${url}?mandateId=${arg.mandateId}&clientIds=${arg.clientId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error((await res.text()) || "Failed to unlink mandate");
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

// ============================================================
// Mandate ↔ Property Hooks
// ============================================================

/**
 * Hook to link properties to a mandate
 * Invalidates mandate linked entities cache after mutation
 */
export function useLinkPropertiesToMandate(mandateId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    linkPropertiesToMandateFetcher,
    {
      onSuccess: () => {
        globalMutate(getMandateLinkedKey(mandateId));
      },
    }
  );

  const linkProperties = async (propertyIds: string[]) => {
    return trigger({ mandateId, propertyIds });
  };

  return {
    linkProperties,
    isLinking: isMutating,
    error,
  };
}

/**
 * Hook to unlink a property from a mandate
 * Invalidates mandate linked entities cache after mutation
 */
export function useUnlinkPropertyFromMandate(mandateId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    unlinkPropertyFromMandateFetcher,
    {
      onSuccess: () => {
        globalMutate(getMandateLinkedKey(mandateId));
      },
    }
  );

  const unlinkProperty = async (propertyId: string) => {
    return trigger({ mandateId, propertyId });
  };

  return {
    unlinkProperty,
    isUnlinking: isMutating,
    error,
  };
}

// ============================================================
// Mandate ↔ Client Hooks
// ============================================================

/**
 * Hook to link clients to a mandate
 * Invalidates mandate linked entities cache after mutation
 */
export function useLinkClientsToMandate(mandateId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    linkClientsToMandateFetcher,
    {
      onSuccess: () => {
        globalMutate(getMandateLinkedKey(mandateId));
      },
    }
  );

  const linkClients = async (clientIds: string[]) => {
    return trigger({ mandateId, clientIds });
  };

  return {
    linkClients,
    isLinking: isMutating,
    error,
  };
}

/**
 * Hook to unlink a client from a mandate
 * Invalidates mandate linked entities cache after mutation
 */
export function useUnlinkClientFromMandate(mandateId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    unlinkClientFromMandateFetcher,
    {
      onSuccess: () => {
        globalMutate(getMandateLinkedKey(mandateId));
      },
    }
  );

  const unlinkClient = async (clientId: string) => {
    return trigger({ mandateId, clientId });
  };

  return {
    unlinkClient,
    isUnlinking: isMutating,
    error,
  };
}

// ============================================================
// Reverse: Property/Client → Mandate Hooks
// ============================================================

/**
 * Hook to link mandates to a property
 * Invalidates property linked entities cache after mutation
 */
export function useLinkMandatesToProperty(propertyId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    linkMandatesToPropertyFetcher,
    {
      onSuccess: () => {
        globalMutate(getPropertyLinkedKey(propertyId));
      },
    }
  );

  const linkMandates = async (mandateIds: string[]) => {
    return trigger({ propertyId, mandateIds });
  };

  return {
    linkMandates,
    isLinking: isMutating,
    error,
  };
}

/**
 * Hook to unlink a mandate from a property
 * Invalidates property linked entities cache after mutation
 */
export function useUnlinkMandateFromProperty(propertyId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    unlinkMandateFromPropertyFetcher,
    {
      onSuccess: () => {
        globalMutate(getPropertyLinkedKey(propertyId));
      },
    }
  );

  const unlinkMandate = async (mandateId: string) => {
    return trigger({ propertyId, mandateId });
  };

  return {
    unlinkMandate,
    isUnlinking: isMutating,
    error,
  };
}

/**
 * Hook to link mandates to a client
 * Invalidates client linked entities cache after mutation
 */
export function useLinkMandatesToClient(clientId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    linkMandatesToClientFetcher,
    {
      onSuccess: () => {
        globalMutate(getClientLinkedKey(clientId));
      },
    }
  );

  const linkMandates = async (mandateIds: string[]) => {
    return trigger({ clientId, mandateIds });
  };

  return {
    linkMandates,
    isLinking: isMutating,
    error,
  };
}

/**
 * Hook to unlink a mandate from a client
 * Invalidates client linked entities cache after mutation
 */
export function useUnlinkMandateFromClient(clientId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    unlinkMandateFromClientFetcher,
    {
      onSuccess: () => {
        globalMutate(getClientLinkedKey(clientId));
      },
    }
  );

  const unlinkMandate = async (mandateId: string) => {
    return trigger({ clientId, mandateId });
  };

  return {
    unlinkMandate,
    isUnlinking: isMutating,
    error,
  };
}
