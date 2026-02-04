// @ts-nocheck
// TODO: Fix type errors
/**
 * HomeGreekHome Export Template
 * 
 * XML export template for HomeGreekHome, a Greek real estate platform.
 * Uses English element names with support for Greek content.
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
// HOMEGREEKHOME-SPECIFIC TYPE MAPPINGS
// ============================================

/**
 * HomeGreekHome property type codes
 */
export const HOME_GREEK_HOME_PROPERTY_TYPES: Record<string, string> = {
  APARTMENT: "apartment",
  HOUSE: "house",
  MAISONETTE: "maisonette",
  COMMERCIAL: "commercial",
  LAND: "land",
  PLOT: "plot",
  WAREHOUSE: "warehouse",
  PARKING: "parking",
  INDUSTRIAL: "industrial",
  FARM: "farm",
  VACATION: "vacation_home",
  RESIDENTIAL: "residential",
  RENTAL: "rental",
  OTHER: "other",
};

/**
 * HomeGreekHome transaction types
 */
export const HOME_GREEK_HOME_TRANSACTION_TYPES: Record<string, string> = {
  SALE: "for_sale",
  RENTAL: "for_rent",
  SHORT_TERM: "short_term_rental",
  EXCHANGE: "exchange",
};

/**
 * HomeGreekHome heating types
 */
export const HOME_GREEK_HOME_HEATING_TYPES: Record<string, string> = {
  AUTONOMOUS: "autonomous",
  CENTRAL: "central",
  NATURAL_GAS: "natural_gas",
  HEAT_PUMP: "heat_pump",
  ELECTRIC: "electric",
  NONE: "no_heating",
};

/**
 * HomeGreekHome furnished status
 */
export const HOME_GREEK_HOME_FURNISHED: Record<string, string> = {
  NO: "unfurnished",
  PARTIALLY: "partially_furnished",
  FULLY: "fully_furnished",
};

/**
 * HomeGreekHome condition codes
 */
export const HOME_GREEK_HOME_CONDITIONS: Record<string, string> = {
  EXCELLENT: "excellent",
  VERY_GOOD: "very_good",
  GOOD: "good",
  NEEDS_RENOVATION: "needs_renovation",
};

// ============================================
// FIELD MAPPINGS
// ============================================

