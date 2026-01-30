/**
 * Spitogatos.gr Export Template
 * 
 * XML export template for Spitogatos.gr, one of Greece's largest
 * real estate portals. Supports Greek language with proper encoding.
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
// SPITOGATOS-SPECIFIC TYPE MAPPINGS
// ============================================

/**
 * Spitogatos property type codes
 * Based on common Greek portal categorization
 */
export const SPITOGATOS_PROPERTY_TYPES: Record<string, number> = {
  APARTMENT: 1,
  HOUSE: 2,
  MAISONETTE: 3,
  COMMERCIAL: 4,
  LAND: 5,
  PLOT: 5,
  WAREHOUSE: 6,
  PARKING: 7,
  INDUSTRIAL: 8,
  FARM: 9,
  VACATION: 10,
  RESIDENTIAL: 1,
  RENTAL: 1,
  OTHER: 99,
};

/**
 * Spitogatos transaction type codes
 */
export const SPITOGATOS_TRANSACTION_TYPES: Record<string, number> = {
  SALE: 1,
  RENTAL: 2,
  SHORT_TERM: 3,
  EXCHANGE: 4,
};

/**
 * Spitogatos heating type codes
 */
export const SPITOGATOS_HEATING_TYPES: Record<string, number> = {
  AUTONOMOUS: 1,
  CENTRAL: 2,
  NATURAL_GAS: 3,
  HEAT_PUMP: 4,
  ELECTRIC: 5,
  NONE: 0,
};

/**
 * Spitogatos energy class codes
 */
export const SPITOGATOS_ENERGY_CLASSES: Record<string, string> = {
  A_PLUS: "Α+",
  A: "Α",
  B: "Β",
  C: "Γ",
  D: "Δ",
  E: "Ε",
  F: "Ζ",
  G: "Η",
  H: "Θ",
  IN_PROGRESS: "Υπό Έκδοση",
};

/**
 * Spitogatos furnished codes
 */
export const SPITOGATOS_FURNISHED: Record<string, number> = {
  NO: 0,
  PARTIALLY: 1,
  FULLY: 2,
};

// ============================================
// FIELD MAPPINGS
// ============================================

