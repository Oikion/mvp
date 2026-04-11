import useSWRMutation from "swr/mutation";
import { useSWRConfig } from "swr";
import { getPropertyLinkedKey } from "./usePropertyLinked";
import { getMandateLinkedKey } from "./useMandateLinked";
import { getDocumentLinkedKey } from "./useDocumentLinked";
import { getContactLinkedKey } from "./useContactLinked";
import { getRequestLinkedKey } from "./useRequestLinked";

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

// Link multiple contacts to a property — iterates per contactId
async function linkClientsToPropertyFetcher(
  _url: string,
  { arg }: { arg: { propertyId: string; clientIds: string[] } }
): Promise<LinkResponse> {
  const results = await Promise.all(
    arg.clientIds.map((contactId) =>
      fetch(`/api/crm/contacts/${contactId}/link-entities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyIds: [arg.propertyId] }),
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || "Failed to link contact to property");
        }
        return res.json();
      })
    )
  );

  // Return a normalised shape for cache invalidation callers
  return { links: results.map((_, i) => ({ clientId: arg.clientIds[i], propertyId: arg.propertyId })) };
}

// Unlink a contact from a property via the contact-centric endpoint
async function unlinkClientFromPropertyFetcher(
  _url: string,
  { arg }: { arg: { clientId: string; propertyId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(
    `/api/crm/contacts/${arg.clientId}/link-entities?propertyId=${arg.propertyId}`,
    { method: "DELETE" }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to unlink contact from property");
  }

  return res.json();
}

// Link properties to a contact via the contact-centric endpoint
async function linkPropertiesToClientFetcher(
  url: string,
  { arg }: { arg: { clientId: string; propertyIds: string[] } }
): Promise<LinkResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyIds: arg.propertyIds }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to link properties");
  }

  return res.json();
}

// Unlink a property from a contact via the contact-centric endpoint
async function unlinkPropertyFromClientFetcher(
  url: string,
  { arg }: { arg: { clientId: string; propertyId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(
    `${url}?propertyId=${arg.propertyId}`,
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
    "/api/crm/contacts/link-entities-property",
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
    "/api/crm/contacts/link-entities-property",
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
 * Hook to link properties to a contact
 * Invalidates contact linked entities cache after mutation
 */
export function useLinkPropertiesToClient(clientId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/crm/contacts/${clientId}/link-entities`,
    linkPropertiesToClientFetcher,
    {
      onSuccess: () => {
        // Invalidate contact linked cache
        globalMutate(getContactLinkedKey(clientId));
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
 * Hook to unlink a property from a contact
 * Invalidates contact linked entities cache after mutation
 */
export function useUnlinkPropertyFromClient(clientId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/crm/contacts/${clientId}/link-entities`,
    unlinkPropertyFromClientFetcher,
    {
      onSuccess: () => {
        // Invalidate contact linked cache
        globalMutate(getContactLinkedKey(clientId));
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
        globalMutate(getContactLinkedKey(clientId));
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
        globalMutate(getContactLinkedKey(clientId));
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

// ============================================================
// Document Fetchers
// ============================================================

async function linkEntitiesToDocumentFetcher(
  url: string,
  { arg }: { arg: { clientIds?: string[]; propertyIds?: string[]; mandateIds?: string[] } }
): Promise<{ success: boolean }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to link entities");
  return res.json();
}

async function unlinkEntityFromDocumentFetcher(
  url: string,
  { arg }: { arg: { clientIds?: string; propertyIds?: string; mandateIds?: string } }
): Promise<UnlinkResponse> {
  const params = new URLSearchParams();
  if (arg.clientIds) params.set("clientIds", arg.clientIds);
  if (arg.propertyIds) params.set("propertyIds", arg.propertyIds);
  if (arg.mandateIds) params.set("mandateIds", arg.mandateIds);
  const res = await fetch(`${url}?${params.toString()}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.text()) || "Failed to unlink entity");
  return res.json();
}

// ============================================================
// Document ↔ Client Hooks
// ============================================================

export function useLinkClientsToDocument(documentId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/documents/${documentId}/link-entities`,
    linkEntitiesToDocumentFetcher,
    {
      onSuccess: () => {
        globalMutate(getDocumentLinkedKey(documentId));
      },
    }
  );

  const linkClients = async (clientIds: string[]) => {
    return trigger({ clientIds });
  };

  return { linkClients, isLinking: isMutating, error };
}

export function useUnlinkClientFromDocument(documentId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/documents/${documentId}/link-entities`,
    unlinkEntityFromDocumentFetcher,
    {
      onSuccess: () => {
        globalMutate(getDocumentLinkedKey(documentId));
      },
    }
  );

  const unlinkClient = async (clientId: string) => {
    return trigger({ clientIds: clientId });
  };

  return { unlinkClient, isUnlinking: isMutating, error };
}

// ============================================================
// Document ↔ Property Hooks
// ============================================================

export function useLinkPropertiesToDocument(documentId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/documents/${documentId}/link-entities`,
    linkEntitiesToDocumentFetcher,
    {
      onSuccess: () => {
        globalMutate(getDocumentLinkedKey(documentId));
      },
    }
  );

  const linkProperties = async (propertyIds: string[]) => {
    return trigger({ propertyIds });
  };

  return { linkProperties, isLinking: isMutating, error };
}

export function useUnlinkPropertyFromDocument(documentId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/documents/${documentId}/link-entities`,
    unlinkEntityFromDocumentFetcher,
    {
      onSuccess: () => {
        globalMutate(getDocumentLinkedKey(documentId));
      },
    }
  );

  const unlinkProperty = async (propertyId: string) => {
    return trigger({ propertyIds: propertyId });
  };

  return { unlinkProperty, isUnlinking: isMutating, error };
}

// ============================================================
// Document ↔ Mandate Hooks
// ============================================================

export function useLinkMandatesToDocument(documentId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/documents/${documentId}/link-entities`,
    linkEntitiesToDocumentFetcher,
    {
      onSuccess: () => {
        globalMutate(getDocumentLinkedKey(documentId));
      },
    }
  );

  const linkMandates = async (mandateIds: string[]) => {
    return trigger({ mandateIds });
  };

  return { linkMandates, isLinking: isMutating, error };
}

export function useUnlinkMandateFromDocument(documentId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/documents/${documentId}/link-entities`,
    unlinkEntityFromDocumentFetcher,
    {
      onSuccess: () => {
        globalMutate(getDocumentLinkedKey(documentId));
      },
    }
  );

  const unlinkMandate = async (mandateId: string) => {
    return trigger({ mandateIds: mandateId });
  };

  return { unlinkMandate, isUnlinking: isMutating, error };
}

// ============================================================
// Reverse: Entity → Document Hooks (for entity detail pages)
// ============================================================

export function useLinkDocumentsToClient(clientId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/documents/link-to-client/${clientId}`,
    async (url: string, { arg }: { arg: { clientId: string; documentIds: string[] } }) => {
      const results = await Promise.all(
        arg.documentIds.map((docId) =>
          fetch(`/api/documents/${docId}/link-entities`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientIds: [arg.clientId] }),
          })
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) throw new Error("Failed to link some documents");
      return { success: true };
    },
    {
      onSuccess: () => {
        globalMutate(getContactLinkedKey(clientId));
      },
    }
  );

  const linkDocuments = async (documentIds: string[]) => {
    return trigger({ clientId, documentIds });
  };

  return { linkDocuments, isLinking: isMutating, error };
}

export function useUnlinkDocumentFromClient(clientId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/documents/unlink-from-client/${clientId}`,
    async (_url: string, { arg }: { arg: { clientId: string; documentId: string } }) => {
      const res = await fetch(
        `/api/documents/${arg.documentId}/link-entities?clientIds=${arg.clientId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to unlink document");
      return res.json();
    },
    {
      onSuccess: () => {
        globalMutate(getContactLinkedKey(clientId));
      },
    }
  );

  const unlinkDocument = async (documentId: string) => {
    return trigger({ clientId, documentId });
  };

  return { unlinkDocument, isUnlinking: isMutating, error };
}

export function useLinkDocumentsToProperty(propertyId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/documents/link-to-property/${propertyId}`,
    async (url: string, { arg }: { arg: { propertyId: string; documentIds: string[] } }) => {
      const results = await Promise.all(
        arg.documentIds.map((docId) =>
          fetch(`/api/documents/${docId}/link-entities`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ propertyIds: [arg.propertyId] }),
          })
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) throw new Error("Failed to link some documents");
      return { success: true };
    },
    {
      onSuccess: () => {
        globalMutate(getPropertyLinkedKey(propertyId));
      },
    }
  );

  const linkDocuments = async (documentIds: string[]) => {
    return trigger({ propertyId, documentIds });
  };

  return { linkDocuments, isLinking: isMutating, error };
}

