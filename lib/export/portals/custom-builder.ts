/**
 * Custom Template Builder
 * 
 * Provides utilities for creating and managing custom export templates
 * with user-defined field mappings.
 */

import type {
  PortalTemplate,
  FieldMapping,
  PortalFormat,
  FieldType,
  PropertyData,
  PortalValidation,
  PortalExportOptions,
} from "./index";

// ============================================
// TYPES
// ============================================

export interface CustomTemplateConfig {
  /** Template name */
  name: string;
  /** Template name in Greek */
  nameEl?: string;
  /** Description */
  description?: string;
  /** Greek description */
  descriptionEl?: string;
  /** Export format (csv or xml) */
  format: PortalFormat;
  /** Field mappings */
  fieldMappings: CustomFieldMapping[];
  /** CSV options */
  csvOptions?: {
    delimiter?: string;
    includeHeaders?: boolean;
    bom?: boolean;
  };
  /** XML options */
  xmlOptions?: {
    rootElement?: string;
    itemElement?: string;
    includeDeclaration?: boolean;
  };
  /** Validation options */
  validation?: Partial<PortalValidation>;
  /** Export options */
  exportOptions?: Partial<PortalExportOptions>;
}

export interface CustomFieldMapping {
  /** Internal field to map from */
  internalField: string;
  /** Output field name (column header or XML element) */
  outputField: string;
  /** Field data type */
  type: FieldType;
  /** Whether this field is required */
  required?: boolean;
  /** Default value if empty */
  defaultValue?: unknown;
  /** Custom transform expression (simple expressions only) */
  transform?: string;
  /** Enum value mappings */
  enumMappings?: Record<string, string>;
  /** Include in export */
  enabled?: boolean;
}

export interface TemplatePreset {
  id: string;
  name: string;
  nameEl: string;
  description: string;
  descriptionEl: string;
  format: PortalFormat;
  baseFields: string[];
}

// ============================================
// AVAILABLE INTERNAL FIELDS
// ============================================

/**
 * All available internal fields from Properties model
 */
