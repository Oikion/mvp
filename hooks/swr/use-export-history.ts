/**
 * SWR Hook for Export History
 * 
 * Provides real-time export history data with change detection
 */

import useSWR from "swr";
import { useLocale } from "next-intl";

// ============================================
// TYPES
// ============================================

export interface ExportHistoryRecord {
  id: string;
  organizationId: string;
  userId: string;
  entityType: string;
  entityId: string;
  entityIds: string[];
  exportFormat: string;
  exportTemplate: string | null;
  destination: string | null;
  filename: string;
  rowCount: number;
  dataSnapshot: Record<string, unknown> | null;
  changeFields: string[];
  createdAt: string;
}

export interface ChangedField {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  label?: string;
}

export interface ChangeDetectionResult {
  hasChanges: boolean;
  changedFields: ChangedField[];
  lastExportDate: string;
  lastExportFormat: string;
  lastExportDestination: string | null;
}

export interface ExportHistoryResponse {
  history: ExportHistoryRecord[];
  currentData: Record<string, unknown> | null;
  changeDetection: ChangeDetectionResult | null;
  meta: {
    entityType: string;
    entityId: string;
    count: number;
  };
}

// ============================================
// FETCHER
// ============================================

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to fetch");
  }
  return res.json();
};

// ============================================
// HOOK
// ============================================

/**
 * Hook to fetch export history for a specific entity
 */
export function useExportHistory(
  entityType: string | null,
  entityId: string | null,
  options?: {
    limit?: number;
    enabled?: boolean;
  }
) {
  const locale = useLocale();
  const { limit = 10, enabled = true } = options || {};
  
  const shouldFetch = enabled && entityType && entityId;
  
  const { data, error, isLoading, mutate } = useSWR<ExportHistoryResponse>(
    shouldFetch
      ? `/api/export/history/${entityType.toLowerCase()}/${entityId}?limit=${limit}&locale=${locale}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds
    }
  );
  
  return {
    history: data?.history || [],
    currentData: data?.currentData || null,
    changeDetection: data?.changeDetection || null,
    meta: data?.meta,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to record a new export
 */
export function useRecordExport() {
  const recordExport = async (params: {
    entityType: string;
    entityId: string;
    entityIds?: string[];
    exportFormat: string;
    exportTemplate?: string;
    destination?: string;
    filename: string;
    rowCount?: number;
    entityData?: Record<string, unknown>;
  }) => {
    const response = await fetch("/api/export/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to record export");
    }
    
    return response.json();
  };
  
  return { recordExport };
}