export function useUnlinkDocumentFromProperty(propertyId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/documents/unlink-from-property/${propertyId}`,
    async (_url: string, { arg }: { arg: { propertyId: string; documentId: string } }) => {
      const res = await fetch(
        `/api/documents/${arg.documentId}/link-entities?propertyIds=${arg.propertyId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to unlink document");
      return res.json();
    },
    {
      onSuccess: () => {
        globalMutate(getPropertyLinkedKey(propertyId));
      },
    }
  );

  const unlinkDocument = async (documentId: string) => {
    return trigger({ propertyId, documentId });
  };

  return { unlinkDocument, isUnlinking: isMutating, error };
}

export function useLinkDocumentsToMandate(mandateId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/documents/link-to-mandate/${mandateId}`,
    async (url: string, { arg }: { arg: { mandateId: string; documentIds: string[] } }) => {
      const results = await Promise.all(
        arg.documentIds.map((docId) =>
          fetch(`/api/documents/${docId}/link-entities`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mandateIds: [arg.mandateId] }),
          })
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) throw new Error("Failed to link some documents");
      return { success: true };
    },
    {
      onSuccess: () => {
        globalMutate(getMandateLinkedKey(mandateId));
      },
    }
  );

  const linkDocuments = async (documentIds: string[]) => {
    return trigger({ mandateId, documentIds });
  };

  return { linkDocuments, isLinking: isMutating, error };
}

export function useUnlinkDocumentFromMandate(mandateId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/documents/unlink-from-mandate/${mandateId}`,
    async (_url: string, { arg }: { arg: { mandateId: string; documentId: string } }) => {
      const res = await fetch(
        `/api/documents/${arg.documentId}/link-entities?mandateIds=${arg.mandateId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to unlink document");
      return res.json();
    },
    {
      onSuccess: () => {
        globalMutate(getMandateLinkedKey(mandateId));
      },
    }
  );

  const unlinkDocument = async (documentId: string) => {
    return trigger({ mandateId, documentId });
  };

  return { unlinkDocument, isUnlinking: isMutating, error };
}

// ============================================================
// Contact ↔ Request Fetchers
// ============================================================

async function linkRequestsToContactFetcher(
  url: string,
  { arg }: { arg: { requestIds: string[] } }
): Promise<{ links: any[] }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to link requests");
  return res.json();
}

async function unlinkRequestFromContactFetcher(
  url: string,
  { arg }: { arg: { requestId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(`${url}?requestId=${arg.requestId}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.text()) || "Failed to unlink request");
  return res.json();
}