export const HOME_GREEK_HOME_FIELD_MAPPINGS: FieldMapping[] = [
  // Core identification
  {
    internalField: "id",
    portalField: "reference_id",
    type: "string",
    required: true,
    labelEn: "Reference ID",
    labelEl: "Κωδικός Αναφοράς",
    xmlAttribute: true,
  },
  
  // Property details
  {
    internalField: "property_name",
    portalField: "title",
    type: "string",
    required: true,
    labelEn: "Title",
    labelEl: "Τίτλος",
    xmlCdata: true,
    transform: (value) => truncateText(sanitizeTextForExport(value as string), 150),
  },
  {
    internalField: "description",
    portalField: "description",
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
    portalField: "property_type",
    type: "enum",
    required: true,
    labelEn: "Property Type",
    labelEl: "Τύπος Ακινήτου",
    enumMap: HOME_GREEK_HOME_PROPERTY_TYPES,
  },
  {
    internalField: "transaction_type",
    portalField: "listing_type",
    type: "enum",
    required: true,
    labelEn: "Listing Type",
    labelEl: "Τύπος Αγγελίας",
    enumMap: HOME_GREEK_HOME_TRANSACTION_TYPES,
    defaultValue: "for_sale",
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
  {
    internalField: "price",
    portalField: "currency",
    type: "string",
    required: false,
    labelEn: "Currency",
    labelEl: "Νόμισμα",
    transform: () => "EUR",
  },
  
  // Size
  {
    internalField: "square_feet",
    portalField: "living_area",
    type: "number",
    required: true,
    labelEn: "Living Area (sqm)",
    labelEl: "Εμβαδόν Κατοικίας (τ.μ.)",
    transform: (value, property) => property.size_net_sqm || value || 0,
  },
  {
    internalField: "size_gross_sqm",
    portalField: "total_area",
    type: "number",
    required: false,
    labelEn: "Total Area (sqm)",
    labelEl: "Συνολικό Εμβαδόν (τ.μ.)",
  },
  {
    internalField: "plot_size_sqm",
    portalField: "plot_area",
    type: "number",
    required: false,
    labelEn: "Plot Area (sqm)",
    labelEl: "Εμβαδόν Οικοπέδου (τ.μ.)",
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
    internalField: "municipality",
    portalField: "municipality",
    type: "string",
    required: false,
    labelEn: "Municipality",
    labelEl: "Δήμος",
  },
  {
    internalField: "area",
    portalField: "neighborhood",
    type: "string",
    required: false,
    labelEn: "Neighborhood",
    labelEl: "Περιοχή",
  },
  {
    internalField: "address_street",
    portalField: "street",
    type: "string",
    required: false,
    labelEn: "Street",
    labelEl: "Οδός",
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
  
  // Coordinates
  {
    internalField: "latitude",
    portalField: "latitude",
    type: "number",
    required: false,
    labelEn: "Latitude",
    labelEl: "Γεωγραφικό Πλάτος",
  },
  {
    internalField: "longitude",
    portalField: "longitude",
    type: "number",
    required: false,
    labelEn: "Longitude",
    labelEl: "Γεωγραφικό Μήκος",
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
  },
  {
    internalField: "furnished",
    portalField: "furnishing",
    type: "enum",
    required: false,
    labelEn: "Furnishing",
    labelEl: "Επίπλωση",
    enumMap: HOME_GREEK_HOME_FURNISHED,
  },
  {
    internalField: "heating_type",
    portalField: "heating_type",
    type: "enum",
    required: false,
    labelEn: "Heating Type",
    labelEl: "Τύπος Θέρμανσης",
    enumMap: HOME_GREEK_HOME_HEATING_TYPES,
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
    enumMap: HOME_GREEK_HOME_CONDITIONS,
  },
  {
    internalField: "accepts_pets",
    portalField: "pets_allowed",
    type: "boolean",
    required: false,
    labelEn: "Pets Allowed",
    labelEl: "Κατοικίδια",
  },
  {
    internalField: "parking_spots",
    portalField: "parking_spaces",
    type: "number",
    required: false,
    labelEn: "Parking Spaces",
    labelEl: "Θέσεις Parking",
  },
  
  // Monthly charges
  {
    internalField: "monthly_common_charges",
    portalField: "monthly_charges",
    type: "currency",
    required: false,
    labelEn: "Monthly Charges",
    labelEl: "Μηνιαία Κοινόχρηστα",
  },
  
  // Images
  {
    internalField: "images",
    portalField: "images",
    type: "array",
    required: false,
    labelEn: "Images",
    labelEl: "Εικόνες",
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
  
  // Timestamps
  {
    internalField: "createdAt",
    portalField: "created_date",
    type: "datetime",
    required: false,
    labelEn: "Created Date",
    labelEl: "Ημερομηνία Δημιουργίας",
  },
  {
    internalField: "updatedAt",
    portalField: "updated_date",
    type: "datetime",
    required: false,
    labelEn: "Updated Date",
    labelEl: "Ημερομηνία Ενημέρωσης",
  },
];

// ============================================
// TEMPLATE DEFINITION
// ============================================

export const HOME_GREEK_HOME_TEMPLATE: PortalTemplate = {
  id: "home_greek_home",
  name: "HomeGreekHome",
  nameEl: "HomeGreekHome",
  description: "Export properties for HomeGreekHome real estate platform in XML format",
  descriptionEl: "Εξαγωγή ακινήτων για το HomeGreekHome σε μορφή XML",
  format: "xml",
  website: "https://www.homegreekhome.com",
  icon: "/portals/homegreekhome.png",
  fieldMappings: HOME_GREEK_HOME_FIELD_MAPPINGS,
  
  // XML configuration
  xmlRoot: "properties",
  xmlItem: "property",
  xmlDeclaration: true,
  xmlNamespace: "http://www.homegreekhome.com/schema",
  
  // Validation rules
  validation: {
    maxProperties: 1000,
    maxDescriptionLength: 5000,
    maxTitleLength: 150,
    minImages: 3,
    maxImages: 50,
    requiredFields: ["property_name", "price", "square_feet", "property_type", "address_city", "description"],
    customValidation: (property: PropertyData) => {
      const errors = [];
      const warnings = [];
      
      // Recommend coordinates for better listing visibility
      if (!property.latitude || !property.longitude) {
        warnings.push({
          field: "coordinates",
          message: "Adding coordinates improves listing visibility on HomeGreekHome",
          messageEl: "Η προσθήκη συντεταγμένων βελτιώνει την ορατότητα της αγγελίας",
        });
      }
      
      // Check for minimum images
      const imageCount = property.images?.length || 0;
      if (imageCount < 3) {
        warnings.push({
          field: "images",
          message: `Only ${imageCount} images provided, 3+ recommended for better visibility`,
          messageEl: `Μόνο ${imageCount} εικόνες, συνιστώνται 3+ για καλύτερη ορατότητα`,
        });
      }
      
      return { valid: errors.length === 0, errors, warnings };
    },
  },
  
  // Export options
  exportOptions: {
    includeWithoutImages: false,
    includeDrafts: false,
    includeInactive: false,
    includeContact: true,
    includeAgency: true,
  },
};
