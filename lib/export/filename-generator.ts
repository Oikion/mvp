/**
 * Descriptive Filename Generator
 * 
 * Generates human-readable, searchable filenames for exports based on entity attributes.
 * Supports Greek to Latin transliteration for compatibility.
 * 
 * Examples:
 * - kolonaki-apartment-120sqm-3bed-xe.xml
 * - glyfada-house-250sqm-5bed-client.pdf
 * - properties-kolonaki-10-items-2025-01-14.xlsx
 */

import { sanitizeFilename, type ExportFormat, type ExportModule } from "./security";

// ============================================
// GREEK TO LATIN TRANSLITERATION MAP
// ============================================

const GREEK_TO_LATIN: Record<string, string> = {
  // Uppercase
  'Α': 'A', 'Β': 'V', 'Γ': 'G', 'Δ': 'D', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'I',
  'Θ': 'Th', 'Ι': 'I', 'Κ': 'K', 'Λ': 'L', 'Μ': 'M', 'Ν': 'N', 'Ξ': 'X',
  'Ο': 'O', 'Π': 'P', 'Ρ': 'R', 'Σ': 'S', 'Τ': 'T', 'Υ': 'Y', 'Φ': 'F',
  'Χ': 'Ch', 'Ψ': 'Ps', 'Ω': 'O',
  // Lowercase
  'α': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'i',
  'θ': 'th', 'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x',
  'ο': 'o', 'π': 'p', 'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'υ': 'y',
  'φ': 'f', 'χ': 'ch', 'ψ': 'ps', 'ω': 'o',
  // Accented vowels
  'ά': 'a', 'έ': 'e', 'ή': 'i', 'ί': 'i', 'ό': 'o', 'ύ': 'y', 'ώ': 'o',
  'Ά': 'A', 'Έ': 'E', 'Ή': 'I', 'Ί': 'I', 'Ό': 'O', 'Ύ': 'Y', 'Ώ': 'O',
  // Diphthongs and special combinations
  'αι': 'e', 'ει': 'i', 'οι': 'i', 'υι': 'i', 'αυ': 'av', 'ευ': 'ev',
  'ου': 'ou', 'γγ': 'ng', 'γκ': 'gk', 'γξ': 'nx', 'γχ': 'nch',
  'μπ': 'b', 'ντ': 'd', 'τσ': 'ts', 'τζ': 'tz',
};

// Property type translations for filenames
const PROPERTY_TYPE_SLUGS: Record<string, string> = {
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  LAND: 'land',
  RENTAL: 'rental',
  VACATION: 'vacation',
  APARTMENT: 'apartment',
  HOUSE: 'house',
  MAISONETTE: 'maisonette',
  WAREHOUSE: 'warehouse',
  PARKING: 'parking',
  PLOT: 'plot',
  FARM: 'farm',
  INDUSTRIAL: 'industrial',
  OTHER: 'other',
};

// Export template slugs
const TEMPLATE_SLUGS: Record<string, string> = {
  CMA: 'cma',
  SHORTLIST: 'shortlist',
  ROI: 'roi-analysis',
  MARKET_TRENDS: 'market-trends',
};

// Destination slugs
const DESTINATION_SLUGS: Record<string, string> = {
  'client': 'client',
  'xe.gr': 'xe',
  'xe': 'xe',
  'spitogatos': 'spitogatos',
  'spiti24': 'spiti24',
  'portal': 'portal',
};

// ============================================
// TRANSLITERATION FUNCTIONS
// ============================================

/**
 * Transliterate Greek text to Latin characters
 */
export function transliterateGreek(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  // First handle multi-character combinations (diphthongs)
  const diphthongs = ['αι', 'ει', 'οι', 'υι', 'αυ', 'ευ', 'ου', 'γγ', 'γκ', 'γξ', 'γχ', 'μπ', 'ντ', 'τσ', 'τζ'];
  for (const diphthong of diphthongs) {
    if (GREEK_TO_LATIN[diphthong]) {
      result = result.replace(new RegExp(diphthong, 'g'), GREEK_TO_LATIN[diphthong]);
    }
  }
  
  // Then handle single characters
  result = result.split('').map(char => GREEK_TO_LATIN[char] || char).join('');
  
  return result;
}

