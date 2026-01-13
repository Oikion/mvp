/**
 * Export Module
 * 
 * Provides comprehensive export functionality for CRM, MLS, Calendar, and Reports modules.
 * Supports XLS, XLSX, CSV, and PDF formats with security measures.
 */

// Security utilities
export {
  // Types
  type ExportFormat,
  type ExportModule,
  type ExportAuditLog,
  type ExportOptions,
  type ExportResult,
  type RowLimitCheck,
  // Constants
  EXPORT_ROW_LIMITS,
  CONTENT_TYPES,
  // Functions
  sanitizeForExport,
  sanitizeRow,
  sanitizeRows,
  sanitizeFilename,
  generateExportFilename,
  getSecureDownloadHeaders,
  checkExportRateLimit,
  createRateLimitResponse,
  checkRowLimit,
  createRowLimitResponse,
  createExportAuditLog,
  logExportEvent,
} from "./security";

// Data formatting utilities
export {
  // Types
  type ColumnDefinition,
  type FormatterOptions,
  // Column definitions
  CRM_COLUMNS,
  MLS_COLUMNS,
  CALENDAR_COLUMNS,
  REPORTS_COLUMNS,
  // Functions
  getColumnsForModule,
  formatDateValue,
  formatCurrencyValue,
  formatBooleanValue,
  formatEnumValue,
  formatCellValue,
  formatRow,
  formatRows,
  getColumnHeaders,
  getColumnWidths,
  flattenObject,
  extractColumns,
  addAssignedUserName,
} from "./data-formatter";

// Excel/CSV generation
export {
  // Types
  type ExcelGeneratorOptions,
  type GeneratedFile,
  type SheetData,
  // Functions
  generateWorkbook,
  generateXLSX,
  generateXLS,
  generateCSV,
  generateExportFile,
  generateMultiSheetWorkbook,
  generateMultiSheetXLSX,
} from "./excel-generator";

// PDF generation
export {
  // Types
  type PDFExportOptions,
  type CalendarPDFOptions,
  // Functions
  generateCRMPDF,
  generateMLSPDF,
  generateCalendarPDF,
  generateReportsPDF,
  generateTablePDF,
} from "./pdf-export-generator";
