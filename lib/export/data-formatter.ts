/**
 * Data Formatter Utilities for Export
 * 
 * Provides utilities for transforming and formatting data
 * for export to various formats (Excel, CSV, PDF)
 */

import { format as formatDate } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { sanitizeForExport, sanitizeRow, type ExportModule } from "./security";

// ============================================
// TYPES
// ============================================

export interface ColumnDefinition {
  key: string;
  label: string;
  labelEl?: string;
  type?: "string" | "number" | "date" | "datetime" | "currency" | "boolean" | "enum";
  width?: number;
  format?: (value: unknown) => string;
  enumLabels?: Record<string, string>;
}

export interface FormatterOptions {
  locale?: "en" | "el";
  dateFormat?: string;
  datetimeFormat?: string;
  currencySymbol?: string;
  sanitize?: boolean;
}

const DEFAULT_OPTIONS: FormatterOptions = {
  locale: "en",
  dateFormat: "yyyy-MM-dd",
  datetimeFormat: "yyyy-MM-dd HH:mm",
  currencySymbol: "€",
  sanitize: true,
};

// ============================================
// CRM COLUMN DEFINITIONS
// ============================================

export const CRM_COLUMNS: ColumnDefinition[] = [
  { key: "id", label: "ID", type: "string", width: 36 },
  { key: "createdAt", label: "Created", labelEl: "Δημιουργήθηκε", type: "datetime", width: 18 },
  { key: "client_name", label: "Name", labelEl: "Όνομα", type: "string", width: 25 },
  { key: "primary_email", label: "Email", type: "string", width: 30 },
  { key: "primary_phone", label: "Phone", labelEl: "Τηλέφωνο", type: "string", width: 15 },
  { 
    key: "client_type", 
    label: "Type", 
    labelEl: "Τύπος", 
    type: "enum", 
    width: 15,
    enumLabels: {
      BUYER: "Buyer",
      SELLER: "Seller",
      RENTER: "Renter",
      INVESTOR: "Investor",
      REFERRAL_PARTNER: "Referral Partner",
    },
  },
  { 
    key: "client_status", 
    label: "Status", 
    labelEl: "Κατάσταση", 
    type: "enum", 
    width: 12,
    enumLabels: {
      LEAD: "Lead",
      ACTIVE: "Active",
      INACTIVE: "Inactive",
      CONVERTED: "Converted",
      LOST: "Lost",
    },
  },
  { key: "budget_min", label: "Budget Min", labelEl: "Ελάχ. Προϋπολογισμός", type: "currency", width: 15 },
  { key: "budget_max", label: "Budget Max", labelEl: "Μέγ. Προϋπολογισμός", type: "currency", width: 15 },
  { key: "billing_city", label: "City", labelEl: "Πόλη", type: "string", width: 15 },
  { key: "billing_country", label: "Country", labelEl: "Χώρα", type: "string", width: 15 },
  { key: "description", label: "Description", labelEl: "Περιγραφή", type: "string", width: 40 },
  { key: "assigned_to_name", label: "Assigned To", labelEl: "Ανατέθηκε σε", type: "string", width: 20 },
];

// ============================================
// MLS (PROPERTIES) COLUMN DEFINITIONS
// ============================================

export const MLS_COLUMNS: ColumnDefinition[] = [
  { key: "id", label: "ID", type: "string", width: 36 },
  { key: "createdAt", label: "Created", labelEl: "Δημιουργήθηκε", type: "datetime", width: 18 },
  { key: "property_name", label: "Name", labelEl: "Όνομα", type: "string", width: 30 },
  { key: "price", label: "Price", labelEl: "Τιμή", type: "currency", width: 15 },
  { 
    key: "property_type", 
    label: "Type", 
    labelEl: "Τύπος", 
    type: "enum", 
    width: 15,
    enumLabels: {
      RESIDENTIAL: "Residential",
      COMMERCIAL: "Commercial",
      LAND: "Land",
      RENTAL: "Rental",
      VACATION: "Vacation",
      APARTMENT: "Apartment",
      HOUSE: "House",
      MAISONETTE: "Maisonette",
      WAREHOUSE: "Warehouse",
      PARKING: "Parking",
      PLOT: "Plot",
      FARM: "Farm",
      INDUSTRIAL: "Industrial",
      OTHER: "Other",
    },
  },
  { 
    key: "property_status", 
    label: "Status", 
    labelEl: "Κατάσταση", 
    type: "enum", 
    width: 12,
    enumLabels: {
      ACTIVE: "Active",
      PENDING: "Pending",
      SOLD: "Sold",
      OFF_MARKET: "Off Market",
      WITHDRAWN: "Withdrawn",
    },
  },
  { key: "bedrooms", label: "Bedrooms", labelEl: "Υπνοδωμάτια", type: "number", width: 10 },
  { key: "bathrooms", label: "Bathrooms", labelEl: "Μπάνια", type: "number", width: 10 },
  { key: "square_feet", label: "Sqm", labelEl: "Τ.μ.", type: "number", width: 10 },
  { key: "address_street", label: "Street", labelEl: "Οδός", type: "string", width: 25 },
  { key: "address_city", label: "City", labelEl: "Πόλη", type: "string", width: 15 },
  { key: "postal_code", label: "Postal Code", labelEl: "Τ.Κ.", type: "string", width: 10 },
  { key: "year_built", label: "Year Built", labelEl: "Έτος Κατασκευής", type: "number", width: 12 },
  { key: "description", label: "Description", labelEl: "Περιγραφή", type: "string", width: 40 },
  { key: "assigned_to_name", label: "Assigned To", labelEl: "Ανατέθηκε σε", type: "string", width: 20 },
];

