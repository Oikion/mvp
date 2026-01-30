/**
 * Tospitimou.gr Export Template
 * 
 * CSV export template for Tospitimou.gr, a major Greek real estate portal.
 * Uses standard CSV format with UTF-8 encoding.
 */

import type { PortalTemplate, FieldMapping, PropertyData } from "./index";
import {
  PROPERTY_TYPE_GREEK,
  TRANSACTION_TYPE_GREEK,
  HEATING_TYPE_GREEK,
  ENERGY_CLASS_GREEK,
  FURNISHED_GREEK,
  CONDITION_GREEK,
} from "./enums";
import { sanitizeTextForExport, truncateText } from "./field-mapper";

// ============================================
// TOSPITIMOU-SPECIFIC TYPE MAPPINGS
// ============================================

/**
 * Tospitimou property category codes
 */
export const TOSPITIMOU_PROPERTY_CATEGORIES: Record<string, string> = {
  APARTMENT: "apartment",
  HOUSE: "detached",
  MAISONETTE: "maisonette",
  COMMERCIAL: "commercial",
  LAND: "land",
  PLOT: "land",
  WAREHOUSE: "warehouse",
  PARKING: "parking",
  INDUSTRIAL: "industrial",
  FARM: "agricultural",
  VACATION: "vacation",
  RESIDENTIAL: "apartment",
  RENTAL: "apartment",
  OTHER: "other",
};

/**
 * Tospitimou transaction type codes
 */
export const TOSPITIMOU_TRANSACTION_TYPES: Record<string, string> = {
  SALE: "sale",
  RENTAL: "rent",
  SHORT_TERM: "short_rent",
  EXCHANGE: "exchange",
};

/**
 * Tospitimou heating types (English codes)
 */
export const TOSPITIMOU_HEATING_TYPES: Record<string, string> = {
  AUTONOMOUS: "autonomous",
  CENTRAL: "central",
  NATURAL_GAS: "gas",
  HEAT_PUMP: "heat_pump",
  ELECTRIC: "electric",
  NONE: "none",
};

/**
 * Tospitimou furnished status
 */
export const TOSPITIMOU_FURNISHED: Record<string, string> = {
  NO: "unfurnished",
  PARTIALLY: "semi_furnished",
  FULLY: "furnished",
};

/**
 * Tospitimou condition codes
 */
export const TOSPITIMOU_CONDITIONS: Record<string, string> = {
  EXCELLENT: "excellent",
  VERY_GOOD: "very_good",
  GOOD: "good",
  NEEDS_RENOVATION: "needs_renovation",
};

// ============================================
// FIELD MAPPINGS
// ============================================

