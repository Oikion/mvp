import useSWR from "swr";
import type { MessagingPlatform } from "@/types/messaging";
import fetcher from "@/lib/fetcher";

export interface ExternalIntegration {
  id: string;
  organizationId: string;
  platform: MessagingPlatform;
  displayName: string | null;
  phoneNumber: string | null;
  platformAccountId: string | null;
  isActive: boolean;
  connectedAt: string;
  lastSyncAt: string | null;
  _count?: {
    externalContacts: number;
  };
}

interface IntegrationsResponse {
  data: {
    integrations: ExternalIntegration[];
  };
}

export function useExternalIntegrations(options?: { enabled?: boolean; refreshInterval?: number }) {
  const { data, error, isLoading, mutate } = useSWR<IntegrationsResponse>(
    options?.enabled === false ? null : "/api/messaging/integrations",
    fetcher,
    {
      refreshInterval: options?.refreshInterval ?? 0,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    integrations: data?.data.integrations ?? [],
    isLoading,
    error,
    refresh: () => mutate(),
  };
}
