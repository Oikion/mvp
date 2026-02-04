/**
 * XLSX Export Templates
 * 
 * Provides predefined column configurations for different export use cases:
 * - CMA (Comparative Market Analysis)
 * - Property Shortlist
 * - Investment ROI Calculations
 * - Market Trends Data
 */

import type { ColumnDefinition } from "../data-formatter";

// ============================================
// TYPES
// ============================================

export type ExportTemplateType = "CMA" | "SHORTLIST" | "ROI" | "MARKET_TRENDS";

export interface ExportTemplate {
  id: ExportTemplateType;
  name: string;
  nameEl: string;
  description: string;
  descriptionEl: string;
  columns: ColumnDefinition[];
  /** Fields tracked for change detection */
  changeDetectionFields: string[];
  /** Whether this template supports single entity export */
  supportsSingleExport: boolean;
  /** Whether this template supports bulk export */
  supportsBulkExport: boolean;
}

// ============================================
// CMA (COMPARATIVE MARKET ANALYSIS) TEMPLATE
// ============================================

export const CMA_COLUMNS: ColumnDefinition[] = [
  { key: "property_name", label: "Property", labelEl: "Ακίνητο", type: "string", width: 30 },
  { key: "address_full", label: "Address", labelEl: "Διεύθυνση", type: "string", width: 40 },
  { key: "property_type", label: "Type", labelEl: "Τύπος", type: "enum", width: 15,
    enumLabels: {
      APARTMENT: "Apartment", HOUSE: "House", MAISONETTE: "Maisonette",
      COMMERCIAL: "Commercial", LAND: "Land", OTHER: "Other",
    },
  },
  { key: "price", label: "List Price", labelEl: "Τιμή Πώλησης", type: "currency", width: 15 },
  { key: "price_per_sqm", label: "Price/sqm", labelEl: "Τιμή/τ.μ.", type: "currency", width: 12 },
  { key: "square_feet", label: "Size (sqm)", labelEl: "Εμβαδόν (τ.μ.)", type: "number", width: 12 },
  { key: "bedrooms", label: "Beds", labelEl: "Υπνοδ.", type: "number", width: 8 },
  { key: "bathrooms", label: "Baths", labelEl: "Μπάνια", type: "number", width: 8 },
  { key: "year_built", label: "Year Built", labelEl: "Έτος Κατασκευής", type: "number", width: 12 },
  { key: "property_status", label: "Status", labelEl: "Κατάσταση", type: "enum", width: 12,
    enumLabels: {
      ACTIVE: "Active", PENDING: "Pending", SOLD: "Sold", OFF_MARKET: "Off Market",
    },
  },
  { key: "days_on_market", label: "Days on Market", labelEl: "Ημέρες στην Αγορά", type: "number", width: 15 },
  { key: "condition", label: "Condition", labelEl: "Κατάσταση Κτιρίου", type: "enum", width: 15,
    enumLabels: {
      EXCELLENT: "Excellent", VERY_GOOD: "Very Good", GOOD: "Good", NEEDS_RENOVATION: "Needs Renovation",
    },
  },
  { key: "notes", label: "Notes", labelEl: "Σημειώσεις", type: "string", width: 30 },
];

export const CMA_TEMPLATE: ExportTemplate = {
  id: "CMA",
  name: "Comparative Market Analysis",
  nameEl: "Συγκριτική Ανάλυση Αγοράς",
  description: "Compare properties by price, size, and features for market valuation",
  descriptionEl: "Σύγκριση ακινήτων βάσει τιμής, εμβαδού και χαρακτηριστικών για αποτίμηση αγοράς",
  columns: CMA_COLUMNS,
  changeDetectionFields: ["price", "property_status", "square_feet", "bedrooms"],
  supportsSingleExport: true,
  supportsBulkExport: true,
};

// ============================================
// PROPERTY SHORTLIST TEMPLATE
// ============================================

