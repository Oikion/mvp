"use client";

import useSWR from "swr";
import fetcher from "@/lib/fetcher";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocTemplateCategory =
  | "LISTING_AGREEMENT"
  | "BUYER_AGREEMENT"
  | "OFFER"
  | "COUNTER_OFFER"
  | "PURCHASE_CONTRACT"
  | "TRANSFER_DEED"
  | "POWER_OF_ATTORNEY"
  | "NDA"
  | "GENERAL";

export interface DocumentTemplate {
  id: string;
  name: string;
  nameEn: string;
  nameEl: string;
  description: string | null;
  descriptionEl: string | null;
  templateType: string;
  placeholders: unknown;
  docxUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DocumentTemplatesResponse {
  data: DocumentTemplate[];
}

export interface UseDocumentTemplatesOptions {
  enabled?: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches the global system document templates (read-only, org-independent).
 * Templates are stable reference data; use a long dedupingInterval.
 */
export function useDocumentTemplates(
  options: UseDocumentTemplatesOptions = {}
) {
  const { enabled = true } = options;

  const { data, error, isLoading, mutate } =
    useSWR<DocumentTemplatesResponse>(
      enabled ? "/api/document-templates" : null,
      fetcher,
      {
        revalidateOnFocus: false,
        // Templates are stable reference data — dedupe for 60 s
        dedupingInterval: 60000,
      }
    );

  return {
    templates: data?.data ?? [],
    isLoading,
    error,
    mutate,
    refresh: () => mutate(),
  };
}
