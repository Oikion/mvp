/**
 * Export Security Utilities
 * 
 * Provides security measures for data exports including:
 * - CSV/Excel injection prevention
 * - Data sanitization
 * - Filename sanitization
 * - Audit logging types
 * - Export rate limiting configuration
 */

import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";

// ============================================
// TYPES
// ============================================

export type ExportFormat = "xlsx" | "xls" | "csv" | "pdf" | "xml";
export type ExportModule = "crm" | "mls" | "calendar" | "reports";

export interface ExportAuditLog {
  userId: string;
  organizationId: string;
  exportType: ExportModule;
  format: ExportFormat;
  rowCount: number;
  timestamp: Date;
  filters?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

export interface ExportOptions {
  format: ExportFormat;
  scope: "filtered" | "all";
  filters?: Record<string, unknown>;
}

export interface ExportResult {
  success: boolean;
  data?: Buffer | Blob;
  filename?: string;
  contentType?: string;
  error?: string;
  rowCount?: number;
}

// ============================================
// ROW LIMITS
// ============================================

export const EXPORT_ROW_LIMITS: Record<ExportModule, number> = {
  crm: 10000,
  mls: 10000,
  calendar: 1000,
  reports: Infinity, // Aggregated data only
};

// ============================================
// CSV/EXCEL INJECTION PREVENTION
// ============================================

/**
 * Characters that can trigger formula execution in Excel/Sheets
 * when a cell value starts with them
 */
const FORMULA_TRIGGER_CHARS = /^[=+\-@\t\r\n]/;

/**
 * Additional potentially dangerous patterns
 */
const DANGEROUS_PATTERNS = [
  /^DDE\(/i,        // DDE injection
  /^cmd\|/i,        // Command injection
  /^HYPERLINK\(/i,  // Hyperlink injection
];

/**
 * Sanitize a single cell value to prevent CSV/Excel formula injection
 * 
 * This prefixes dangerous characters with a single quote (') which
 * tells Excel to treat the content as text rather than a formula.
 * 
 * @param value - The cell value to sanitize
 * @returns Sanitized value safe for export
 */
export function sanitizeForExport(value: unknown): string {
  // Handle non-string values
  if (value === null || value === undefined) {
    return "";
  }
  
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  
  if (typeof value !== "string") {
    // For objects/arrays, stringify and then sanitize
    try {
      const stringified = JSON.stringify(value);
      return sanitizeStringValue(stringified);
    } catch {
      return "";
    }
  }
  
  return sanitizeStringValue(value);
}

/**
 * Internal helper to sanitize string values
 */
function sanitizeStringValue(value: string): string {
  // Check for formula trigger characters at the start
  if (FORMULA_TRIGGER_CHARS.test(value)) {
    return `'${value}`;
  }
  
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(value)) {
      return `'${value}`;
    }
  }
  
  return value;
}

/**
 * Sanitize an entire row of data
 * 
 * @param row - Object with key-value pairs representing a row
 * @returns Sanitized row
 */
export function sanitizeRow<T extends Record<string, unknown>>(row: T): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(row)) {
    sanitized[key] = sanitizeForExport(value);
  }
  
  return sanitized;
}

/**
 * Sanitize an array of rows
 * 
 * @param rows - Array of row objects
 * @returns Array of sanitized rows
 */
export function sanitizeRows<T extends Record<string, unknown>>(rows: T[]): Record<string, string>[] {
  return rows.map(row => sanitizeRow(row));
}

// ============================================
// FILENAME SANITIZATION
// ============================================

/**
 * Characters not allowed in filenames
 */
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

/**
 * Sanitize a filename to prevent path traversal and invalid characters
 * 
 * @param filename - The proposed filename
 * @param defaultName - Default name if sanitization results in empty string
 * @returns Safe filename
 */
export function sanitizeFilename(filename: string, defaultName = "export"): string {
  // Remove invalid characters
  let safe = filename.replace(INVALID_FILENAME_CHARS, "_");
  
  // Remove any path components (prevent directory traversal)
  safe = safe.replace(/\.\./g, "_");
  safe = safe.split(/[/\\]/).pop() || defaultName;
  
  // Trim whitespace and dots from start/end
  safe = safe.replace(/^[\s.]+|[\s.]+$/g, "");
  
  // Ensure we have a valid filename
  if (!safe || safe.length === 0) {
    safe = defaultName;
  }
  
  // Limit length to 200 characters (leaving room for extension)
  if (safe.length > 200) {
    safe = safe.substring(0, 200);
  }
  
  return safe;
}

