/**
 * Golden Home Export Template
 * 
 * CSV export template for Golden Home real estate agency/portal.
 * Uses semicolon delimiter and UTF-8 with BOM for Greek character support.
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
// GOLDEN HOME-SPECIFIC TYPE MAPPINGS
// ============================================

/**
 * Golden Home property type codes
 */
export const GOLDEN_HOME_PROPERTY_TYPES: Record<string, string> = {
  APARTMENT: "Διαμέρισμα",
  HOUSE: "Μονοκατοικία",
  MAISONETTE: "Μεζονέτα",
  COMMERCIAL: "Επαγγελματικός Χώρος",
  LAND: "Οικόπεδο",
  PLOT: "Οικόπεδο",
  WAREHOUSE: "Αποθήκη",
  PARKING: "Θέση Στάθμευσης",
  INDUSTRIAL: "Βιομηχανικός Χώρος",
  FARM: "Αγροτεμάχιο",
  VACATION: "Εξοχικό",
  RESIDENTIAL: "Κατοικία",
  RENTAL: "Προς Ενοικίαση",
  OTHER: "Άλλο",
};

/**
 * Golden Home transaction types
 */
export const GOLDEN_HOME_TRANSACTION_TYPES: Record<string, string> = {
  SALE: "Πώληση",
  RENTAL: "Ενοικίαση",
  SHORT_TERM: "Βραχυχρόνια",
  EXCHANGE: "Ανταλλαγή",
};

// ============================================
// FIELD MAPPINGS
// ============================================