export const SHORTLIST_COLUMNS: ColumnDefinition[] = [
  { key: "property_name", label: "Property", labelEl: "Ακίνητο", type: "string", width: 30 },
  { key: "address_city", label: "Area", labelEl: "Περιοχή", type: "string", width: 15 },
  { key: "property_type", label: "Type", labelEl: "Τύπος", type: "enum", width: 15,
    enumLabels: {
      APARTMENT: "Apartment", HOUSE: "House", MAISONETTE: "Maisonette",
      COMMERCIAL: "Commercial", LAND: "Land", OTHER: "Other",
    },
  },
  { key: "transaction_type", label: "Transaction", labelEl: "Συναλλαγή", type: "enum", width: 12,
    enumLabels: {
      SALE: "Sale", RENTAL: "Rental", SHORT_TERM: "Short Term",
    },
  },
  { key: "price", label: "Price", labelEl: "Τιμή", type: "currency", width: 15 },
  { key: "square_feet", label: "Size (sqm)", labelEl: "Εμβαδόν (τ.μ.)", type: "number", width: 12 },
  { key: "bedrooms", label: "Beds", labelEl: "Υπνοδ.", type: "number", width: 8 },
  { key: "bathrooms", label: "Baths", labelEl: "Μπάνια", type: "number", width: 8 },
  { key: "floor", label: "Floor", labelEl: "Όροφος", type: "string", width: 10 },
  { key: "furnished", label: "Furnished", labelEl: "Επίπλωση", type: "enum", width: 12,
    enumLabels: {
      NO: "No", PARTIALLY: "Partial", FULLY: "Full",
    },
  },
  { key: "elevator", label: "Elevator", labelEl: "Ανσανσέρ", type: "boolean", width: 10 },
  { key: "property_status", label: "Status", labelEl: "Κατάσταση", type: "enum", width: 12,
    enumLabels: {
      ACTIVE: "Available", PENDING: "Pending", SOLD: "Not Available",
    },
  },
  { key: "assigned_to_name", label: "Agent", labelEl: "Σύμβουλος", type: "string", width: 20 },
  { key: "description", label: "Description", labelEl: "Περιγραφή", type: "string", width: 40 },
];

export const SHORTLIST_TEMPLATE: ExportTemplate = {
  id: "SHORTLIST",
  name: "Property Shortlist",
  nameEl: "Λίστα Ακινήτων",
  description: "Client-ready property shortlist with key details",
  descriptionEl: "Λίστα ακινήτων για πελάτες με βασικά χαρακτηριστικά",
  columns: SHORTLIST_COLUMNS,
  changeDetectionFields: ["price", "property_status", "description"],
  supportsSingleExport: false,
  supportsBulkExport: true,
};

// ============================================
// ROI (INVESTMENT ANALYSIS) TEMPLATE
// ============================================

export const ROI_COLUMNS: ColumnDefinition[] = [
  { key: "property_name", label: "Property", labelEl: "Ακίνητο", type: "string", width: 30 },
  { key: "address_city", label: "Location", labelEl: "Τοποθεσία", type: "string", width: 15 },
  { key: "property_type", label: "Type", labelEl: "Τύπος", type: "enum", width: 15,
    enumLabels: {
      APARTMENT: "Apartment", HOUSE: "House", COMMERCIAL: "Commercial",
    },
  },
  { key: "price", label: "Purchase Price", labelEl: "Τιμή Αγοράς", type: "currency", width: 18 },
  { key: "square_feet", label: "Size (sqm)", labelEl: "Εμβαδόν (τ.μ.)", type: "number", width: 12 },
  { key: "price_per_sqm", label: "Price/sqm", labelEl: "Τιμή/τ.μ.", type: "currency", width: 12 },
  { key: "estimated_rent", label: "Est. Monthly Rent", labelEl: "Εκτ. Μηνιαίο Ενοίκιο", type: "currency", width: 18 },
  { key: "annual_rent", label: "Annual Rent", labelEl: "Ετήσιο Ενοίκιο", type: "currency", width: 15 },
  { key: "gross_yield", label: "Gross Yield %", labelEl: "Μικτή Απόδοση %", type: "string", width: 15 },
  { key: "operating_expenses", label: "Operating Exp.", labelEl: "Λειτ. Έξοδα", type: "currency", width: 15 },
  { key: "net_operating_income", label: "NOI", labelEl: "Καθαρό Έσοδο", type: "currency", width: 15 },
  { key: "cap_rate", label: "Cap Rate %", labelEl: "Απόδοση Κεφαλαίου %", type: "string", width: 15 },
  { key: "cash_on_cash", label: "Cash-on-Cash %", labelEl: "Απόδοση Μετρητών %", type: "string", width: 15 },
  { key: "payback_years", label: "Payback (Years)", labelEl: "Απόσβεση (Έτη)", type: "number", width: 15 },
  { key: "notes", label: "Investment Notes", labelEl: "Σημειώσεις Επένδυσης", type: "string", width: 30 },
];

