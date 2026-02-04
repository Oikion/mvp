/**
 * Greek Portal Export Templates
 * 
 * Portal-specific export templates for Greek real estate portals.
 * Supports XML and CSV formats with intelligent field mapping.
 */

// ============================================
// TYPES
// ============================================

export type PortalId = 
  | "spitogatos" 
  | "golden_home" 
  | "tospitimou" 
  | "home_greek_home" 
  | "facebook" 
  | "custom";

export type PortalFormat = "xml" | "csv";

export type FieldType = 
  | "string" 
  | "number" 
  | "boolean" 
  | "date" 
  | "datetime" 
  | "currency" 
  | "enum" 
  | "array" 
  | "url";

/**
 * Field mapping definition for transforming internal fields to portal fields
 */
export interface FieldMapping {
  /** Internal field name from Properties model */
  internalField: string;
  /** Portal-specific field name */
  portalField: string;
  /** Field type for formatting */
  type: FieldType;
  /** Whether this field is required by the portal */
  required: boolean;
  /** Default value if internal field is empty */
  defaultValue?: unknown;
  /** Transform function for value conversion */
  transform?: (value: unknown, property: PropertyData) => unknown;
  /** Enum value mapping (internal value -> portal value) */
  enumMap?: Record<string, string | number>;
  /** Greek label for the field */
  labelEl?: string;
  /** English label for the field */
  labelEn?: string;
  /** XML-specific: whether to use as attribute instead of element */
  xmlAttribute?: boolean;
  /** XML-specific: CDATA wrapper for text content */
  xmlCdata?: boolean;
}

/**
 * Portal template configuration
 */
export interface PortalTemplate {
  /** Unique portal identifier */
  id: PortalId;
  /** Portal display name */
  name: string;
  /** Greek display name */
  nameEl: string;
  /** Portal description */
  description: string;
  /** Greek description */
  descriptionEl: string;
  /** Export format (xml or csv) */
  format: PortalFormat;
  /** Portal website URL */
  website: string;
  /** Portal logo/icon path */
  icon?: string;
  /** Field mappings for this portal */
  fieldMappings: FieldMapping[];
  /** CSV-specific: delimiter character */
  csvDelimiter?: string;
  /** CSV-specific: include UTF-8 BOM for Greek characters */
  csvBom?: boolean;
  /** CSV-specific: quote character */
  csvQuote?: string;
  /** XML-specific: root element name */
  xmlRoot?: string;
  /** XML-specific: item element name */
  xmlItem?: string;
  /** XML-specific: XML declaration */
  xmlDeclaration?: boolean;
  /** XML-specific: namespace */
  xmlNamespace?: string;
  /** Validation rules */
  validation?: PortalValidation;
  /** Export options */
  exportOptions?: PortalExportOptions;
}

/**
 * Validation rules for portal export
 */
export interface PortalValidation {
  /** Maximum number of properties per export */
  maxProperties?: number;
  /** Maximum description length */
  maxDescriptionLength?: number;
  /** Maximum title length */
  maxTitleLength?: number;
  /** Required image minimum count */
  minImages?: number;
  /** Maximum images per property */
  maxImages?: number;
  /** Required fields that must have values */
  requiredFields?: string[];
  /** Custom validation function */
  customValidation?: (property: PropertyData) => ValidationResult;
}

/**
 * Export options for portal
 */
export interface PortalExportOptions {
  /** Include properties with no images */
  includeWithoutImages?: boolean;
  /** Include draft properties */
  includeDrafts?: boolean;
  /** Include inactive/off-market properties */
  includeInactive?: boolean;
  /** Image base URL for relative paths */
  imageBaseUrl?: string;
  /** Property listing URL pattern */
  listingUrlPattern?: string;
  /** Contact information to include */
  includeContact?: boolean;
  /** Agency information to include */
  includeAgency?: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  messageEl: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  messageEl: string;
}

/**
 * Property data structure for export
 */
