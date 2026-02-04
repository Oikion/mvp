/**
 * Export Job Handler
 * 
 * Helper to decide whether to use K8s jobs or inline export
 * based on row count and format.
 */

import { submitJob } from "@/lib/jobs";
import type { BulkExportPayload } from "@/lib/jobs/types";

// Feature flag: Use K8s Jobs for exports
const USE_K8S_JOBS = process.env.USE_K8S_JOBS === "true";

// Thresholds for using K8s jobs
const ROW_THRESHOLD = 1000;
const PDF_ROW_THRESHOLD = 500; // PDF is more resource-intensive

export interface ExportJobOptions {
  organizationId: string;
  exportType: "crm" | "mls" | "reports" | "calendar";
  format: "xlsx" | "xls" | "csv" | "pdf" | "xml";
  rowCount: number;
  filters?: Record<string, unknown>;
  locale?: "en" | "el";
  recipientEmail?: string;
}

export interface ExportJobResult {
  useK8s: boolean;
  jobId?: string;
  message: string;
}

/**
 * Determine if export should use K8s job
 */
export function shouldUseK8sForExport(options: ExportJobOptions): boolean {
  if (!USE_K8S_JOBS) return false;
  
  const threshold = options.format === "pdf" ? PDF_ROW_THRESHOLD : ROW_THRESHOLD;
  return options.rowCount > threshold;
}

/**
 * Submit export job to K8s
 */
export async function submitExportJob(options: ExportJobOptions): Promise<ExportJobResult> {
  if (!shouldUseK8sForExport(options)) {
    return {
      useK8s: false,
      message: "Export will be processed inline",
    };
  }

  const payload: BulkExportPayload = {
    type: "bulk-export",
    exportType: options.exportType,
    format: options.format,
    filters: options.filters,
    locale: options.locale,
  };

  const result = await submitJob({
    type: "bulk-export",
    organizationId: options.organizationId,
    payload,
    priority: "normal",
  });

  if (!result.success) {
    // Fall back to inline processing
    return {
      useK8s: false,
      message: result.message || "K8s job submission failed, falling back to inline",
    };
  }

  return {
    useK8s: true,
    jobId: result.jobId,
    message: `Export queued (${options.rowCount} rows). You will be notified when ready.`,
  };
}
