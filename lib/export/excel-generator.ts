/**
 * Excel/CSV Generator
 * 
 * Generates XLS, XLSX, and CSV files using the SheetJS (xlsx) library.
 * Includes security sanitization and proper formatting.
 */

import * as XLSX from "xlsx";
import {
  type ColumnDefinition,
  type FormatterOptions,
  formatRows,
  getColumnHeaders,
  getColumnWidths,
} from "./data-formatter";
import {
  type ExportFormat,
  sanitizeRows,
  generateExportFilename,
  type ExportModule,
} from "./security";

// ============================================
// TYPES
// ============================================

export interface ExcelGeneratorOptions {
  sheetName?: string;
  columns: ColumnDefinition[];
  locale?: "en" | "el";
  includeHeaders?: boolean;
  autoWidth?: boolean;
  title?: string;
  subtitle?: string;
}

export interface GeneratedFile {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert column width in characters to Excel column width units
 * Excel uses a different unit than character count
 */
function charWidthToExcel(chars: number): number {
  return Math.round(chars * 1.2);
}

/**
 * Apply column widths to worksheet
 */
function applyColumnWidths(
  worksheet: XLSX.WorkSheet,
  columns: ColumnDefinition[]
): void {
  const widths = getColumnWidths(columns);
  worksheet["!cols"] = widths.map(w => ({ wch: charWidthToExcel(w) }));
}

/**
 * Create header row style (bold)
 * Note: xlsx community edition has limited styling support
 */
function createHeaderRow(
  headers: string[],
  startRow: number = 0
): Record<string, XLSX.CellObject> {
  const cells: Record<string, XLSX.CellObject> = {};
  
  headers.forEach((header, index) => {
    const cellRef = XLSX.utils.encode_cell({ r: startRow, c: index });
    cells[cellRef] = {
      t: "s",
      v: header,
      // Font styling would require xlsx-style or similar library
    };
  });
  
  return cells;
}

// ============================================
// MAIN GENERATOR FUNCTIONS
// ============================================

/**
 * Generate an Excel workbook from data
 */
export function generateWorkbook(
  data: Record<string, unknown>[],
  options: ExcelGeneratorOptions
): XLSX.WorkBook {
  const {
    sheetName = "Export",
    columns,
    locale = "en",
    includeHeaders = true,
    autoWidth = true,
    title,
    subtitle,
  } = options;
  
  // Format the data using column definitions
  const formatterOptions: FormatterOptions = {
    locale,
    sanitize: true,
  };
  
  const formattedData = formatRows(data, columns, formatterOptions);
  
  // Get headers in the correct locale
  const headers = getColumnHeaders(columns, locale);
  
  // Prepare data for sheet
  let startRow = 0;
  const sheetData: unknown[][] = [];
  
  // Add title if provided
  if (title) {
    sheetData.push([title]);
    startRow++;
  }
  
  // Add subtitle if provided
  if (subtitle) {
    sheetData.push([subtitle]);
    startRow++;
  }
  
  // Add empty row after title/subtitle
  if (title || subtitle) {
    sheetData.push([]);
    startRow++;
  }
  
  // Add headers
  if (includeHeaders) {
    sheetData.push(headers);
    startRow++;
  }
  
  // Add data rows
  for (const row of formattedData) {
    const rowData = columns.map(col => row[col.key] ?? "");
    sheetData.push(rowData);
  }
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  
  // Apply column widths
  if (autoWidth) {
    applyColumnWidths(worksheet, columns);
  }
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  return workbook;
}

/**
 * Generate XLSX file from data
 */
export function generateXLSX(
  data: Record<string, unknown>[],
  options: ExcelGeneratorOptions
): Buffer {
  const workbook = generateWorkbook(data, options);
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

/**
 * Generate XLS file from data (legacy format)
 */
export function generateXLS(
  data: Record<string, unknown>[],
  options: ExcelGeneratorOptions
): Buffer {
  const workbook = generateWorkbook(data, options);
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xls" }));
}

/**
 * Generate CSV file from data
 */
export function generateCSV(
  data: Record<string, unknown>[],
  options: ExcelGeneratorOptions
): Buffer {
  const {
    columns,
    locale = "en",
    includeHeaders = true,
  } = options;
  
  // Format the data
  const formatterOptions: FormatterOptions = {
    locale,
    sanitize: true,
  };
  
  const formattedData = formatRows(data, columns, formatterOptions);
  
  // Get headers
  const headers = getColumnHeaders(columns, locale);
  
  // Build CSV content
  const rows: string[] = [];
  
  if (includeHeaders) {
    rows.push(headers.map(h => escapeCSVValue(h)).join(","));
  }
  
  for (const row of formattedData) {
    const rowData = columns.map(col => escapeCSVValue(row[col.key] ?? ""));
    rows.push(rowData.join(","));
  }
  
  // Add BOM for Excel UTF-8 compatibility
  const bom = "\ufeff";
  const csvContent = bom + rows.join("\r\n");
  
  return Buffer.from(csvContent, "utf-8");
}

/**
 * Escape a value for CSV format
 */
function escapeCSVValue(value: string): string {
  if (typeof value !== "string") {
    value = String(value ?? "");
  }
  
  // If the value contains comma, newline, or quote, wrap in quotes
  if (value.includes(",") || value.includes("\n") || value.includes("\r") || value.includes('"')) {
    // Escape existing quotes by doubling them
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}

// ============================================
// HIGH-LEVEL EXPORT FUNCTIONS
// ============================================

/**
 * Generate export file in the specified format
 */
export function generateExportFile(
  module: ExportModule,
  format: ExportFormat,
  data: Record<string, unknown>[],
  options: Omit<ExcelGeneratorOptions, "columns"> & { columns?: ColumnDefinition[] }
): GeneratedFile {
  // Get default columns for module if not provided
  const { getColumnsForModule } = require("./data-formatter");
  const columns = options.columns || getColumnsForModule(module);
  
  const fullOptions: ExcelGeneratorOptions = {
    ...options,
    columns,
    sheetName: options.sheetName || getSheetNameForModule(module, options.locale || "en"),
  };
  
  let buffer: Buffer;
  let contentType: string;
  
  switch (format) {
    case "xlsx":
      buffer = generateXLSX(data, fullOptions);
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      break;
    case "xls":
      buffer = generateXLS(data, fullOptions);
      contentType = "application/vnd.ms-excel";
      break;
    case "csv":
      buffer = generateCSV(data, fullOptions);
      contentType = "text/csv; charset=utf-8";
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
  
  const filename = generateExportFilename(module, format);
  
  return {
    buffer,
    filename,
    contentType,
  };
}

/**
 * Get localized sheet name for a module
 */
function getSheetNameForModule(module: ExportModule, locale: "en" | "el"): string {
  const names: Record<ExportModule, { en: string; el: string }> = {
    crm: { en: "Clients", el: "Πελάτες" },
    mls: { en: "Properties", el: "Ακίνητα" },
    calendar: { en: "Events", el: "Εκδηλώσεις" },
    reports: { en: "Reports", el: "Αναφορές" },
  };
  
  return names[module][locale];
}

// ============================================
// MULTI-SHEET WORKBOOK
// ============================================

export interface SheetData {
  name: string;
  data: Record<string, unknown>[];
  columns: ColumnDefinition[];
}

/**
 * Generate a workbook with multiple sheets
 */
export function generateMultiSheetWorkbook(
  sheets: SheetData[],
  options: Omit<ExcelGeneratorOptions, "sheetName" | "columns">
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  
  for (const sheet of sheets) {
    const sheetOptions: ExcelGeneratorOptions = {
      ...options,
      sheetName: sheet.name,
      columns: sheet.columns,
    };
    
    const formatterOptions: FormatterOptions = {
      locale: options.locale,
      sanitize: true,
    };
    
    const formattedData = formatRows(sheet.data, sheet.columns, formatterOptions);
    const headers = getColumnHeaders(sheet.columns, options.locale);
    
    const sheetData: unknown[][] = [];
    
    if (options.includeHeaders !== false) {
      sheetData.push(headers);
    }
    
    for (const row of formattedData) {
      const rowData = sheet.columns.map(col => row[col.key] ?? "");
      sheetData.push(rowData);
    }
    
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    
    if (options.autoWidth !== false) {
      applyColumnWidths(worksheet, sheet.columns);
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }
  
  return workbook;
}

/**
 * Generate multi-sheet XLSX file
 */
export function generateMultiSheetXLSX(
  sheets: SheetData[],
  options: Omit<ExcelGeneratorOptions, "sheetName" | "columns">
): Buffer {
  const workbook = generateMultiSheetWorkbook(sheets, options);
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}