export const SPITOGATOS_FIELD_MAPPINGS: FieldMapping[] = [
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
    portalField: "titlos",
    type: "string",
    required: true,
    labelEn: "Title",
    labelEl: "Τίτλος",
    transform: (value) => truncateText(sanitizeTextForExport(value as string), 100),
  },
  {
    internalField: "description",
    portalField: "perigrafi",
    type: "string",
    required: true,
    labelEn: "Description",
    labelEl: "Περιγραφή",
    xmlCdata: true,
    transform: (value) => sanitizeTextForExport(value as string),
  },
  
  // Property classification
  {
    internalField: "property_type",
    portalField: "tipos",
    type: "enum",
    required: true,
    labelEn: "Property Type",
    labelEl: "Τύπος Ακινήτου",
    enumMap: SPITOGATOS_PROPERTY_TYPES,
  },
  {
    internalField: "transaction_type",
    portalField: "synallagi",
    type: "enum",
    required: true,
    labelEn: "Transaction Type",
    labelEl: "Τύπος Συναλλαγής",
    enumMap: SPITOGATOS_TRANSACTION_TYPES,
    defaultValue: 1, // Default to SALE
  },
  
  // Pricing
  {
    internalField: "price",
    portalField: "timi",
    type: "currency",
    required: true,
    labelEn: "Price",
    labelEl: "Τιμή",
  },
  
  // Size and dimensions
  {
    internalField: "square_feet",
    portalField: "emvadon",
    type: "number",
    required: true,
    labelEn: "Area (sqm)",
    labelEl: "Εμβαδόν (τ.μ.)",
    transform: (value, property) => {
      // Prefer size_net_sqm if available
      return property.size_net_sqm || value || 0;
    },
  },
  {
    internalField: "plot_size_sqm",
    portalField: "emvadon_oikopedou",
    type: "number",
    required: false,
    labelEn: "Plot Size (sqm)",
    labelEl: "Εμβαδόν Οικοπέδου (τ.μ.)",
  },
  
  // Rooms
  {
    internalField: "bedrooms",
    portalField: "ypnodomatia",
    type: "number",
    required: false,
    labelEn: "Bedrooms",
    labelEl: "Υπνοδωμάτια",
    defaultValue: 0,
  },
  {
    internalField: "bathrooms",
    portalField: "mpania",
    type: "number",
    required: false,
    labelEn: "Bathrooms",
    labelEl: "Μπάνια",
    defaultValue: 0,
  },
  
  // Location
  {
    internalField: "address_city",
    portalField: "poli",
    type: "string",
    required: true,
    labelEn: "City",
    labelEl: "Πόλη",
  },
  {
    internalField: "area",
    portalField: "perioxi",
    type: "string",
    required: false,
    labelEn: "Area",
    labelEl: "Περιοχή",
    transform: (value, property) => value || property.municipality || "",
  },
  {
    internalField: "address_street",
    portalField: "odos",
    type: "string",
    required: false,
    labelEn: "Street",
    labelEl: "Οδός",
  },
  {
    internalField: "postal_code",
    portalField: "tk",
    type: "string",
    required: false,
    labelEn: "Postal Code",
    labelEl: "Τ.Κ.",
  },
  
  // Building details
  {
    internalField: "floor",
    portalField: "orofos",
    type: "string",
    required: false,
    labelEn: "Floor",
    labelEl: "Όροφος",
    transform: (value) => {
      if (!value) return "";
      // Convert floor names to Greek
      const floorMap: Record<string, string> = {
        "ground": "Ισόγειο",
        "basement": "Υπόγειο",
        "mezzanine": "Ημιόροφος",
        "penthouse": "Ρετιρέ",
      };
      const strValue = String(value).toLowerCase();
      return floorMap[strValue] || value;
    },
  },
  {
    internalField: "floors_total",
    portalField: "synoliko_orofoi",
    type: "number",
    required: false,
    labelEn: "Total Floors",
    labelEl: "Σύνολο Ορόφων",
  },
  {
    internalField: "year_built",
    portalField: "etos_kataskevis",
    type: "number",
    required: false,
    labelEn: "Year Built",
    labelEl: "Έτος Κατασκευής",
  },
  {
    internalField: "renovated_year",
    portalField: "etos_anakainisis",
    type: "number",
    required: false,
    labelEn: "Renovation Year",
    labelEl: "Έτος Ανακαίνισης",
  },
  
  // Features
  {
    internalField: "elevator",
    portalField: "anelkystiras",
    type: "boolean",
    required: false,
    labelEn: "Elevator",
    labelEl: "Ανελκυστήρας",
    transform: (value) => value ? 1 : 0,
  },
  {
    internalField: "furnished",
    portalField: "epiplosi",
    type: "enum",
    required: false,
    labelEn: "Furnished",
    labelEl: "Επίπλωση",
    enumMap: SPITOGATOS_FURNISHED,
  },
  {
    internalField: "heating_type",
    portalField: "thermansi",
    type: "enum",
    required: false,
    labelEn: "Heating",
    labelEl: "Θέρμανση",
    enumMap: SPITOGATOS_HEATING_TYPES,
  },
  {
    internalField: "energy_cert_class",
    portalField: "energeiaki_klasi",
    type: "enum",
    required: false,
    labelEn: "Energy Class",
    labelEl: "Ενεργειακή Κλάση",
    enumMap: SPITOGATOS_ENERGY_CLASSES,
  },
  {
    internalField: "accepts_pets",
    portalField: "katoikidia",
    type: "boolean",
    required: false,
    labelEn: "Pets Allowed",
    labelEl: "Κατοικίδια",
    transform: (value) => value ? 1 : 0,
  },
  {
    internalField: "parking_spots",
    portalField: "parking",
    type: "number",
    required: false,
    labelEn: "Parking Spots",
    labelEl: "Θέσεις Parking",
    defaultValue: 0,
  },
  
  // Condition
  {
    internalField: "condition",
    portalField: "katastasi",
    type: "string",
    required: false,
    labelEn: "Condition",
    labelEl: "Κατάσταση",
    transform: (value) => {
      if (!value) return "";
      return CONDITION_GREEK[value as string] || value;
    },
  },
  
  // Monthly charges (for rentals)
  {
    internalField: "monthly_common_charges",
    portalField: "koina",
    type: "currency",
    required: false,
    labelEn: "Common Charges",
    labelEl: "Κοινόχρηστα",
  },
  
  // Images
  {
    internalField: "images",
    portalField: "fotografies",
    type: "array",
    required: false,
    labelEn: "Photos",
    labelEl: "Φωτογραφίες",
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
  
  // Availability
  {
    internalField: "available_from",
    portalField: "diathesimo_apo",
    type: "date",
    required: false,
    labelEn: "Available From",
    labelEl: "Διαθέσιμο Από",
  },
];

// ============================================
// TEMPLATE DEFINITION
// ============================================

export const SPITOGATOS_TEMPLATE: PortalTemplate = {
  id: "spitogatos",
  name: "Spitogatos.gr",
  nameEl: "Spitogatos.gr",
  description: "Export properties for Spitogatos.gr, Greece's leading real estate portal",
  descriptionEl: "Εξαγωγή ακινήτων για το Spitogatos.gr, την κορυφαία ελληνική πύλη ακινήτων",
  format: "xml",
  website: "https://www.spitogatos.gr",
  icon: "/portals/spitogatos.png",
  fieldMappings: SPITOGATOS_FIELD_MAPPINGS,
  
  // XML configuration
  xmlRoot: "akinhta",
  xmlItem: "akinhto",
  xmlDeclaration: true,
  
  // Validation rules
  validation: {
    maxProperties: 1000,
    maxDescriptionLength: 5000,
    maxTitleLength: 100,
    minImages: 1,
    maxImages: 30,
    requiredFields: ["property_name", "price", "square_feet", "property_type", "address_city"],
    customValidation: (property: PropertyData) => {
      const errors = [];
      const warnings = [];
      
      // Check price is reasonable
      if (property.price && property.price < 1000) {
        warnings.push({
          field: "price",
          message: "Price seems too low for Spitogatos",
          messageEl: "Η τιμή φαίνεται πολύ χαμηλή για το Spitogatos",
        });
      }
      
      // Check for valid transaction type
      if (!property.transaction_type) {
        warnings.push({
          field: "transaction_type",
          message: "Transaction type not specified, defaulting to Sale",
          messageEl: "Ο τύπος συναλλαγής δεν καθορίστηκε, προεπιλογή σε Πώληση",
        });
      }
      
      return { valid: errors.length === 0, errors, warnings };
    },
  },
  
  // Export options
  exportOptions: {
    includeWithoutImages: true,
    includeDrafts: false,
    includeInactive: false,
    includeContact: true,
    includeAgency: true,
  },
};
