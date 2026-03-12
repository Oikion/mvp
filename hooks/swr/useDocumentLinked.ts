import useSWR from "swr";

interface LinkedClient {
  id: string;
  friendlyId: string;
  client_name: string;
  client_type?: string;
  client_status?: string;
  primary_email?: string;
  primary_phone?: string;
  assigned_to_user?: { id: string; name: string | null } | null;
}

interface LinkedProperty {
  id: string;
  friendlyId: string;
  property_name: string;
  property_type?: string;
  property_status?: string;
  address_street?: string;
  address_city?: string;
  area?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  assigned_to_user?: { id: string; name: string | null } | null;
}

interface LinkedMandate {
  id: string;
  friendlyId: string;
  title: string;
  transaction_type?: string;
  status?: string;
  urgency?: string;
  budget_min?: number;
  budget_max?: number;
}

interface DocumentLinkedData {
  document?: { id: string; friendlyId: string };
  clients: LinkedClient[];
  properties: LinkedProperty[];
  mandates: LinkedMandate[];
  counts: {
    clients: number;
    properties: number;
    mandates: number;
  };
}

interface UseDocumentLinkedOptions {
  enabled?: boolean;
}

export function useDocumentLinked(
  documentId: string | undefined,
  options: UseDocumentLinkedOptions = {}
) {
  const { enabled = true } = options;

  const key = enabled && documentId ? `/api/documents/${documentId}/linked` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<DocumentLinkedData>(key);

  return {
    linkedData: data ?? null,
    clients: data?.clients ?? [],
    properties: data?.properties ?? [],
    mandates: data?.mandates ?? [],
    counts: data?.counts ?? { clients: 0, properties: 0, mandates: 0 },
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function getDocumentLinkedKey(documentId: string): string {
  return `/api/documents/${documentId}/linked`;
}