// ============================================================
// Contact ↔ Property Fetchers
// ============================================================

async function linkPropertiesToContactFetcher(
  url: string,
  { arg }: { arg: { propertyIds: string[] } }
): Promise<{ links: any[] }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to link properties");
  return res.json();
}

async function unlinkPropertyFromContactFetcher(
  url: string,
  { arg }: { arg: { propertyId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(`${url}?propertyId=${arg.propertyId}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.text()) || "Failed to unlink property");
  return res.json();
}

// ============================================================
// Request ↔ Contact Fetchers
// ============================================================

async function linkContactsToRequestFetcher(
  url: string,
  { arg }: { arg: { contactIds: string[] } }
): Promise<{ links: any[] }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to link contacts");
  return res.json();
}

async function unlinkContactFromRequestFetcher(
  url: string,
  { arg }: { arg: { contactId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(`${url}?contactId=${arg.contactId}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.text()) || "Failed to unlink contact");
  return res.json();
}

// ============================================================
// Request ↔ Property Fetchers
// ============================================================

async function linkPropertiesToRequestFetcher(
  url: string,
  { arg }: { arg: { propertyIds: string[] } }
): Promise<{ links: any[] }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error((await res.text()) || "Failed to link properties");
  return res.json();
}

async function unlinkPropertyFromRequestFetcher(
  url: string,
  { arg }: { arg: { propertyId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(`${url}?propertyId=${arg.propertyId}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.text()) || "Failed to unlink property");
  return res.json();
}

// ============================================================
// Contact ↔ Request Hooks
// ============================================================

/**
 * Hook to link requests to a contact
 * Invalidates contact linked entities cache after mutation
 */
export function useLinkRequestsToContact(contactId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/crm/contacts/${contactId}/link-entities`,
    linkRequestsToContactFetcher,
    {
      onSuccess: () => {
        globalMutate(getContactLinkedKey(contactId));
      },
    }
  );

  const linkRequests = async (requestIds: string[]) => {
    return trigger({ requestIds });
  };

  return {
    linkRequests,
    isLinking: isMutating,
    error,
  };
}

/**
 * Hook to unlink a request from a contact
 * Invalidates contact linked entities cache after mutation
 */
export function useUnlinkRequestFromContact(contactId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/crm/contacts/${contactId}/link-entities`,
    unlinkRequestFromContactFetcher,
    {
      onSuccess: () => {
        globalMutate(getContactLinkedKey(contactId));
      },
    }
  );

  const unlinkRequest = async (requestId: string) => {
    return trigger({ requestId });
  };

  return {
    unlinkRequest,
    isUnlinking: isMutating,
    error,
  };
}

// ============================================================
// Contact ↔ Property Hooks
// ============================================================

/**
 * Hook to link properties to a contact
 * Invalidates contact linked entities cache after mutation
 */
export function useLinkPropertiesToContact(contactId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/crm/contacts/${contactId}/link-entities`,
    linkPropertiesToContactFetcher,
    {
      onSuccess: () => {
        globalMutate(getContactLinkedKey(contactId));
      },
    }
  );

  const linkProperties = async (propertyIds: string[]) => {
    return trigger({ propertyIds });
  };

  return {
    linkProperties,
    isLinking: isMutating,
    error,
  };
}

/**
 * Hook to unlink a property from a contact
 * Invalidates contact linked entities cache after mutation
 */
export function useUnlinkPropertyFromContact(contactId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/crm/contacts/${contactId}/link-entities`,
    unlinkPropertyFromContactFetcher,
    {
      onSuccess: () => {
        globalMutate(getContactLinkedKey(contactId));
      },
    }
  );

  const unlinkProperty = async (propertyId: string) => {
    return trigger({ propertyId });
  };

  return {
    unlinkProperty,
    isUnlinking: isMutating,
    error,
  };
}

// ============================================================
// Request ↔ Contact Hooks
// ============================================================

/**
 * Hook to link contacts to a request
 * Invalidates request linked entities cache after mutation
 */
export function useLinkContactsToRequest(requestId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/requests/${requestId}/link-entities`,
    linkContactsToRequestFetcher,
    {
      onSuccess: () => {
        globalMutate(getRequestLinkedKey(requestId));
      },
    }
  );

  const linkContacts = async (contactIds: string[]) => {
    return trigger({ contactIds });
  };

  return {
    linkContacts,
    isLinking: isMutating,
    error,
  };
}