export interface PropertyData {
  id: string;
  property_name: string;
  price?: number | null;
  property_type?: string | null;
  property_status?: string | null;
  transaction_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_feet?: number | null;
  size_net_sqm?: number | null;
  size_gross_sqm?: number | null;
  lot_size?: number | null;
  plot_size_sqm?: number | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  postal_code?: string | null;
  area?: string | null;
  municipality?: string | null;
  year_built?: number | null;
  renovated_year?: number | null;
  description?: string | null;
  floor?: string | null;
  floors_total?: number | null;
  elevator?: boolean | null;
  furnished?: string | null;
  heating_type?: string | null;
  energy_cert_class?: string | null;
  condition?: string | null;
  orientation?: unknown;
  amenities?: unknown;
  accepts_pets?: boolean | null;
  parking_spots?: number | null;
  available_from?: Date | string | null;
  monthly_common_charges?: number | null;
  images?: string[];
  latitude?: number | null;
  longitude?: number | null;
  assigned_to_name?: string | null;
  primary_email?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string | null;
  [key: string]: unknown;
}

/**
 * Export result from portal template
 */
export interface PortalExportResult {
  success: boolean;
  data: string;
  contentType: string;
  filename: string;
  encoding: string;
  propertyCount: number;
  validationResults: ValidationResult[];
  errors?: string[];
}

// ============================================
// ENUM MAPPINGS (re-exported from enums.ts to avoid circular dependencies)
// ============================================

export {
  PROPERTY_TYPE_GREEK,
  TRANSACTION_TYPE_GREEK,
  HEATING_TYPE_GREEK,
  ENERGY_CLASS_GREEK,
  FURNISHED_GREEK,
  CONDITION_GREEK,
  STATUS_GREEK,
} from "./enums";

// ============================================
// PORTAL REGISTRY
// ============================================

import { SPITOGATOS_TEMPLATE } from "./spitogatos";
import { GOLDEN_HOME_TEMPLATE } from "./golden-home";
import { TOSPITIMOU_TEMPLATE } from "./tospitimou";
import { HOME_GREEK_HOME_TEMPLATE } from "./home-greek-home";
import { FACEBOOK_TEMPLATE } from "./facebook";

/**
 * Registry of all portal templates
 */
export const PORTAL_TEMPLATES: Record<PortalId, PortalTemplate> = {
  spitogatos: SPITOGATOS_TEMPLATE,
  golden_home: GOLDEN_HOME_TEMPLATE,
  tospitimou: TOSPITIMOU_TEMPLATE,
  home_greek_home: HOME_GREEK_HOME_TEMPLATE,
  facebook: FACEBOOK_TEMPLATE,
  custom: {
    id: "custom",
    name: "Custom Template",
    nameEl: "Προσαρμοσμένο Πρότυπο",
    description: "Create your own custom export template",
    descriptionEl: "Δημιουργήστε το δικό σας προσαρμοσμένο πρότυπο εξαγωγής",
    format: "csv",
    website: "",
    fieldMappings: [],
  },
};

/**
 * Get all available portal templates
 */
export function getAllPortalTemplates(): PortalTemplate[] {
  return Object.values(PORTAL_TEMPLATES);
}

/**
 * Get portal template by ID
 */
export function getPortalTemplate(id: PortalId): PortalTemplate | null {
  return PORTAL_TEMPLATES[id] || null;
}

/**
 * Get portals by format type
 */
export function getPortalsByFormat(format: PortalFormat): PortalTemplate[] {
  return getAllPortalTemplates().filter(p => p.format === format);
}

/**
 * Check if a portal ID is valid
 */
export function isValidPortalId(id: string): id is PortalId {
  return id in PORTAL_TEMPLATES;
}

// Re-export individual portal templates
export { SPITOGATOS_TEMPLATE } from "./spitogatos";
export { GOLDEN_HOME_TEMPLATE } from "./golden-home";
export { TOSPITIMOU_TEMPLATE } from "./tospitimou";
export { HOME_GREEK_HOME_TEMPLATE } from "./home-greek-home";
export { FACEBOOK_TEMPLATE } from "./facebook";

// Re-export field mapper
export {
  mapPropertyToPortal,
  mapPropertiesToPortal,
  validatePropertyForPortal,
  validatePropertiesForPortal,
  getRequiredFieldsForPortal,
  enhancePropertyWithComputed,
  sanitizeTextForExport,
  truncateText,
  type MappedProperty,
  type MappingContext,
} from "./field-mapper";

// Re-export custom builder
export {
  buildCustomTemplate,
  createFromPreset,
  validateCustomTemplateConfig,
  serializeTemplateConfig,
  deserializeTemplateConfig,
  getAvailableFieldsByCategory,
  AVAILABLE_INTERNAL_FIELDS,
  TEMPLATE_PRESETS,
  type CustomTemplateConfig,
  type CustomFieldMapping,
  type TemplatePreset,
} from "./custom-builder";