// ============================================
// CALENDAR COLUMN DEFINITIONS
// ============================================

export const CALENDAR_COLUMNS: ColumnDefinition[] = [
  { key: "id", label: "ID", type: "string", width: 36 },
  { key: "title", label: "Title", labelEl: "Τίτλος", type: "string", width: 30 },
  { key: "description", label: "Description", labelEl: "Περιγραφή", type: "string", width: 40 },
  { key: "startTime", label: "Start", labelEl: "Έναρξη", type: "datetime", width: 18 },
  { key: "endTime", label: "End", labelEl: "Λήξη", type: "datetime", width: 18 },
  { key: "location", label: "Location", labelEl: "Τοποθεσία", type: "string", width: 25 },
  { 
    key: "eventType", 
    label: "Type", 
    labelEl: "Τύπος", 
    type: "enum", 
    width: 18,
    enumLabels: {
      PROPERTY_VIEWING: "Property Viewing",
      CLIENT_CONSULTATION: "Client Consultation",
      MEETING: "Meeting",
      REMINDER: "Reminder",
      TASK_DEADLINE: "Task Deadline",
      OTHER: "Other",
    },
  },
  { key: "status", label: "Status", labelEl: "Κατάσταση", type: "string", width: 12 },
  { key: "attendeeName", label: "Attendee", labelEl: "Συμμετέχων", type: "string", width: 20 },
  { key: "attendeeEmail", label: "Attendee Email", labelEl: "Email Συμμετέχοντα", type: "string", width: 25 },
];

// ============================================
// REPORTS COLUMN DEFINITIONS
// ============================================

export const REPORTS_COLUMNS: ColumnDefinition[] = [
  { key: "category", label: "Category", labelEl: "Κατηγορία", type: "string", width: 20 },
  { key: "metric", label: "Metric", labelEl: "Μέτρηση", type: "string", width: 25 },
  { key: "value", label: "Value", labelEl: "Τιμή", type: "number", width: 15 },
  { key: "percentage", label: "Percentage", labelEl: "Ποσοστό", type: "string", width: 12 },
  { key: "trend", label: "Trend", labelEl: "Τάση", type: "string", width: 10 },
  { key: "period", label: "Period", labelEl: "Περίοδος", type: "string", width: 15 },
];

// ============================================
// COLUMN GETTERS BY MODULE
// ============================================

export function getColumnsForModule(module: ExportModule): ColumnDefinition[] {
  switch (module) {
    case "crm":
      return CRM_COLUMNS;
    case "mls":
      return MLS_COLUMNS;
    case "calendar":
      return CALENDAR_COLUMNS;
    case "reports":
      return REPORTS_COLUMNS;
    default:
      return [];
  }
}

// ============================================
// VALUE FORMATTERS
// ============================================

/**
 * Format a date value
 */
export function formatDateValue(
  value: unknown,
  formatStr: string,
  locale: "en" | "el"
): string {
  if (!value) return "";
  
  try {
    const date = value instanceof Date ? value : new Date(String(value));
    if (isNaN(date.getTime())) return String(value);
    
    return formatDate(date, formatStr, {
      locale: locale === "el" ? el : enUS,
    });
  } catch {
    return String(value);
  }
}

/**
 * Format a currency value
 */
export function formatCurrencyValue(
  value: unknown,
  symbol: string
): string {
  if (value === null || value === undefined || value === "") return "";
  
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(num)) return String(value);
  
  return `${symbol}${num.toLocaleString()}`;
}

/**
 * Format a boolean value
 */