/**
 * Hook to unlink a contact from a request
 * Invalidates request linked entities cache after mutation
 */
export function useUnlinkContactFromRequest(requestId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/requests/${requestId}/link-entities`,
    unlinkContactFromRequestFetcher,
    {
      onSuccess: () => {
        globalMutate(getRequestLinkedKey(requestId));
      },
    }
  );

  const unlinkContact = async (contactId: string) => {
    return trigger({ contactId });
  };

  return {
    unlinkContact,
    isUnlinking: isMutating,
    error,
  };
}

// ============================================================
// Request ↔ Property Hooks
// ============================================================

/**
 * Hook to link properties to a request
 * Invalidates request linked entities cache after mutation
 */
export function useLinkPropertiesToRequest(requestId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/requests/${requestId}/link-entities`,
    linkPropertiesToRequestFetcher,
    {
      onSuccess: () => {
        globalMutate(getRequestLinkedKey(requestId));
      },
    }
  );

  const linkProperties = async (propertyIds: string[]) => {
    return trigger({ propertyIds });
  };

  return {
    linkProperties,
    isLinking: isMutating,
    error,
  };
}

/**
 * Hook to unlink a property from a request
 * Invalidates request linked entities cache after mutation
 */
export function useUnlinkPropertyFromRequest(requestId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/requests/${requestId}/link-entities`,
    unlinkPropertyFromRequestFetcher,
    {
      onSuccess: () => {
        globalMutate(getRequestLinkedKey(requestId));
      },
    }
  );

  const unlinkProperty = async (propertyId: string) => {
    return trigger({ propertyId });
  };

  return {
    unlinkProperty,
    isUnlinking: isMutating,
    error,
  };
}