export const AVAILABLE_INTERNAL_FIELDS: {
  field: string;
  label: string;
  labelEl: string;
  type: FieldType;
  category: string;
}[] = [
  // Identification
  { field: "id", label: "ID", labelEl: "ID", type: "string", category: "identification" },
  { field: "property_name", label: "Property Name", labelEl: "Όνομα Ακινήτου", type: "string", category: "identification" },
  
  // Classification
  { field: "property_type", label: "Property Type", labelEl: "Τύπος Ακινήτου", type: "enum", category: "classification" },
  { field: "property_status", label: "Status", labelEl: "Κατάσταση", type: "enum", category: "classification" },
  { field: "transaction_type", label: "Transaction Type", labelEl: "Τύπος Συναλλαγής", type: "enum", category: "classification" },
  
  // Pricing
  { field: "price", label: "Price", labelEl: "Τιμή", type: "currency", category: "pricing" },
  { field: "monthly_common_charges", label: "Common Charges", labelEl: "Κοινόχρηστα", type: "currency", category: "pricing" },
  
  // Size
  { field: "square_feet", label: "Area (sqm)", labelEl: "Εμβαδόν (τ.μ.)", type: "number", category: "size" },
  { field: "size_net_sqm", label: "Net Area (sqm)", labelEl: "Καθαρό Εμβαδόν (τ.μ.)", type: "number", category: "size" },
  { field: "size_gross_sqm", label: "Gross Area (sqm)", labelEl: "Μικτό Εμβαδόν (τ.μ.)", type: "number", category: "size" },
  { field: "plot_size_sqm", label: "Plot Size (sqm)", labelEl: "Εμβαδόν Οικοπέδου (τ.μ.)", type: "number", category: "size" },
  { field: "lot_size", label: "Lot Size", labelEl: "Έκταση", type: "number", category: "size" },
  
  // Rooms
  { field: "bedrooms", label: "Bedrooms", labelEl: "Υπνοδωμάτια", type: "number", category: "rooms" },
  { field: "bathrooms", label: "Bathrooms", labelEl: "Μπάνια", type: "number", category: "rooms" },
  
  // Location
  { field: "address_street", label: "Street", labelEl: "Οδός", type: "string", category: "location" },
  { field: "address_city", label: "City", labelEl: "Πόλη", type: "string", category: "location" },
  { field: "address_state", label: "State/Region", labelEl: "Περιφέρεια", type: "string", category: "location" },
  { field: "postal_code", label: "Postal Code", labelEl: "Τ.Κ.", type: "string", category: "location" },
  { field: "area", label: "Area", labelEl: "Περιοχή", type: "string", category: "location" },
  { field: "municipality", label: "Municipality", labelEl: "Δήμος", type: "string", category: "location" },
  { field: "latitude", label: "Latitude", labelEl: "Γεωγραφικό Πλάτος", type: "number", category: "location" },
  { field: "longitude", label: "Longitude", labelEl: "Γεωγραφικό Μήκος", type: "number", category: "location" },
  
  // Building
  { field: "floor", label: "Floor", labelEl: "Όροφος", type: "string", category: "building" },
  { field: "floors_total", label: "Total Floors", labelEl: "Σύνολο Ορόφων", type: "number", category: "building" },
  { field: "year_built", label: "Year Built", labelEl: "Έτος Κατασκευής", type: "number", category: "building" },
  { field: "renovated_year", label: "Renovation Year", labelEl: "Έτος Ανακαίνισης", type: "number", category: "building" },
  
  // Features
  { field: "elevator", label: "Elevator", labelEl: "Ασανσέρ", type: "boolean", category: "features" },
  { field: "furnished", label: "Furnished", labelEl: "Επίπλωση", type: "enum", category: "features" },
  { field: "heating_type", label: "Heating Type", labelEl: "Τύπος Θέρμανσης", type: "enum", category: "features" },
  { field: "energy_cert_class", label: "Energy Class", labelEl: "Ενεργειακή Κλάση", type: "enum", category: "features" },
  { field: "condition", label: "Condition", labelEl: "Κατάσταση Ακινήτου", type: "enum", category: "features" },
  { field: "accepts_pets", label: "Pets Allowed", labelEl: "Κατοικίδια", type: "boolean", category: "features" },
  { field: "parking_spots", label: "Parking", labelEl: "Θέσεις Parking", type: "number", category: "features" },
  
  // Content
  { field: "description", label: "Description", labelEl: "Περιγραφή", type: "string", category: "content" },
  { field: "images", label: "Images", labelEl: "Εικόνες", type: "array", category: "content" },
  
  // Dates
  { field: "available_from", label: "Available From", labelEl: "Διαθέσιμο Από", type: "date", category: "dates" },
  { field: "createdAt", label: "Created Date", labelEl: "Ημερομηνία Δημιουργίας", type: "datetime", category: "dates" },
  { field: "updatedAt", label: "Updated Date", labelEl: "Ημερομηνία Ενημέρωσης", type: "datetime", category: "dates" },
  
  // Contact
  { field: "assigned_to_name", label: "Agent", labelEl: "Σύμβουλος", type: "string", category: "contact" },
  { field: "primary_email", label: "Email", labelEl: "Email", type: "string", category: "contact" },
];

/**
 * Get available fields grouped by category
 */
export function getAvailableFieldsByCategory(): Record<string, typeof AVAILABLE_INTERNAL_FIELDS> {
  const grouped: Record<string, typeof AVAILABLE_INTERNAL_FIELDS> = {};
  
  for (const field of AVAILABLE_INTERNAL_FIELDS) {
    if (!grouped[field.category]) {
      grouped[field.category] = [];
    }
    grouped[field.category].push(field);
  }
  
  return grouped;
}

// ============================================
// TEMPLATE PRESETS
// ============================================

/**
 * Predefined template presets for common use cases
 */
