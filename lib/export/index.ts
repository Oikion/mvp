/**
 * Export Module
 * 
 * Provides comprehensive export functionality for CRM, MLS, Calendar, and Reports modules.
 * Supports XLS, XLSX, CSV, XML, and PDF formats with security measures.
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

// Filename generation
export {
  // Types
  type PropertyFilenameParams,
  type BulkFilenameParams,
  type FilenameGeneratorOptions,
  // Functions
  transliterateGreek,
  slugify,
  generatePropertyFilename,
  generateBulkFilename,
  generateClientFilename,
  generateDescriptiveFilename,
} from "./filename-generator";

// Export templates
export {
  // Types
  type ExportTemplateType,
  type ExportTemplate,
  // Constants
  EXPORT_TEMPLATES,
  CMA_TEMPLATE,
  SHORTLIST_TEMPLATE,
  ROI_TEMPLATE,
  MARKET_TRENDS_TEMPLATE,
  // Column definitions
  CMA_COLUMNS,
  SHORTLIST_COLUMNS,
  ROI_COLUMNS,
  MARKET_TRENDS_COLUMNS,
  // Functions
  getAllTemplates,
  getTemplate,
  getSingleExportTemplates,
  getBulkExportTemplates,
  getTemplateColumns,
  getChangeDetectionFields,
} from "./templates";

// Export history tracking
export {
  // Types
  type RecordExportParams,
  type ExportHistoryRecord,
  type ChangeDetectionResult,
  type ChangedField,
  // Functions
  recordExport,
  getExportHistory,
  getEntityExportHistory,
  detectChanges,
  getConfigurableChangeFields,
  createDataSnapshot,
} from "./history";

// Portal export templates
export {
  // Types
  type PortalId,
  type PortalFormat,
  type FieldType,
  type FieldMapping,
  type PortalTemplate,
  type PortalValidation,
  type PortalExportOptions,
  type ValidationResult,
  type PropertyData,
  type PortalExportResult,
  type MappedProperty,
  type MappingContext,
  type CustomTemplateConfig,
  type CustomFieldMapping,
  type TemplatePreset,
  // Constants
  PORTAL_TEMPLATES,
  PROPERTY_TYPE_GREEK,
  TRANSACTION_TYPE_GREEK,
  HEATING_TYPE_GREEK,
  ENERGY_CLASS_GREEK,
  FURNISHED_GREEK,
  CONDITION_GREEK,
  STATUS_GREEK,
  AVAILABLE_INTERNAL_FIELDS,
  TEMPLATE_PRESETS,
  // Portal templates
  SPITOGATOS_TEMPLATE,
  GOLDEN_HOME_TEMPLATE,
  TOSPITIMOU_TEMPLATE,
  HOME_GREEK_HOME_TEMPLATE,
  FACEBOOK_TEMPLATE,
  // Functions
  getAllPortalTemplates,
  getPortalTemplate,
  getPortalsByFormat,
  isValidPortalId,
  mapPropertyToPortal,
  mapPropertiesToPortal,
  validatePropertyForPortal,
  validatePropertiesForPortal,
  getRequiredFieldsForPortal,
  enhancePropertyWithComputed,
  sanitizeTextForExport,
  truncateText,
  buildCustomTemplate,
  createFromPreset,
  validateCustomTemplateConfig,
  serializeTemplateConfig,
  deserializeTemplateConfig,
  getAvailableFieldsByCategory,
} from "./portals";

// XML generation utilities
export {
  // Types
  type XmlGeneratorOptions,
  type XmlElementOptions,
  // Functions
  generateXml,
  generateElement,
  generateAttributes,
  generateImagesXml,
  generateLocationXml,
  generateContactXml,
  escapeXml,
  escapeXmlAttribute,
  wrapCdata,
  validateXmlString,
  xmlToBlob,
  xmlToBuffer,
} from "./xml-generator";