export const ROI_TEMPLATE: ExportTemplate = {
  id: "ROI",
  name: "Investment ROI Analysis",
  nameEl: "Ανάλυση Απόδοσης Επένδυσης",
  description: "Investment calculations including rental yield, cap rate, and payback period",
  descriptionEl: "Υπολογισμοί επένδυσης με απόδοση ενοικίου, cap rate και περίοδο απόσβεσης",
  columns: ROI_COLUMNS,
  changeDetectionFields: ["price", "estimated_rent", "square_feet"],
  supportsSingleExport: true,
  supportsBulkExport: true,
};

// ============================================
// MARKET TRENDS TEMPLATE
// ============================================

export const MARKET_TRENDS_COLUMNS: ColumnDefinition[] = [
  { key: "area", label: "Area", labelEl: "Περιοχή", type: "string", width: 20 },
  { key: "property_type", label: "Property Type", labelEl: "Τύπος Ακινήτου", type: "string", width: 15 },
  { key: "period", label: "Period", labelEl: "Περίοδος", type: "string", width: 15 },
  { key: "active_listings", label: "Active Listings", labelEl: "Ενεργές Καταχωρήσεις", type: "number", width: 15 },
  { key: "new_listings", label: "New Listings", labelEl: "Νέες Καταχωρήσεις", type: "number", width: 15 },
  { key: "sold_listings", label: "Sold", labelEl: "Πωλημένα", type: "number", width: 12 },
  { key: "avg_price", label: "Avg. Price", labelEl: "Μέση Τιμή", type: "currency", width: 15 },
  { key: "median_price", label: "Median Price", labelEl: "Διάμεση Τιμή", type: "currency", width: 15 },
  { key: "price_per_sqm", label: "Avg. Price/sqm", labelEl: "Μέση Τιμή/τ.μ.", type: "currency", width: 15 },
  { key: "price_change_pct", label: "Price Change %", labelEl: "Μεταβολή Τιμής %", type: "string", width: 15 },
  { key: "avg_days_on_market", label: "Avg. DOM", labelEl: "Μέση Διάρκεια", type: "number", width: 12 },
  { key: "absorption_rate", label: "Absorption Rate", labelEl: "Ρυθμός Απορρόφησης", type: "string", width: 15 },
  { key: "inventory_months", label: "Inventory (Months)", labelEl: "Απόθεμα (Μήνες)", type: "number", width: 15 },
];

export const MARKET_TRENDS_TEMPLATE: ExportTemplate = {
  id: "MARKET_TRENDS",
  name: "Market Trends Report",
  nameEl: "Αναφορά Τάσεων Αγοράς",
  description: "Market statistics including pricing trends, inventory, and absorption rates",
  descriptionEl: "Στατιστικά αγοράς με τάσεις τιμών, απόθεμα και ρυθμούς απορρόφησης",
  columns: MARKET_TRENDS_COLUMNS,
  changeDetectionFields: ["avg_price", "active_listings", "sold_listings"],
  supportsSingleExport: false,
  supportsBulkExport: true,
};

// ============================================
// TEMPLATE REGISTRY
// ============================================

export const EXPORT_TEMPLATES: Record<ExportTemplateType, ExportTemplate> = {
  CMA: CMA_TEMPLATE,
  SHORTLIST: SHORTLIST_TEMPLATE,
  ROI: ROI_TEMPLATE,
  MARKET_TRENDS: MARKET_TRENDS_TEMPLATE,
};

/**
 * Get all available templates
 */
export function getAllTemplates(): ExportTemplate[] {
  return Object.values(EXPORT_TEMPLATES);
}

/**
 * Get template by ID
 */
export function getTemplate(id: ExportTemplateType): ExportTemplate | null {
  return EXPORT_TEMPLATES[id] || null;
}

/**
 * Get templates that support single entity export
 */
export function getSingleExportTemplates(): ExportTemplate[] {
  return getAllTemplates().filter(t => t.supportsSingleExport);
}

/**
 * Get templates that support bulk export
 */
export function getBulkExportTemplates(): ExportTemplate[] {
  return getAllTemplates().filter(t => t.supportsBulkExport);
}

/**
 * Get columns for a template
 */
export function getTemplateColumns(templateId: ExportTemplateType): ColumnDefinition[] {
  const template = getTemplate(templateId);
  return template?.columns || [];
}

/**
 * Get change detection fields for a template
 */
export function getChangeDetectionFields(templateId: ExportTemplateType): string[] {
  const template = getTemplate(templateId);
  return template?.changeDetectionFields || [];
}