/**
 * Convert text to a URL/filename-safe slug
 */
export function slugify(text: string): string {
  if (!text) return '';
  
  return transliterateGreek(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');    // Remove leading/trailing hyphens
}

// ============================================
// TYPES
// ============================================

export interface PropertyFilenameParams {
  area?: string | null;
  city?: string | null;
  propertyType?: string | null;
  sizeSqm?: number | null;
  bedrooms?: number | null;
  destination?: string | null;
  template?: string | null;
}

export interface BulkFilenameParams {
  area?: string | null;
  count: number;
  template?: string | null;
}

export interface FilenameGeneratorOptions {
  format: ExportFormat;
  includeDate?: boolean;
  maxLength?: number;
}

// ============================================
// FILENAME GENERATORS
// ============================================

/**
 * Generate a descriptive filename for a single property export
 * 
 * @example
 * generatePropertyFilename({
 *   area: 'Κολωνάκι',
 *   propertyType: 'APARTMENT',
 *   sizeSqm: 120,
 *   bedrooms: 3,
 *   destination: 'xe.gr'
 * }, { format: 'xml' })
 * // Returns: 'kolonaki-apartment-120sqm-3bed-xe.xml'
 */
export function generatePropertyFilename(
  params: PropertyFilenameParams,
  options: FilenameGeneratorOptions
): string {
  const { format, includeDate = false, maxLength = 100 } = options;
  const parts: string[] = [];
  
  // Add area/city
  const location = params.area || params.city;
  if (location) {
    parts.push(slugify(location));
  }
  
  // Add property type
  if (params.propertyType) {
    const typeSlug = PROPERTY_TYPE_SLUGS[params.propertyType] || slugify(params.propertyType);
    parts.push(typeSlug);
  }
  
  // Add size
  if (params.sizeSqm && params.sizeSqm > 0) {
    parts.push(`${Math.round(params.sizeSqm)}sqm`);
  }
  
  // Add bedrooms
  if (params.bedrooms && params.bedrooms > 0) {
    parts.push(`${params.bedrooms}bed`);
  }
  
  // Add template if specified
  if (params.template) {
    const templateSlug = TEMPLATE_SLUGS[params.template] || slugify(params.template);
    parts.push(templateSlug);
  }
  
  // Add destination
  if (params.destination) {
    const destSlug = DESTINATION_SLUGS[params.destination.toLowerCase()] || slugify(params.destination);
    parts.push(destSlug);
  }
  
  // Add date if requested
  if (includeDate) {
    parts.push(new Date().toISOString().split('T')[0]);
  }
  
  // Fallback if no parts
  if (parts.length === 0) {
    parts.push('property');
  }
  
  // Join and limit length
  let filename = parts.join('-');
  if (filename.length > maxLength) {
    filename = filename.substring(0, maxLength);
  }
  
  // Add extension
  const extensions: Record<ExportFormat, string> = {
    xlsx: '.xlsx',
    xls: '.xls',
    csv: '.csv',
    pdf: '.pdf',
    xml: '.xml',
  };
  
  return sanitizeFilename(`${filename}${extensions[format] || `.${format}`}`);
}

/**
 * Generate a descriptive filename for bulk exports
 * 
 * @example
 * generateBulkFilename({
 *   area: 'Κολωνάκι',
 *   count: 10,
 *   template: 'CMA'
 * }, { format: 'xlsx' })
 * // Returns: 'properties-kolonaki-10-items-cma-2025-01-14.xlsx'
 */
export function generateBulkFilename(
  params: BulkFilenameParams,
  options: FilenameGeneratorOptions
): string {
  const { format, maxLength = 100 } = options;
  const parts: string[] = ['properties'];
  
  // Add area if specified
  if (params.area) {
    parts.push(slugify(params.area));
  }
  
  // Add count
  parts.push(`${params.count}-items`);
  
  // Add template if specified
  if (params.template) {
    const templateSlug = TEMPLATE_SLUGS[params.template] || slugify(params.template);
    parts.push(templateSlug);
  }
  
  // Always add date for bulk exports
  parts.push(new Date().toISOString().split('T')[0]);
  
  // Join and limit length
  let filename = parts.join('-');
  if (filename.length > maxLength) {
    filename = filename.substring(0, maxLength);
  }
  
  // Add extension
  const extensions: Record<ExportFormat, string> = {
    xlsx: '.xlsx',
    xls: '.xls',
    csv: '.csv',
    pdf: '.pdf',
    xml: '.xml',
  };
  
  return sanitizeFilename(`${filename}${extensions[format] || `.${format}`}`);
}

/**
 * Generate a descriptive filename for client exports
 */
export function generateClientFilename(
  params: {
    clientName?: string | null;
    clientType?: string | null;
    destination?: string | null;
    template?: string | null;
  },
  options: FilenameGeneratorOptions
): string {
  const { format, includeDate = true, maxLength = 100 } = options;
  const parts: string[] = [];
  
  // Add client name (first part only, abbreviated)
  if (params.clientName) {
    const namePart = params.clientName.split(' ')[0];
    parts.push(slugify(namePart));
  } else {
    parts.push('client');
  }
  
  // Add client type
  if (params.clientType) {
    parts.push(slugify(params.clientType).toLowerCase());
  }
  
  // Add template if specified
  if (params.template) {
    const templateSlug = TEMPLATE_SLUGS[params.template] || slugify(params.template);
    parts.push(templateSlug);
  }
  
  // Add destination
  if (params.destination) {
    const destSlug = DESTINATION_SLUGS[params.destination.toLowerCase()] || slugify(params.destination);
    parts.push(destSlug);
  }
  
  // Add date
  if (includeDate) {
    parts.push(new Date().toISOString().split('T')[0]);
  }
  
  // Join and limit length
  let filename = parts.join('-');
  if (filename.length > maxLength) {
    filename = filename.substring(0, maxLength);
  }
  
  // Add extension
  const extensions: Record<ExportFormat, string> = {
    xlsx: '.xlsx',
    xls: '.xls',
    csv: '.csv',
    pdf: '.pdf',
    xml: '.xml',
  };
  
  return sanitizeFilename(`${filename}${extensions[format] || `.${format}`}`);
}

/**
 * Generate filename based on module and entity data
 * This is a high-level function that delegates to specific generators
 */
export function generateDescriptiveFilename(
  module: ExportModule,
  entityData: Record<string, unknown> | Record<string, unknown>[],
  options: FilenameGeneratorOptions & {
    destination?: string;
    template?: string;
  }
): string {
  const { format, destination, template } = options;
  
  // Handle bulk exports (array of entities)
  if (Array.isArray(entityData)) {
    const firstEntity = entityData[0] as Record<string, unknown> | undefined;
    const area = firstEntity?.area || firstEntity?.address_city;
    
    return generateBulkFilename(
      {
        area: area as string | null,
        count: entityData.length,
        template,
      },
      { format }
    );
  }
  
  // Single entity export
  switch (module) {
    case 'mls':
      return generatePropertyFilename(
        {
          area: entityData.area as string | null,
          city: entityData.address_city as string | null,
          propertyType: entityData.property_type as string | null,
          sizeSqm: (entityData.square_feet || entityData.size_net_sqm) as number | null,
          bedrooms: entityData.bedrooms as number | null,
          destination,
          template,
        },
        { format }
      );
    
    case 'crm':
      return generateClientFilename(
        {
          clientName: entityData.client_name as string | null,
          clientType: entityData.client_type as string | null,
          destination,
          template,
        },
        { format }
      );
    
    default:
      // Fallback to default naming
      return sanitizeFilename(`${module}-export-${new Date().toISOString().split('T')[0]}.${format}`);
  }
}