export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "basic",
    name: "Basic Listing",
    nameEl: "Βασική Αγγελία",
    description: "Essential fields for a property listing",
    descriptionEl: "Βασικά πεδία για αγγελία ακινήτου",
    format: "csv",
    baseFields: [
      "id", "property_name", "property_type", "transaction_type",
      "price", "square_feet", "bedrooms", "bathrooms",
      "address_city", "area", "description",
    ],
  },
  {
    id: "detailed",
    name: "Detailed Listing",
    nameEl: "Λεπτομερής Αγγελία",
    description: "Comprehensive fields for detailed listings",
    descriptionEl: "Πλήρη πεδία για λεπτομερείς αγγελίες",
    format: "csv",
    baseFields: [
      "id", "property_name", "property_type", "property_status", "transaction_type",
      "price", "square_feet", "plot_size_sqm", "bedrooms", "bathrooms",
      "address_street", "address_city", "postal_code", "area", "municipality",
      "floor", "floors_total", "year_built",
      "elevator", "furnished", "heating_type", "energy_cert_class", "condition",
      "description", "images",
    ],
  },
  {
    id: "investment",
    name: "Investment Analysis",
    nameEl: "Επενδυτική Ανάλυση",
    description: "Fields focused on investment properties",
    descriptionEl: "Πεδία για επενδυτικά ακίνητα",
    format: "csv",
    baseFields: [
      "id", "property_name", "property_type", "transaction_type",
      "price", "square_feet", "price_per_sqm",
      "address_city", "area",
      "year_built", "condition", "energy_cert_class",
      "monthly_common_charges",
    ],
  },
  {
    id: "xml_feed",
    name: "XML Feed",
    nameEl: "XML Feed",
    description: "Standard XML feed format",
    descriptionEl: "Τυπική μορφή XML feed",
    format: "xml",
    baseFields: [
      "id", "property_name", "property_type", "transaction_type",
      "price", "square_feet", "bedrooms", "bathrooms",
      "address_city", "area", "latitude", "longitude",
      "description", "images",
    ],
  },
];

// ============================================
// CUSTOM TEMPLATE BUILDER
// ============================================

/**
 * Build a custom PortalTemplate from configuration
 */
export function buildCustomTemplate(config: CustomTemplateConfig): PortalTemplate {
  const fieldMappings: FieldMapping[] = config.fieldMappings
    .filter(m => m.enabled !== false)
    .map(customToFieldMapping);
  
  return {
    id: "custom",
    name: config.name,
    nameEl: config.nameEl || config.name,
    description: config.description || `Custom export template: ${config.name}`,
    descriptionEl: config.descriptionEl || config.description || `Προσαρμοσμένο πρότυπο: ${config.name}`,
    format: config.format,
    website: "",
    fieldMappings,
    
    // CSV options
    csvDelimiter: config.csvOptions?.delimiter || ",",
    csvBom: config.csvOptions?.bom ?? true,
    csvQuote: '"',
    
    // XML options
    xmlRoot: config.xmlOptions?.rootElement || "properties",
    xmlItem: config.xmlOptions?.itemElement || "property",
    xmlDeclaration: config.xmlOptions?.includeDeclaration ?? true,
    
    // Validation
    validation: config.validation,
    
    // Export options
    exportOptions: config.exportOptions,
  };
}

/**
 * Convert CustomFieldMapping to FieldMapping
 */
function customToFieldMapping(custom: CustomFieldMapping): FieldMapping {
  const fieldInfo = AVAILABLE_INTERNAL_FIELDS.find(f => f.field === custom.internalField);
  
  const mapping: FieldMapping = {
    internalField: custom.internalField,
    portalField: custom.outputField,
    type: custom.type || fieldInfo?.type || "string",
    required: custom.required || false,
    defaultValue: custom.defaultValue,
    labelEn: fieldInfo?.label || custom.outputField,
    labelEl: fieldInfo?.labelEl || custom.outputField,
  };
  
  // Add enum mappings if provided
  if (custom.enumMappings && Object.keys(custom.enumMappings).length > 0) {
    mapping.enumMap = custom.enumMappings;
  }
  
  // Add transform if provided (simple expressions)
  if (custom.transform) {
    mapping.transform = createTransformFunction(custom.transform);
  }
  
  return mapping;
}

/**
 * Create a transform function from a simple expression
 * Supports basic operations like concatenation, formatting
 */