export const TOSPITIMOU_FIELD_MAPPINGS: FieldMapping[] = [
  // Core identification
  {
    internalField: "id",
    portalField: "code",
    type: "string",
    required: true,
    labelEn: "Reference Code",
    labelEl: "Κωδικός Αναφοράς",
  },
  
  // Property details
  {
    internalField: "property_name",
    portalField: "title",
    type: "string",
    required: true,
    labelEn: "Title",
    labelEl: "Τίτλος",
    transform: (value) => truncateText(sanitizeTextForExport(value as string), 120),
  },
  {
    internalField: "description",
    portalField: "description",
    type: "string",
    required: true,
    labelEn: "Description",
    labelEl: "Περιγραφή",
    transform: (value) => sanitizeTextForExport(value as string),
  },
  
  // Property classification
  {
    internalField: "property_type",
    portalField: "category",
    type: "enum",
    required: true,
    labelEn: "Category",
    labelEl: "Κατηγορία",
    enumMap: TOSPITIMOU_PROPERTY_CATEGORIES,
  },
  {
    internalField: "transaction_type",
    portalField: "transaction",
    type: "enum",
    required: true,
    labelEn: "Transaction Type",
    labelEl: "Τύπος Συναλλαγής",
    enumMap: TOSPITIMOU_TRANSACTION_TYPES,
    defaultValue: "sale",
  },
  
  // Pricing
  {
    internalField: "price",
    portalField: "price",
    type: "currency",
    required: true,
    labelEn: "Price",
    labelEl: "Τιμή",
  },
  
  // Size
  {
    internalField: "square_feet",
    portalField: "size",
    type: "number",
    required: true,
    labelEn: "Size (sqm)",
    labelEl: "Εμβαδόν (τ.μ.)",
    transform: (value, property) => property.size_net_sqm || value || 0,
  },
  {
    internalField: "plot_size_sqm",
    portalField: "plot_size",
    type: "number",
    required: false,
    labelEn: "Plot Size (sqm)",
    labelEl: "Οικόπεδο (τ.μ.)",
  },
  
  // Rooms
  {
    internalField: "bedrooms",
    portalField: "bedrooms",
    type: "number",
    required: false,
    labelEn: "Bedrooms",
    labelEl: "Υπνοδωμάτια",
    defaultValue: 0,
  },
  {
    internalField: "bathrooms",
    portalField: "bathrooms",
    type: "number",
    required: false,
    labelEn: "Bathrooms",
    labelEl: "Μπάνια",
    defaultValue: 0,
  },
  
  // Location
  {
    internalField: "address_city",
    portalField: "city",
    type: "string",
    required: true,
    labelEn: "City",
    labelEl: "Πόλη",
  },
  {
    internalField: "area",
    portalField: "area",
    type: "string",
    required: false,
    labelEn: "Area",
    labelEl: "Περιοχή",
    transform: (value, property) => value || property.municipality || "",
  },
  {
    internalField: "address_street",
    portalField: "address",
    type: "string",
    required: false,
    labelEn: "Address",
    labelEl: "Διεύθυνση",
  },
  {
    internalField: "postal_code",
    portalField: "postal_code",
    type: "string",
    required: false,
    labelEn: "Postal Code",
    labelEl: "Τ.Κ.",
  },
  {
    internalField: "address_state",
    portalField: "region",
    type: "string",
    required: false,
    labelEn: "Region",
    labelEl: "Περιφέρεια",
  },
  
  // Building details
  {
    internalField: "floor",
    portalField: "floor",
    type: "string",
    required: false,
    labelEn: "Floor",
    labelEl: "Όροφος",
  },
  {
    internalField: "floors_total",
    portalField: "total_floors",
    type: "number",
    required: false,
    labelEn: "Total Floors",
    labelEl: "Σύνολο Ορόφων",
  },
  {
    internalField: "year_built",
    portalField: "year_built",
    type: "number",
    required: false,
    labelEn: "Year Built",
    labelEl: "Έτος Κατασκευής",
  },
  {
    internalField: "renovated_year",
    portalField: "year_renovated",
    type: "number",
    required: false,
    labelEn: "Year Renovated",
    labelEl: "Έτος Ανακαίνισης",
  },
  
  // Features
  {
    internalField: "elevator",
    portalField: "elevator",
    type: "boolean",
    required: false,
    labelEn: "Elevator",
    labelEl: "Ασανσέρ",
    transform: (value) => value ? "yes" : "no",
  },
  {
    internalField: "furnished",
    portalField: "furnished",
    type: "enum",
    required: false,
    labelEn: "Furnished",
    labelEl: "Επίπλωση",
    enumMap: TOSPITIMOU_FURNISHED,
  },
  {
    internalField: "heating_type",
    portalField: "heating",
    type: "enum",
    required: false,
    labelEn: "Heating",
    labelEl: "Θέρμανση",
    enumMap: TOSPITIMOU_HEATING_TYPES,
  },
  {
    internalField: "energy_cert_class",
    portalField: "energy_class",
    type: "enum",
    required: false,
    labelEn: "Energy Class",
    labelEl: "Ενεργειακή Κλάση",
    enumMap: ENERGY_CLASS_GREEK,
  },
  {
    internalField: "condition",
    portalField: "condition",
    type: "enum",
    required: false,
    labelEn: "Condition",
    labelEl: "Κατάσταση",
    enumMap: TOSPITIMOU_CONDITIONS,
  },
  {
    internalField: "accepts_pets",
    portalField: "pets_allowed",
    type: "boolean",
    required: false,
    labelEn: "Pets Allowed",
    labelEl: "Κατοικίδια",
    transform: (value) => value ? "yes" : "no",
  },
  {
    internalField: "parking_spots",
    portalField: "parking",
    type: "number",
    required: false,
    labelEn: "Parking",
    labelEl: "Parking",
  },
  
  // Monthly charges
  {
    internalField: "monthly_common_charges",
    portalField: "common_expenses",
    type: "currency",
    required: false,
    labelEn: "Common Expenses",
    labelEl: "Κοινόχρηστα",
  },
  
  // Coordinates
  {
    internalField: "latitude",
    portalField: "lat",
    type: "number",
    required: false,
    labelEn: "Latitude",
    labelEl: "Γεωγραφικό Πλάτος",
  },
  {
    internalField: "longitude",
    portalField: "lng",
    type: "number",
    required: false,
    labelEn: "Longitude",
    labelEl: "Γεωγραφικό Μήκος",
  },
  
  // Images (semicolon separated URLs)
  {
    internalField: "images",
    portalField: "images",
    type: "string",
    required: false,
    labelEn: "Images",
    labelEl: "Εικόνες",
    transform: (value) => {
      if (Array.isArray(value)) {
        return value.join(";");
      }
      return "";
    },
  },
  
  // Availability
  {
    internalField: "available_from",
    portalField: "available_from",
    type: "date",
    required: false,
    labelEn: "Available From",
    labelEl: "Διαθέσιμο Από",
  },
];

// ============================================
// TEMPLATE DEFINITION
// ============================================

export const TOSPITIMOU_TEMPLATE: PortalTemplate = {
  id: "tospitimou",
  name: "Tospitimou.gr",
  nameEl: "Tospitimou.gr",
  description: "Export properties for Tospitimou.gr real estate portal in CSV format",
  descriptionEl: "Εξαγωγή ακινήτων για το Tospitimou.gr σε μορφή CSV",
  format: "csv",
  website: "https://www.tospitimou.gr",
  icon: "/portals/tospitimou.png",
  fieldMappings: TOSPITIMOU_FIELD_MAPPINGS,
  
  // CSV configuration
  csvDelimiter: ",",
  csvBom: true,
  csvQuote: '"',
  
  // Validation rules
  validation: {
    maxProperties: 500,
    maxDescriptionLength: 4000,
    maxTitleLength: 120,
    minImages: 1,
    requiredFields: ["property_name", "price", "square_feet", "property_type", "address_city", "description"],
  },
  
  // Export options
  exportOptions: {
    includeWithoutImages: false,
    includeDrafts: false,
    includeInactive: false,
    includeContact: false,
    includeAgency: false,
  },
};
