import type { 
  RawListing, 
  NormalizedListing, 
  PropertyType,
  TransactionType 
} from './types';

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
  platform: string,
  organizationId: string
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
    organization_id: organizationId,
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

function normalizePropertyType(
  type: string | undefined,
  platform: string
): PropertyType | null {
  if (!type) return null;
  
  const normalized = type.toLowerCase().trim();
  const platformMap = PROPERTY_TYPE_MAP[platform] || PROPERTY_TYPE_MAP.spitogatos;
  
  if (platformMap[normalized]) {
    return platformMap[normalized];
  }
  
  for (const [key, value] of Object.entries(platformMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return 'OTHER';
}

function normalizeTransactionType(type: string | undefined): TransactionType {
  if (!type) return 'sale';
  
  const normalized = type.toLowerCase().trim();
  
  if (TRANSACTION_TYPE_MAP[normalized]) {
    return TRANSACTION_TYPE_MAP[normalized];
  }
  
  const rentalKeywords = ['ενοικ', 'rent', 'μισθ'];
  for (const keyword of rentalKeywords) {
    if (normalized.includes(keyword)) {
      return 'rent';
    }
  }
  
  return 'sale';
}

function normalizeArea(area: string | undefined): string | null {
  if (!area) return null;
  
  const normalized = area.toLowerCase().trim();
  
  if (AREA_NORMALIZATION[normalized]) {
    return AREA_NORMALIZATION[normalized];
  }
  
  return area
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function normalizeText(text: string | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePostalCode(code: string | undefined): string | null {
  if (!code) return null;
  const cleaned = code.replace(/\D/g, '');
  if (cleaned.length === 5) {
    return cleaned;
  }
  return null;
}

function normalizeFloor(floor: string | undefined): string | null {
  if (!floor) return null;
  
  const normalized = floor.toLowerCase().trim();
  
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
  
  const match = normalized.match(/(\d+)/);
  if (match) {
    return match[1];
  }
  
  return floor.trim();
}

function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length >= 10) {
    return cleaned;
  }
  return null;
}

/**
 * Parse price from text (handles Greek number formats)
 */
export function parsePrice(text: string | null): number | null {
  if (!text) return null;
  
  const cleaned = text
    .replace(/[€$£]/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  
  const match = cleaned.match(/[\d.]+/);
  if (!match) return null;
  
  const price = parseFloat(match[0]);
  return isNaN(price) ? null : Math.round(price);
}

/**
 * Parse size in square meters from text
 */
export function parseSize(text: string | null): number | null {
  if (!text) return null;
  
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:τ\.?μ\.?|m²|sqm)?/i);
  if (!match) return null;
  
  const size = parseFloat(match[1].replace(',', '.'));
  return isNaN(size) ? null : Math.round(size);
}