export const GOLDEN_HOME_FIELD_MAPPINGS: FieldMapping[] = [
  // Core identification
  {
    internalField: "id",
    portalField: "Κωδικός",
    type: "string",
    required: true,
    labelEn: "Reference Code",
    labelEl: "Κωδικός Αναφοράς",
  },
  
  // Property details
  {
    internalField: "property_name",
    portalField: "Τίτλος",
    type: "string",
    required: true,
    labelEn: "Title",
    labelEl: "Τίτλος",
    transform: (value) => truncateText(sanitizeTextForExport(value as string), 150),
  },
  {
    internalField: "description",
    portalField: "Περιγραφή",
    type: "string",
    required: false,
    labelEn: "Description",
    labelEl: "Περιγραφή",
    transform: (value) => sanitizeTextForExport(value as string),
  },
  
  // Property classification
  {
    internalField: "property_type",
    portalField: "Τύπος",
    type: "enum",
    required: true,
    labelEn: "Property Type",
    labelEl: "Τύπος Ακινήτου",
    enumMap: GOLDEN_HOME_PROPERTY_TYPES,
  },
  {
    internalField: "transaction_type",
    portalField: "Συναλλαγή",
    type: "enum",
    required: true,
    labelEn: "Transaction Type",
    labelEl: "Τύπος Συναλλαγής",
    enumMap: GOLDEN_HOME_TRANSACTION_TYPES,
    defaultValue: "Πώληση",
  },
  
  // Pricing
  {
    internalField: "price",
    portalField: "Τιμή",
    type: "currency",
    required: true,
    labelEn: "Price",
    labelEl: "Τιμή",
  },
  
  // Size
  {
    internalField: "square_feet",
    portalField: "Εμβαδόν (τ.μ.)",
    type: "number",
    required: true,
    labelEn: "Area (sqm)",
    labelEl: "Εμβαδόν (τ.μ.)",
    transform: (value, property) => property.size_net_sqm || value || 0,
  },
  {
    internalField: "plot_size_sqm",
    portalField: "Οικόπεδο (τ.μ.)",
    type: "number",
    required: false,
    labelEn: "Plot Size (sqm)",
    labelEl: "Οικόπεδο (τ.μ.)",
  },
  
  // Rooms
  {
    internalField: "bedrooms",
    portalField: "Υπνοδωμάτια",
    type: "number",
    required: false,
    labelEn: "Bedrooms",
    labelEl: "Υπνοδωμάτια",
    defaultValue: 0,
  },
  {
    internalField: "bathrooms",
    portalField: "Μπάνια",
    type: "number",
    required: false,
    labelEn: "Bathrooms",
    labelEl: "Μπάνια",
    defaultValue: 0,
  },
  
  // Location
  {
    internalField: "address_city",
    portalField: "Πόλη",
    type: "string",
    required: true,
    labelEn: "City",
    labelEl: "Πόλη",
  },
  {
    internalField: "area",
    portalField: "Περιοχή",
    type: "string",
    required: false,
    labelEn: "Area",
    labelEl: "Περιοχή",
    transform: (value, property) => value || property.municipality || "",
  },
  {
    internalField: "address_street",
    portalField: "Διεύθυνση",
    type: "string",
    required: false,
    labelEn: "Address",
    labelEl: "Διεύθυνση",
  },
  {
    internalField: "postal_code",
    portalField: "Τ.Κ.",
    type: "string",
    required: false,
    labelEn: "Postal Code",
    labelEl: "Τ.Κ.",
  },
  
  // Building details
  {
    internalField: "floor",
    portalField: "Όροφος",
    type: "string",
    required: false,
    labelEn: "Floor",
    labelEl: "Όροφος",
  },
  {
    internalField: "floors_total",
    portalField: "Σύνολο Ορόφων",
    type: "number",
    required: false,
    labelEn: "Total Floors",
    labelEl: "Σύνολο Ορόφων",
  },
  {
    internalField: "year_built",
    portalField: "Έτος Κατασκευής",
    type: "number",
    required: false,
    labelEn: "Year Built",
    labelEl: "Έτος Κατασκευής",
  },
  
  // Features
  {
    internalField: "elevator",
    portalField: "Ασανσέρ",
    type: "boolean",
    required: false,
    labelEn: "Elevator",
    labelEl: "Ασανσέρ",
    transform: (value) => value ? "Ναι" : "Όχι",
  },
  {
    internalField: "furnished",
    portalField: "Επίπλωση",
    type: "enum",
    required: false,
    labelEn: "Furnished",
    labelEl: "Επίπλωση",
    enumMap: FURNISHED_GREEK,
  },
  {
    internalField: "heating_type",
    portalField: "Θέρμανση",
    type: "enum",
    required: false,
    labelEn: "Heating",
    labelEl: "Θέρμανση",
    enumMap: HEATING_TYPE_GREEK,
  },
  {
    internalField: "energy_cert_class",
    portalField: "Ενεργειακή Κλάση",
    type: "enum",
    required: false,
    labelEn: "Energy Class",
    labelEl: "Ενεργειακή Κλάση",
    enumMap: ENERGY_CLASS_GREEK,
  },
  {
    internalField: "condition",
    portalField: "Κατάσταση",
    type: "enum",
    required: false,
    labelEn: "Condition",
    labelEl: "Κατάσταση",
    enumMap: CONDITION_GREEK,
  },
  {
    internalField: "accepts_pets",
    portalField: "Κατοικίδια",
    type: "boolean",
    required: false,
    labelEn: "Pets Allowed",
    labelEl: "Κατοικίδια",
    transform: (value) => value ? "Ναι" : "Όχι",
  },
  
  // Monthly charges
  {
    internalField: "monthly_common_charges",
    portalField: "Κοινόχρηστα (€)",
    type: "currency",
    required: false,
    labelEn: "Common Charges",
    labelEl: "Κοινόχρηστα",
  },
  
  // Images (first image URL)
  {
    internalField: "images",
    portalField: "Φωτογραφία",
    type: "string",
    required: false,
    labelEn: "Photo URL",
    labelEl: "URL Φωτογραφίας",
    transform: (value) => {
      if (Array.isArray(value) && value.length > 0) {
        return value[0];
      }
      return "";
    },
  },
  
  // Contact info
  {
    internalField: "assigned_to_name",
    portalField: "Υπεύθυνος",
    type: "string",
    required: false,
    labelEn: "Agent",
    labelEl: "Υπεύθυνος",
  },
  {
    internalField: "primary_email",
    portalField: "Email",
    type: "string",
    required: false,
    labelEn: "Email",
    labelEl: "Email",
  },
];

// ============================================
// TEMPLATE DEFINITION
// ============================================

export const GOLDEN_HOME_TEMPLATE: PortalTemplate = {
  id: "golden_home",
  name: "Golden Home",
  nameEl: "Golden Home",
  description: "Export properties for Golden Home real estate agency in CSV format",
  descriptionEl: "Εξαγωγή ακινήτων για το Golden Home σε μορφή CSV",
  format: "csv",
  website: "https://www.goldenhome.gr",
  icon: "/portals/goldenhome.png",
  fieldMappings: GOLDEN_HOME_FIELD_MAPPINGS,
  
  // CSV configuration
  csvDelimiter: ";",
  csvBom: true,
  csvQuote: '"',
  
  // Validation rules
  validation: {
    maxProperties: 500,
    maxDescriptionLength: 3000,
    maxTitleLength: 150,
    requiredFields: ["property_name", "price", "square_feet", "property_type", "address_city"],
  },
  
  // Export options
  exportOptions: {
    includeWithoutImages: true,
    includeDrafts: false,
    includeInactive: false,
    includeContact: true,
    includeAgency: false,
  },
};