export function formatBooleanValue(value: unknown, locale: "en" | "el"): string {
  if (value === null || value === undefined) return "";
  
  const boolValue = value === true || value === "true" || value === 1;
  
  if (locale === "el") {
    return boolValue ? "Ναι" : "Όχι";
  }
  return boolValue ? "Yes" : "No";
}

/**
 * Format an enum value using labels
 */
export function formatEnumValue(
  value: unknown,
  enumLabels?: Record<string, string>
): string {
  if (!value) return "";
  
  const strValue = String(value);
  if (enumLabels && enumLabels[strValue]) {
    return enumLabels[strValue];
  }
  
  // Convert SCREAMING_SNAKE_CASE to Title Case
  return strValue
    .split("_")
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

// ============================================
// MAIN FORMATTER
// ============================================

/**
 * Format a single cell value based on column definition
 */
export function formatCellValue(
  value: unknown,
  column: ColumnDefinition,
  options: FormatterOptions = DEFAULT_OPTIONS
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Use custom format function if provided
  if (column.format) {
    const formatted = column.format(value);
    return opts.sanitize ? sanitizeForExport(formatted) : formatted;
  }
  
  let formatted: string;
  
  switch (column.type) {
    case "date":
      formatted = formatDateValue(value, opts.dateFormat!, opts.locale!);
      break;
    case "datetime":
      formatted = formatDateValue(value, opts.datetimeFormat!, opts.locale!);
      break;
    case "currency":
      formatted = formatCurrencyValue(value, opts.currencySymbol!);
      break;
    case "boolean":
      formatted = formatBooleanValue(value, opts.locale!);
      break;
    case "enum":
      formatted = formatEnumValue(value, column.enumLabels);
      break;
    case "number":
      if (value === null || value === undefined || value === "") {
        formatted = "";
      } else {
        const num = typeof value === "number" ? value : parseFloat(String(value));
        formatted = isNaN(num) ? String(value) : num.toLocaleString();
      }
      break;
    default:
      formatted = value === null || value === undefined ? "" : String(value);
  }
  
  return opts.sanitize ? sanitizeForExport(formatted) : formatted;
}

/**
 * Format an entire row of data using column definitions
 */
export function formatRow(
  row: Record<string, unknown>,
  columns: ColumnDefinition[],
  options: FormatterOptions = DEFAULT_OPTIONS
): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  for (const column of columns) {
    const value = row[column.key];
    formatted[column.key] = formatCellValue(value, column, options);
  }
  
  return formatted;
}

/**
 * Format multiple rows of data
 */
export function formatRows(
  rows: Record<string, unknown>[],
  columns: ColumnDefinition[],
  options: FormatterOptions = DEFAULT_OPTIONS
): Record<string, string>[] {
  return rows.map(row => formatRow(row, columns, options));
}

/**
 * Get column headers in the specified locale
 */
export function getColumnHeaders(
  columns: ColumnDefinition[],
  locale: "en" | "el" = "en"
): string[] {
  return columns.map(col => {
    if (locale === "el" && col.labelEl) {
      return col.labelEl;
    }
    return col.label;
  });
}

/**
 * Get column widths for Excel export
 */
export function getColumnWidths(columns: ColumnDefinition[]): number[] {
  return columns.map(col => col.width || 15);
}

// ============================================
// DATA TRANSFORMATION HELPERS
// ============================================

/**
 * Flatten nested objects for export
 * Example: { user: { name: "John" } } -> { "user.name": "John" }
 */
export function flattenObject(
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = value;
    }
  }
  
  return result;
}

/**
 * Extract specific columns from data
 */
export function extractColumns<T extends Record<string, unknown>>(
  data: T[],
  columns: ColumnDefinition[]
): Record<string, unknown>[] {
  const keys = columns.map(col => col.key);
  
  return data.map(row => {
    const extracted: Record<string, unknown> = {};
    for (const key of keys) {
      // Handle nested keys like "assigned_to_user.name"
      if (key.includes(".")) {
        const parts = key.split(".");
        let value: unknown = row;
        for (const part of parts) {
          value = (value as Record<string, unknown>)?.[part];
        }
        extracted[key] = value;
      } else {
        extracted[key] = row[key];
      }
    }
    return extracted;
  });
}

/**
 * Add assigned user name to rows (common transformation)
 */
export function addAssignedUserName<T extends Record<string, unknown>>(
  rows: T[],
  users: { id: string; name: string | null }[]
): (T & { assigned_to_name?: string })[] {
  const userMap = new Map(users.map(u => [u.id, u.name || "Unknown"]));
  
  return rows.map(row => ({
    ...row,
    assigned_to_name: row.assigned_to 
      ? userMap.get(row.assigned_to as string) || "Unknown"
      : "",
  }));
}
