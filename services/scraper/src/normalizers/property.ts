import type { 
  RawListing, 
  NormalizedListing, 
  PropertyType,
  TransactionType 
} from '../types/index.js';

/**
 * Greek property type mappings for each platform
 */
const PROPERTY_TYPE_MAP: Record<string, Record<string, PropertyType>> = {
  spitogatos: {
    'διαμέρισμα': 'APARTMENT',
    'διαμερισμα': 'APARTMENT',
    'apartment': 'APARTMENT',
    'μονοκατοικία': 'HOUSE',
    'μονοκατοικια': 'HOUSE',
    'house': 'HOUSE',
    'μεζονέτα': 'MAISONETTE',
    'μεζονετα': 'MAISONETTE',
    'maisonette': 'MAISONETTE',
    'στούντιο': 'STUDIO',
    'στουντιο': 'STUDIO',
    'studio': 'STUDIO',
    'loft': 'LOFT',
    'ρετιρέ': 'PENTHOUSE',
    'ρετιρε': 'PENTHOUSE',
    'penthouse': 'PENTHOUSE',
    'βίλα': 'VILLA',
    'βιλα': 'VILLA',
    'villa': 'VILLA',
    'οικόπεδο': 'LAND',
    'οικοπεδο': 'LAND',
    'γη': 'LAND',
    'land': 'LAND',
    'επαγγελματικό': 'COMMERCIAL',
    'επαγγελματικο': 'COMMERCIAL',
    'κατάστημα': 'COMMERCIAL',
    'καταστημα': 'COMMERCIAL',
    'commercial': 'COMMERCIAL',
    'αποθήκη': 'WAREHOUSE',
    'αποθηκη': 'WAREHOUSE',
    'warehouse': 'WAREHOUSE',
    'parking': 'PARKING',
    'πάρκινγκ': 'PARKING',
    'παρκινγκ': 'PARKING',
    'θέση στάθμευσης': 'PARKING'
  },
  xe_gr: {
    // XE.gr uses similar Greek terms
    'διαμέρισμα': 'APARTMENT',
    'διαμερισμα': 'APARTMENT',
    'μονοκατοικία': 'HOUSE',
    'μονοκατοικια': 'HOUSE',
    'μεζονέτα': 'MAISONETTE',
    'μεζονετα': 'MAISONETTE',
    'στούντιο': 'STUDIO',
    'στουντιο': 'STUDIO',
    'loft': 'LOFT',
    'ρετιρέ': 'PENTHOUSE',
    'ρετιρε': 'PENTHOUSE',
    'βίλα': 'VILLA',
    'βιλα': 'VILLA',
    'οικόπεδο': 'LAND',
    'οικοπεδο': 'LAND',
    'επαγγελματικό': 'COMMERCIAL',
    'επαγγελματικο': 'COMMERCIAL',
    'αποθήκη': 'WAREHOUSE',
    'αποθηκη': 'WAREHOUSE',
    'parking': 'PARKING',
    'πάρκινγκ': 'PARKING',
    'παρκινγκ': 'PARKING'
  },
  tospitimou: {
    // Tospitimou similar mappings
    'διαμέρισμα': 'APARTMENT',
    'διαμερισμα': 'APARTMENT',
    'μονοκατοικία': 'HOUSE',
    'μονοκατοικια': 'HOUSE',
    'μεζονέτα': 'MAISONETTE',
    'μεζονετα': 'MAISONETTE',
    'στούντιο': 'STUDIO',
    'στουντιο': 'STUDIO',
    'loft': 'LOFT',
    'ρετιρέ': 'PENTHOUSE',
    'ρετιρε': 'PENTHOUSE',
    'βίλα': 'VILLA',
    'βιλα': 'VILLA',
    'οικόπεδο': 'LAND',
    'οικοπεδο': 'LAND',
    'επαγγελματικό': 'COMMERCIAL',
    'επαγγελματικο': 'COMMERCIAL',
    'αποθήκη': 'WAREHOUSE',
    'αποθηκη': 'WAREHOUSE',
    'parking': 'PARKING',
    'πάρκινγκ': 'PARKING',
    'παρκινγκ': 'PARKING'
  }
};

/**
 * Transaction type mappings
 */
const TRANSACTION_TYPE_MAP: Record<string, TransactionType> = {
  'πώληση': 'sale',
  'πωληση': 'sale',
  'sale': 'sale',
  'for sale': 'sale',
  'αγορά': 'sale',
  'αγορα': 'sale',
  'buy': 'sale',
  'ενοικίαση': 'rent',
  'ενοικιαση': 'rent',
  'rent': 'rent',
  'rental': 'rent',
  'for rent': 'rent',
  'to rent': 'rent',
  'ενοικιάζεται': 'rent',
  'ενοικιαζεται': 'rent'
};

/**
 * Common Greek area name normalization
 */
const AREA_NORMALIZATION: Record<string, string> = {
  'αθήνα': 'Αθήνα',
  'αθηνα': 'Αθήνα',
  'athens': 'Αθήνα',
  'θεσσαλονίκη': 'Θεσσαλονίκη',
  'θεσσαλονικη': 'Θεσσαλονίκη',
  'thessaloniki': 'Θεσσαλονίκη',
  'πειραιάς': 'Πειραιάς',
  'πειραιας': 'Πειραιάς',
  'piraeus': 'Πειραιάς',
  'κολωνάκι': 'Κολωνάκι',
  'κολωνακι': 'Κολωνάκι',
  'kolonaki': 'Κολωνάκι',
  'κηφισιά': 'Κηφισιά',
  'κηφισια': 'Κηφισιά',
  'kifisia': 'Κηφισιά',
  'γλυφάδα': 'Γλυφάδα',
  'γλυφαδα': 'Γλυφάδα',
  'glyfada': 'Γλυφάδα',
  'βούλα': 'Βούλα',
  'βουλα': 'Βούλα',
  'voula': 'Βούλα',
  'μαρούσι': 'Μαρούσι',
  'μαρουσι': 'Μαρούσι',
  'marousi': 'Μαρούσι'
};