function createTransformFunction(expression: string): (value: unknown, property: PropertyData) => unknown {
  // Simple passthrough
  if (expression === "value" || expression === "") {
    return (value) => value;
  }
  
  // Boolean to Yes/No
  if (expression === "booleanToYesNo") {
    return (value) => value ? "Yes" : "No";
  }
  
  // Boolean to Greek Yes/No
  if (expression === "booleanToGreek") {
    return (value) => value ? "Ναι" : "Όχι";
  }
  
  // Boolean to 1/0
  if (expression === "booleanToNumber") {
    return (value) => value ? 1 : 0;
  }
  
  // First array item
  if (expression === "firstArrayItem") {
    return (value) => Array.isArray(value) && value.length > 0 ? value[0] : "";
  }
  
  // Join array with semicolon
  if (expression === "joinArray") {
    return (value) => Array.isArray(value) ? value.join(";") : value;
  }
  
  // Join array with comma
  if (expression === "joinArrayComma") {
    return (value) => Array.isArray(value) ? value.join(",") : value;
  }
  
  // Uppercase
  if (expression === "uppercase") {
    return (value) => typeof value === "string" ? value.toUpperCase() : value;
  }
  
  // Lowercase
  if (expression === "lowercase") {
    return (value) => typeof value === "string" ? value.toLowerCase() : value;
  }
  
  // Default: return value as-is
  return (value) => value;
}

/**
 * Create a custom template from a preset
 */
export function createFromPreset(presetId: string, customizations?: Partial<CustomTemplateConfig>): CustomTemplateConfig | null {
  const preset = TEMPLATE_PRESETS.find(p => p.id === presetId);
  if (!preset) return null;
  
  const fieldMappings: CustomFieldMapping[] = preset.baseFields.map(field => {
    const fieldInfo = AVAILABLE_INTERNAL_FIELDS.find(f => f.field === field);
    return {
      internalField: field,
      outputField: fieldInfo?.label || field,
      type: fieldInfo?.type || "string",
      required: false,
      enabled: true,
    };
  });
  
  return {
    name: customizations?.name || preset.name,
    nameEl: customizations?.nameEl || preset.nameEl,
    description: customizations?.description || preset.description,
    descriptionEl: customizations?.descriptionEl || preset.descriptionEl,
    format: customizations?.format || preset.format,
    fieldMappings: customizations?.fieldMappings || fieldMappings,
    csvOptions: customizations?.csvOptions,
    xmlOptions: customizations?.xmlOptions,
    validation: customizations?.validation,
    exportOptions: customizations?.exportOptions,
  };
}

/**
 * Validate custom template configuration
 */
export function validateCustomTemplateConfig(config: CustomTemplateConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check required fields
  if (!config.name || config.name.trim() === "") {
    errors.push("Template name is required");
  }
  
  if (!config.format || !["csv", "xml"].includes(config.format)) {
    errors.push("Format must be 'csv' or 'xml'");
  }
  
  if (!config.fieldMappings || config.fieldMappings.length === 0) {
    errors.push("At least one field mapping is required");
  }
  
  // Check field mappings
  const outputFields = new Set<string>();
  for (const mapping of config.fieldMappings) {
    if (!mapping.internalField) {
      errors.push(`Field mapping missing internal field`);
    }
    if (!mapping.outputField) {
      errors.push(`Field mapping for '${mapping.internalField}' missing output field name`);
    }
    
    // Check for duplicate output fields
    if (outputFields.has(mapping.outputField)) {
      errors.push(`Duplicate output field name: '${mapping.outputField}'`);
    }
    outputFields.add(mapping.outputField);
    
    // Check internal field exists
    const fieldExists = AVAILABLE_INTERNAL_FIELDS.some(f => f.field === mapping.internalField);
    if (!fieldExists && mapping.internalField !== "custom") {
      errors.push(`Unknown internal field: '${mapping.internalField}'`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Serialize custom template config to JSON
 */
export function serializeTemplateConfig(config: CustomTemplateConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Deserialize custom template config from JSON
 */
export function deserializeTemplateConfig(json: string): CustomTemplateConfig | null {
  try {
    const config = JSON.parse(json) as CustomTemplateConfig;
    const validation = validateCustomTemplateConfig(config);
    
    if (!validation.valid) {
      console.error("Invalid template config:", validation.errors);
      return null;
    }
    
    return config;
  } catch (error) {
    console.error("Failed to parse template config:", error);
    return null;
  }
}