/**
 * Generate a standardized export filename
 * 
 * @param module - The export module (crm, mls, calendar, reports)
 * @param format - The export format
 * @param prefix - Optional prefix for the filename
 * @returns Formatted filename with extension
 */
export function generateExportFilename(
  module: ExportModule,
  format: ExportFormat,
  prefix?: string
): string {
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const baseName = prefix ? `${prefix}_${module}` : module;
  const safeName = sanitizeFilename(`${baseName}_${timestamp}`);
  
  const extensions: Record<ExportFormat, string> = {
    xlsx: ".xlsx",
    xls: ".xls",
    csv: ".csv",
    pdf: ".pdf",
    xml: ".xml",
  };
  
  return `${safeName}${extensions[format]}`;
}

// ============================================
// CONTENT TYPE MAPPING
// ============================================

export const CONTENT_TYPES: Record<ExportFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv; charset=utf-8",
  pdf: "application/pdf",
  xml: "application/xml; charset=utf-8",
};

// ============================================
// SECURE RESPONSE HEADERS
// ============================================

/**
 * Generate secure headers for file download responses
 * 
 * @param filename - The download filename
 * @param format - The export format
 * @returns Headers object for the response
 */
export function getSecureDownloadHeaders(
  filename: string,
  format: ExportFormat
): Record<string, string> {
  const safeFilename = sanitizeFilename(filename);
  
  return {
    "Content-Type": CONTENT_TYPES[format],
    "Content-Disposition": `attachment; filename="${safeFilename}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "Pragma": "no-cache",
    "Expires": "0",
  };
}

// ============================================
// RATE LIMITING FOR EXPORTS
// ============================================

// Export-specific rate limit: 5 exports per minute
const EXPORT_RATE_LIMIT = {
  requests: 5,
  window: "1m",
};

/**
 * Check export rate limit for a user
 * 
 * @param req - The incoming request
 * @returns Rate limit result
 */
export async function checkExportRateLimit(req: Request): Promise<{
  success: boolean;
  remaining: number;
  reset: number;
}> {
  const identifier = getRateLimitIdentifier(req);
  const result = await rateLimit(`export:${identifier}`, "strict");
  
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(reset: number): Response {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      message: "Too many export requests. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Reset": String(reset),
      },
    }
  );
}

// ============================================
// ROW LIMIT VALIDATION
// ============================================

export interface RowLimitCheck {
  allowed: boolean;
  limit: number;
  count: number;
  message?: string;
}

/**
 * Check if the number of rows exceeds the export limit
 * 
 * @param module - The export module
 * @param rowCount - The number of rows to export
 * @returns Row limit check result
 */
export function checkRowLimit(module: ExportModule, rowCount: number): RowLimitCheck {
  const limit = EXPORT_ROW_LIMITS[module];
  
  if (rowCount <= limit) {
    return {
      allowed: true,
      limit,
      count: rowCount,
    };
  }
  
  return {
    allowed: false,
    limit,
    count: rowCount,
    message: `Export limit exceeded. Maximum ${limit.toLocaleString()} rows allowed for ${module} exports. You have ${rowCount.toLocaleString()} rows. Please apply filters to reduce the data set.`,
  };
}

/**
 * Create row limit exceeded response
 */
export function createRowLimitResponse(check: RowLimitCheck): Response {
  return new Response(
    JSON.stringify({
      error: "Row limit exceeded",
      message: check.message,
      limit: check.limit,
      count: check.count,
    }),
    {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

// ============================================
// AUDIT LOGGING
// ============================================

/**
 * Create an export audit log entry
 * 
 * Note: This creates the log object. The actual persistence
 * should be handled by the caller (e.g., writing to database or logging service)
 */
export function createExportAuditLog(
  params: Omit<ExportAuditLog, "timestamp">
): ExportAuditLog {
  return {
    ...params,
    timestamp: new Date(),
  };
}

/**
 * Log an export event to console (for development)
 * In production, this should be replaced with proper logging service
 */
export function logExportEvent(log: ExportAuditLog): void {
  const logLevel = log.success ? "info" : "warn";
  const logData = {
    type: "EXPORT_AUDIT",
    ...log,
    timestamp: log.timestamp.toISOString(),
  };
  
  if (logLevel === "warn") {
    console.warn("[EXPORT]", JSON.stringify(logData));
  } else {
    console.log("[EXPORT]", JSON.stringify(logData));
  }
}
