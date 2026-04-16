/**
 * Excel/CSV Generator
 *
 * Generates XLSX and CSV files using the ExcelJS library.
 * Includes security sanitization and proper formatting.
 */

import ExcelJS from "exceljs";
import {
  type ColumnDefinition,
  type FormatterOptions,
  formatRows,
  getColumnHeaders,
  getColumnWidths,
  getColumnsForModule,
} from "./data-formatter";
import {
  type ExportFormat,
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
 */
function charWidthToExcel(chars: number): number {
  return Math.round(chars * 1.2);
}

/**
 * Apply column widths to worksheet
 */
function applyColumnWidths(
  worksheet: ExcelJS.Worksheet,
  columns: ColumnDefinition[]
): void {
  const widths = getColumnWidths(columns);
  widths.forEach((w, i) => {
    const col = worksheet.getColumn(i + 1); // ExcelJS columns are 1-indexed
    col.width = charWidthToExcel(w);
  });
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
): ExcelJS.Workbook {
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

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Add title if provided
  if (title) {
    worksheet.addRow([title]);
  }

  // Add subtitle if provided
  if (subtitle) {
    worksheet.addRow([subtitle]);
  }

  // Add empty row after title/subtitle
  if (title || subtitle) {
    worksheet.addRow([]);
  }

  // Add headers with bold styling
  if (includeHeaders) {
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
  }

  // Add data rows
  for (const row of formattedData) {
    const rowData = columns.map(col => row[col.key] ?? "");
    worksheet.addRow(rowData);
  }

  // Apply column widths
  if (autoWidth) {
    applyColumnWidths(worksheet, columns);
  }

  return workbook;
}

/**
 * Generate XLSX file from data
 */
export async function generateXLSX(
  data: Record<string, unknown>[],
  options: ExcelGeneratorOptions
): Promise<Buffer> {
  const workbook = generateWorkbook(data, options);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
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
 * Generate XML file from data
 */
export function generateXML(
  module: ExportModule,
  data: Record<string, unknown>[],
  options: ExcelGeneratorOptions
): Buffer {
  const {
    columns,
    locale = "en",
  } = options;

  const formatterOptions: FormatterOptions = {
    locale,
    sanitize: false,
  };

  const formattedData = formatRows(data, columns, formatterOptions);
  const generatedAt = new Date().toISOString();

  const xmlParts: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<export module="${module}" generatedAt="${generatedAt}">`,
    "  <records>",
  ];

  for (const row of formattedData) {
    xmlParts.push("    <record>");
    for (const column of columns) {
      const value = row[column.key] ?? "";
      xmlParts.push(
        `      <${column.key}>${escapeXml(String(value))}</${column.key}>`
      );
    }
    xmlParts.push("    </record>");
  }

  xmlParts.push("  </records>", "</export>");

  return Buffer.from(xmlParts.join("\n"), "utf-8");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
export async function generateExportFile(
  module: ExportModule,
  format: ExportFormat,
  data: Record<string, unknown>[],
  options: Omit<ExcelGeneratorOptions, "columns"> & { columns?: ColumnDefinition[] }
): Promise<GeneratedFile> {
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
    case "xls":
      // ExcelJS produces OOXML (xlsx) format for both
      buffer = await generateXLSX(data, fullOptions);
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      break;
    case "csv":
      buffer = generateCSV(data, fullOptions);
      contentType = "text/csv; charset=utf-8";
      break;
    case "xml":
      buffer = generateXML(module, data, fullOptions);
      contentType = "application/xml; charset=utf-8";
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
    requests: { en: "Requests", el: "Αιτήματα" },
    calendar: { en: "Events", el: "Εκδηλώσεις" },
    reports: { en: "Reports", el: "Αναφορές" },
    documents: { en: "Documents", el: "Έγγραφα" },
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
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const formatterOptions: FormatterOptions = {
      locale: options.locale,
      sanitize: true,
    };

    const formattedData = formatRows(sheet.data, sheet.columns, formatterOptions);
    const headers = getColumnHeaders(sheet.columns, options.locale);

    const worksheet = workbook.addWorksheet(sheet.name);

    if (options.includeHeaders !== false) {
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true };
    }

    for (const row of formattedData) {
      const rowData = sheet.columns.map(col => row[col.key] ?? "");
      worksheet.addRow(rowData);
    }

    if (options.autoWidth !== false) {
      applyColumnWidths(worksheet, sheet.columns);
    }
  }

  return workbook;
}

/**
 * Generate multi-sheet XLSX file
 */
export async function generateMultiSheetXLSX(
  sheets: SheetData[],
  options: Omit<ExcelGeneratorOptions, "sheetName" | "columns">
): Promise<Buffer> {
  const workbook = generateMultiSheetWorkbook(sheets, options);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