/**
 * Normalize a raw listing from any platform into unified schema
 */
export function normalizeProperty(
  raw: RawListing,
  platform: string
): NormalizedListing {
  const propertyType = normalizePropertyType(raw.propertyType, platform);
  const transactionType = normalizeTransactionType(raw.transactionType);
  const area = normalizeArea(raw.area);
  const sizeSqm = raw.sizeSqm ?? null;
  const price = raw.price ?? null;
  
  // Calculate price per sqm if we have both values
  const pricePerSqm = (price && sizeSqm && sizeSqm > 0)
    ? Math.round(price / sizeSqm)
    : null;

  return {
    source_platform: platform,
    source_listing_id: raw.sourceListingId,
    source_url: raw.sourceUrl,
    title: normalizeText(raw.title),
    price,
    price_per_sqm: pricePerSqm,
    property_type: propertyType,
    transaction_type: transactionType,
    address: normalizeText(raw.address),
    area,
    municipality: normalizeText(raw.municipality),
    postal_code: normalizePostalCode(raw.postalCode),
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    size_sqm: sizeSqm,
    bedrooms: raw.bedrooms ?? null,
    bathrooms: raw.bathrooms ?? null,
    floor: normalizeFloor(raw.floor),
    year_built: raw.yearBuilt ?? null,
    agency_name: normalizeText(raw.agencyName),
    agency_phone: normalizePhone(raw.agencyPhone),
    images: raw.images ?? [],
    listing_date: raw.listingDate ?? null,
    raw_data: raw.rawData ?? {}
  };
}

/**
 * Normalize property type using platform-specific mappings
 */
function normalizePropertyType(
  type: string | undefined,
  platform: string
): PropertyType | null {
  if (!type) return null;
  
  const normalized = type.toLowerCase().trim();
  const platformMap = PROPERTY_TYPE_MAP[platform] || PROPERTY_TYPE_MAP.spitogatos;
  
  // Try exact match first
  if (platformMap[normalized]) {
    return platformMap[normalized];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(platformMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return 'OTHER';
}

/**
 * Normalize transaction type
 */
function normalizeTransactionType(type: string | undefined): TransactionType {
  if (!type) return 'sale'; // Default to sale
  
  const normalized = type.toLowerCase().trim();
  
  // Check direct mapping
  if (TRANSACTION_TYPE_MAP[normalized]) {
    return TRANSACTION_TYPE_MAP[normalized];
  }
  
  // Check if it contains rental keywords
  const rentalKeywords = ['ενοικ', 'rent', 'μισθ'];
  for (const keyword of rentalKeywords) {
    if (normalized.includes(keyword)) {
      return 'rent';
    }
  }
  
  return 'sale';
}

/**
 * Normalize area name
 */
function normalizeArea(area: string | undefined): string | null {
  if (!area) return null;
  
  const normalized = area.toLowerCase().trim();
  
  if (AREA_NORMALIZATION[normalized]) {
    return AREA_NORMALIZATION[normalized];
  }
  
  // Title case the original
  return area
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalize text - trim and handle empty strings
 */
function normalizeText(text: string | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normalize Greek postal code
 */
function normalizePostalCode(code: string | undefined): string | null {
  if (!code) return null;
  
  // Remove spaces and non-digits
  const cleaned = code.replace(/\D/g, '');
  
  // Greek postal codes are 5 digits
  if (cleaned.length === 5) {
    return cleaned;
  }
  
  return null;
}

/**
 * Normalize floor string
 */
function normalizeFloor(floor: string | undefined): string | null {
  if (!floor) return null;
  
  const normalized = floor.toLowerCase().trim();
  
  // Common floor mappings
  const floorMap: Record<string, string> = {
    'ισόγειο': '0',
    'ισογειο': '0',
    'ground': '0',
    'υπόγειο': '-1',
    'υπογειο': '-1',
    'basement': '-1',
    'ημιυπόγειο': '-0.5',
    'ημιυπογειο': '-0.5',
    'ημιισόγειο': '0.5',
    'ημιισογειο': '0.5',
    '1ος': '1',
    '2ος': '2',
    '3ος': '3',
    '4ος': '4',
    '5ος': '5',
    '6ος': '6',
    '7ος': '7',
    '8ος': '8',
    '9ος': '9',
    '10ος': '10'
  };
  
  if (floorMap[normalized]) {
    return floorMap[normalized];
  }
  
  // Try to extract number
  const match = normalized.match(/(\d+)/);
  if (match) {
    return match[1];
  }
  
  return floor.trim();
}

/**
 * Normalize phone number
 */
function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  
  // Remove everything except digits and plus sign
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Validate it looks like a phone number
  if (cleaned.length >= 10) {
    return cleaned;
  }
  
  return null;
}

/**
 * Calculate price per square meter
 */
export function calculatePricePerSqm(price: number, sizeSqm: number): number | null {
  if (!price || !sizeSqm || sizeSqm <= 0) return null;
  return Math.round(price / sizeSqm);
}

/**
 * Extract Greek postal code from address
 */
export function extractPostalCode(address: string): string | null {
  // Match 5-digit Greek postal codes (usually starts with 1-8)
  const match = address.match(/\b([1-8]\d{4})\b/);
  return match ? match[1] : null;
}

/**
 * Clean HTML tags from text
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
