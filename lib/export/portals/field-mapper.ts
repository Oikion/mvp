/**
 * Field Mapping Algorithm for Portal Exports
 * 
 * Provides generic field mapping and value transformation
 * for converting internal property data to portal-specific formats.
 */

import type {
  PortalTemplate,
  FieldMapping,
  PropertyData,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from "./index";

// ============================================
// TYPES
// ============================================

export interface MappedProperty {
  [key: string]: unknown;
}

export interface MappingContext {
  locale?: "en" | "el";
  imageBaseUrl?: string;
  listingBaseUrl?: string;
  agencyName?: string;
  agencyPhone?: string;
  agencyEmail?: string;
}

// ============================================
// VALUE TRANSFORMERS
// ============================================

/**
 * Transform a value based on field type
 */
function transformValue(
  value: unknown,
  mapping: FieldMapping,
  property: PropertyData,
  context: MappingContext
): unknown {
  // Apply custom transform if provided
  if (mapping.transform) {
    return mapping.transform(value, property);
  }

  // Handle null/undefined values
  if (value === null || value === undefined || value === "") {
    return mapping.defaultValue ?? null;
  }

  // Apply type-specific transformations
  switch (mapping.type) {
    case "string":
      return String(value);

    case "number":
      return typeof value === "number" ? value : parseFloat(String(value)) || 0;

    case "boolean":
      return value === true || value === "true" || value === 1;

    case "date":
      return formatDate(value);

    case "datetime":
      return formatDateTime(value);

    case "currency":
      return formatCurrency(value);

    case "enum":
      if (mapping.enumMap && typeof value === "string") {
        return mapping.enumMap[value] ?? value;
      }
      return value;

    case "array":
      if (Array.isArray(value)) {
        return value;
      }
      return value ? [value] : [];

    case "url":
      return formatUrl(value, context.imageBaseUrl);

    default:
      return value;
  }
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(value: unknown): string {
  if (!value) return "";
  
  try {
    const date = value instanceof Date ? value : new Date(String(value));
    if (isNaN(date.getTime())) return "";
    
    return date.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

/**
 * Format datetime to ISO string
 */
function formatDateTime(value: unknown): string {
  if (!value) return "";
  
  try {
    const date = value instanceof Date ? value : new Date(String(value));
    if (isNaN(date.getTime())) return "";
    
    return date.toISOString();
  } catch {
    return "";
  }
}

/**
 * Format currency value (remove decimals for whole numbers)
 */
function formatCurrency(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Format URL with optional base URL
 */
function formatUrl(value: unknown, baseUrl?: string): string {
  if (!value) return "";
  
  const strValue = String(value);
  
  // If already absolute URL, return as is
  if (strValue.startsWith("http://") || strValue.startsWith("https://")) {
    return strValue;
  }
  
  // Prepend base URL if provided
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}/${strValue.replace(/^\//, "")}`;
  }
  
  return strValue;
}

// ============================================
// FIELD MAPPING
// ============================================

/**
 * Map a single property to portal format
 */
export function mapPropertyToPortal(
  property: PropertyData,
  template: PortalTemplate,
  context: MappingContext = {}
): MappedProperty {
  const mapped: MappedProperty = {};

  for (const mapping of template.fieldMappings) {
    // Get value from property using internal field name
    // Support nested field access with dot notation
    const value = getNestedValue(property, mapping.internalField);
    
    // Transform the value
    const transformedValue = transformValue(value, mapping, property, context);
    
    // Set the mapped value using portal field name
    mapped[mapping.portalField] = transformedValue;
  }

  return mapped;
}

/**
 * Map multiple properties to portal format
 */
export function mapPropertiesToPortal(
  properties: PropertyData[],
  template: PortalTemplate,
  context: MappingContext = {}
): MappedProperty[] {
  return properties.map(property => mapPropertyToPortal(property, template, context));
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate a single property for portal export
 */
export function validatePropertyForPortal(
  property: PropertyData,
  template: PortalTemplate
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check required fields
  for (const mapping of template.fieldMappings) {
    if (mapping.required) {
      const value = getNestedValue(property, mapping.internalField);
      
      if (value === null || value === undefined || value === "") {
        errors.push({
          field: mapping.internalField,
          message: `Required field "${mapping.labelEn || mapping.portalField}" is missing`,
          messageEl: `Το υποχρεωτικό πεδίο "${mapping.labelEl || mapping.portalField}" λείπει`,
        });
      }
    }
  }

  // Check validation rules from template
  const validation = template.validation;
  
  if (validation) {
    // Check description length
    if (validation.maxDescriptionLength && property.description) {
      if (property.description.length > validation.maxDescriptionLength) {
        warnings.push({
          field: "description",
          message: `Description exceeds ${validation.maxDescriptionLength} characters`,
          messageEl: `Η περιγραφή υπερβαίνει τους ${validation.maxDescriptionLength} χαρακτήρες`,
        });
      }
    }

    // Check title length
    if (validation.maxTitleLength && property.property_name) {
      if (property.property_name.length > validation.maxTitleLength) {
        warnings.push({
          field: "property_name",
          message: `Title exceeds ${validation.maxTitleLength} characters`,
          messageEl: `Ο τίτλος υπερβαίνει τους ${validation.maxTitleLength} χαρακτήρες`,
        });
      }
    }

    // Check minimum images
    if (validation.minImages) {
      const imageCount = property.images?.length || 0;
      if (imageCount < validation.minImages) {
        warnings.push({
          field: "images",
          message: `Property has ${imageCount} images, minimum required is ${validation.minImages}`,
          messageEl: `Το ακίνητο έχει ${imageCount} εικόνες, απαιτούνται τουλάχιστον ${validation.minImages}`,
        });
      }
    }

    // Run custom validation if provided
    if (validation.customValidation) {
      const customResult = validation.customValidation(property);
      errors.push(...customResult.errors);
      warnings.push(...customResult.warnings);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate multiple properties for portal export
 */
export function validatePropertiesForPortal(
  properties: PropertyData[],
  template: PortalTemplate
): ValidationResult[] {
  return properties.map(property => validatePropertyForPortal(property, template));
}

/**
 * Get list of required fields for a portal
 */
export function getRequiredFieldsForPortal(template: PortalTemplate): FieldMapping[] {
  return template.fieldMappings.filter(m => m.required);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get computed property values (price per sqm, full address, etc.)
 */
export function getComputedPropertyValues(property: PropertyData): Record<string, unknown> {
  return {
    // Price per square meter
    price_per_sqm: property.price && property.square_feet
      ? Math.round(property.price / property.square_feet)
      : null,
    
    // Full address string
    address_full: [
      property.address_street,
      property.address_city,
      property.municipality,
      property.address_state,
      property.postal_code,
    ].filter(Boolean).join(", "),

    // Size preference (net size or square feet)
    size_sqm: property.size_net_sqm || property.square_feet || null,

    // Area with municipality
    location_full: [
      property.area,
      property.municipality,
      property.address_city,
    ].filter(Boolean).join(", "),

    // Total floors string
    floor_info: property.floor
      ? property.floors_total
        ? `${property.floor}/${property.floors_total}`
        : property.floor
      : null,

    // Room count (bedrooms for now)
    rooms: property.bedrooms || 0,
  };
}

/**
 * Enhance property with computed values
 */
export function enhancePropertyWithComputed(property: PropertyData): PropertyData {
  const computed = getComputedPropertyValues(property);
  return {
    ...property,
    ...computed,
  };
}

/**
 * Clean and sanitize text for export
 */
export function sanitizeTextForExport(text: string | null | undefined): string {
  if (!text) return "";
  
  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    // Trim
    .trim();
}

/**
 * Truncate text to maximum length
 */
export function truncateText(
  text: string | null | undefined,
  maxLength: number,
  ellipsis: string = "..."
): string {
  if (!text) return "";
  
  if (text.length <= maxLength) return text;
  
  return text.slice(0, maxLength - ellipsis.length).trim() + ellipsis;
}

/**
 * Format phone number for portal export
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  
  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, "");
}

/**
 * Generate listing URL for property
 */
export function generateListingUrl(
  property: PropertyData,
  baseUrl: string,
  pattern: string = "/:id"
): string {
  return baseUrl + pattern.replace(":id", property.id);
}
