/**
 * Enum Value Normalizer for Import
 * 
 * Maps common variations, translations (Greek/English), and case variations
 * to the correct enum values expected by the schema.
 */

type EnumMapping = Record<string, string>;

/**
 * Property Type mappings
 */
export const propertyTypeMap: EnumMapping = {
  // English variations
  "residential": "RESIDENTIAL",
  "commercial": "COMMERCIAL",
  "land": "LAND",
  "rental": "RENTAL",
  "vacation": "VACATION",
  "apartment": "APARTMENT",
  "flat": "APARTMENT",
  "house": "HOUSE",
  "home": "HOUSE",
  "villa": "HOUSE",
  "maisonette": "MAISONETTE",
  "townhouse": "MAISONETTE",
  "warehouse": "WAREHOUSE",
  "storage": "WAREHOUSE",
  "parking": "PARKING",
  "garage": "PARKING",
  "plot": "PLOT",
  "farm": "FARM",
  "industrial": "INDUSTRIAL",
  "factory": "INDUSTRIAL",
  "other": "OTHER",
  // Greek translations
  "κατοικία": "RESIDENTIAL",
  "επαγγελματικό": "COMMERCIAL",
  "επαγγελματικός χώρος": "COMMERCIAL",
  "γη": "LAND",
  "οικόπεδο": "PLOT",
  "ενοικίαση": "RENTAL",
  "διακοπές": "VACATION",
  "διαμέρισμα": "APARTMENT",
  "σπίτι": "HOUSE",
  "μονοκατοικία": "HOUSE",
  "μεζονέτα": "MAISONETTE",
  "αποθήκη": "WAREHOUSE",
  "πάρκινγκ": "PARKING",
  "χώρος στάθμευσης": "PARKING",
  "αγρόκτημα": "FARM",
  "βιομηχανικό": "INDUSTRIAL",
  "βιομηχανικός χώρος": "INDUSTRIAL",
  "άλλο": "OTHER",
};

/**
 * Property Status mappings
 */
export const propertyStatusMap: EnumMapping = {
  // English variations
  "active": "ACTIVE",
  "available": "ACTIVE",
  "pending": "PENDING",
  "under contract": "PENDING",
  "sold": "SOLD",
  "off market": "OFF_MARKET",
  "off_market": "OFF_MARKET",
  "offmarket": "OFF_MARKET",
  "withdrawn": "WITHDRAWN",
  "cancelled": "WITHDRAWN",
  // Greek translations
  "ενεργό": "ACTIVE",
  "διαθέσιμο": "ACTIVE",
  "σε εκκρεμότητα": "PENDING",
  "πουλήθηκε": "SOLD",
  "εκτός αγοράς": "OFF_MARKET",
  "αποσύρθηκε": "WITHDRAWN",
};

/**
 * Transaction Type mappings
 */
export const transactionTypeMap: EnumMapping = {
  // English variations
  "sale": "SALE",
  "sell": "SALE",
  "for sale": "SALE",
  "rental": "RENTAL",
  "rent": "RENTAL",
  "for rent": "RENTAL",
  "lease": "RENTAL",
  "short term": "SHORT_TERM",
  "short_term": "SHORT_TERM",
  "shortterm": "SHORT_TERM",
  "airbnb": "SHORT_TERM",
  "exchange": "EXCHANGE",
  "swap": "EXCHANGE",
  // Greek translations
  "πώληση": "SALE",
  "προς πώληση": "SALE",
  "ενοικίαση": "RENTAL",
  "προς ενοικίαση": "RENTAL",
  "μίσθωση": "RENTAL",
  "βραχυπρόθεσμη": "SHORT_TERM",
  "βραχυχρόνια": "SHORT_TERM",
  "ανταλλαγή": "EXCHANGE",
};

/**
 * Heating Type mappings
 */
export const heatingTypeMap: EnumMapping = {
  // English variations
  "autonomous": "AUTONOMOUS",
  "individual": "AUTONOMOUS",
  "independent": "AUTONOMOUS",
  "central": "CENTRAL",
  "central heating": "CENTRAL",
  "natural gas": "NATURAL_GAS",
  "natural_gas": "NATURAL_GAS",
  "gas": "NATURAL_GAS",
  "heat pump": "HEAT_PUMP",
  "heat_pump": "HEAT_PUMP",
  "heatpump": "HEAT_PUMP",
  "electric": "ELECTRIC",
  "electrical": "ELECTRIC",
  "none": "NONE",
  "no heating": "NONE",
  "no": "NONE",
  // Greek translations
  "αυτόνομη": "AUTONOMOUS",
  "αυτόνομο": "AUTONOMOUS",
  "αυτόνομη θέρμανση": "AUTONOMOUS",
  "κεντρική": "CENTRAL",
  "κεντρικό": "CENTRAL",
  "κεντρική θέρμανση": "CENTRAL",
  "φυσικό αέριο": "NATURAL_GAS",
  "αέριο": "NATURAL_GAS",
  "αντλία θερμότητας": "HEAT_PUMP",
  "ηλεκτρική": "ELECTRIC",
  "ηλεκτρικό": "ELECTRIC",
  "χωρίς": "NONE",
  "καμία": "NONE",
  "δεν υπάρχει": "NONE",
};

/**
 * Energy Certificate Class mappings
 */
export const energyCertClassMap: EnumMapping = {
  // Standard variations
  "a+": "A_PLUS",
  "a plus": "A_PLUS",
  "a_plus": "A_PLUS",
  "aplus": "A_PLUS",
  "α+": "A_PLUS",
  "a": "A",
  "α": "A",
  "b": "B",
  "β": "B",
  "c": "C",
  "γ": "C",
  "d": "D",
  "δ": "D",
  "e": "E",
  "ε": "E",
  "f": "F",
  "ζ": "F",
  "g": "G",
  "η": "G",
  "h": "H",
  "θ": "H",
  "in progress": "IN_PROGRESS",
  "in_progress": "IN_PROGRESS",
  "pending": "IN_PROGRESS",
  // Greek translations
  "σε εξέλιξη": "IN_PROGRESS",
  "εκκρεμεί": "IN_PROGRESS",
};

/**
 * Property Condition mappings
 */
export const propertyConditionMap: EnumMapping = {
  // English variations
  "excellent": "EXCELLENT",
  "perfect": "EXCELLENT",
  "like new": "EXCELLENT",
  "very good": "VERY_GOOD",
  "very_good": "VERY_GOOD",
  "verygood": "VERY_GOOD",
  "great": "VERY_GOOD",
  "good": "GOOD",
  "fair": "GOOD",
  "average": "GOOD",
  "needs renovation": "NEEDS_RENOVATION",
  "needs_renovation": "NEEDS_RENOVATION",
  "needsrenovation": "NEEDS_RENOVATION",
  "renovation needed": "NEEDS_RENOVATION",
  "to renovate": "NEEDS_RENOVATION",
  "fixer upper": "NEEDS_RENOVATION",
  // Greek translations
  "άριστη": "EXCELLENT",
  "άριστο": "EXCELLENT",
  "εξαιρετική": "EXCELLENT",
  "πολύ καλή": "VERY_GOOD",
  "πολύ καλό": "VERY_GOOD",
  "καλή": "GOOD",
  "καλό": "GOOD",
  "χρειάζεται ανακαίνιση": "NEEDS_RENOVATION",
  "προς ανακαίνιση": "NEEDS_RENOVATION",
  "ανακαίνιση": "NEEDS_RENOVATION",
};

/**
 * Furnished Status mappings
 */
export const furnishedStatusMap: EnumMapping = {
  // English variations
  "no": "NO",
  "unfurnished": "NO",
  "not furnished": "NO",
  "none": "NO",
  "false": "NO",
  "0": "NO",
  "partially": "PARTIALLY",
  "partial": "PARTIALLY",
  "semi-furnished": "PARTIALLY",
  "semi furnished": "PARTIALLY",
  "some": "PARTIALLY",
  "fully": "FULLY",
  "full": "FULLY",
  "furnished": "FULLY",
  "yes": "FULLY",
  "true": "FULLY",
  "1": "FULLY",
  // Greek translations
  "όχι": "NO",
  "χωρίς έπιπλα": "NO",
  "αεπίπλωτο": "NO",
  "μερικώς": "PARTIALLY",
  "μερικά": "PARTIALLY",
  "ημιεπιπλωμένο": "PARTIALLY",
  "πλήρως": "FULLY",
  "επιπλωμένο": "FULLY",
  "ναι": "FULLY",
  "πλήρες": "FULLY",
};

/**
 * Price Type mappings
 */
export const priceTypeMap: EnumMapping = {
  // English variations
  "rental": "RENTAL",
  "rent": "RENTAL",
  "monthly": "RENTAL",
  "sale": "SALE",
  "sell": "SALE",
  "purchase": "SALE",
  "per acre": "PER_ACRE",
  "per_acre": "PER_ACRE",
  "peracre": "PER_ACRE",
  "per sqm": "PER_SQM",
  "per_sqm": "PER_SQM",
  "persqm": "PER_SQM",
  "per square meter": "PER_SQM",
  "per m2": "PER_SQM",
  // Greek translations
  "ενοικίαση": "RENTAL",
  "μηνιαίο": "RENTAL",
  "πώληση": "SALE",
  "ανά στρέμμα": "PER_ACRE",
  "ανά τ.μ.": "PER_SQM",
  "ανά τετραγωνικό": "PER_SQM",
};

/**
 * Portal Visibility mappings
 */
export const portalVisibilityMap: EnumMapping = {
  // English variations
  "private": "PRIVATE",
  "hidden": "PRIVATE",
  "internal": "PRIVATE",
  "selected": "SELECTED",
  "limited": "SELECTED",
  "some": "SELECTED",
  "public": "PUBLIC",
  "visible": "PUBLIC",
  "all": "PUBLIC",
  // Greek translations
  "ιδιωτικό": "PRIVATE",
  "κρυφό": "PRIVATE",
  "επιλεγμένο": "SELECTED",
  "δημόσιο": "PUBLIC",
  "ορατό": "PUBLIC",
};

/**
 * Address Privacy Level mappings
 */
export const addressPrivacyLevelMap: EnumMapping = {
  // English variations
  "exact": "EXACT",
  "full": "EXACT",
  "complete": "EXACT",
  "partial": "PARTIAL",
  "approximate": "PARTIAL",
  "area only": "PARTIAL",
  "hidden": "HIDDEN",
  "none": "HIDDEN",
  "private": "HIDDEN",
  // Greek translations
  "ακριβής": "EXACT",
  "πλήρης": "EXACT",
  "μερική": "PARTIAL",
  "κατά προσέγγιση": "PARTIAL",
  "κρυφή": "HIDDEN",
  "απόκρυψη": "HIDDEN",
};

/**
 * Legalization Status mappings
 */
export const legalizationStatusMap: EnumMapping = {
  // English variations
  "legalized": "LEGALIZED",
  "legal": "LEGALIZED",
  "compliant": "LEGALIZED",
  "in progress": "IN_PROGRESS",
  "in_progress": "IN_PROGRESS",
  "pending": "IN_PROGRESS",
  "processing": "IN_PROGRESS",
  "undeclared": "UNDECLARED",
  "not declared": "UNDECLARED",
  "illegal": "UNDECLARED",
  // Greek translations
  "τακτοποιημένο": "LEGALIZED",
  "νόμιμο": "LEGALIZED",
  "σε εξέλιξη": "IN_PROGRESS",
  "σε διαδικασία": "IN_PROGRESS",
  "αδήλωτο": "UNDECLARED",
  "μη δηλωμένο": "UNDECLARED",
};

/**
 * Client Type mappings
 */
export const clientTypeMap: EnumMapping = {
  // English variations
  "buyer": "BUYER",
  "purchaser": "BUYER",
  "seller": "SELLER",
  "vendor": "SELLER",
  "owner": "SELLER",
  "renter": "RENTER",
  "tenant": "RENTER",
  "lessee": "RENTER",
  "investor": "INVESTOR",
  "referral partner": "REFERRAL_PARTNER",
  "referral_partner": "REFERRAL_PARTNER",
  "partner": "REFERRAL_PARTNER",
  "agent": "REFERRAL_PARTNER",
  // Greek translations
  "αγοραστής": "BUYER",
  "πωλητής": "SELLER",
  "ιδιοκτήτης": "SELLER",
  "ενοικιαστής": "RENTER",
  "μισθωτής": "RENTER",
  "επενδυτής": "INVESTOR",
  "συνεργάτης": "REFERRAL_PARTNER",
};

/**
 * Client Status mappings
 */
export const clientStatusMap: EnumMapping = {
  // English variations
  "lead": "LEAD",
  "prospect": "LEAD",
  "new": "LEAD",
  "active": "ACTIVE",
  "current": "ACTIVE",
  "inactive": "INACTIVE",
  "dormant": "INACTIVE",
  "converted": "CONVERTED",
  "closed": "CONVERTED",
  "won": "CONVERTED",
  "lost": "LOST",
  "dead": "LOST",
  // Greek translations
  "νέος": "LEAD",
  "ενεργός": "ACTIVE",
  "ανενεργός": "INACTIVE",
  "μετατράπηκε": "CONVERTED",
  "ολοκληρώθηκε": "CONVERTED",
  "χαμένος": "LOST",
};

/**
 * Person Type mappings
 */
export const personTypeMap: EnumMapping = {
  // English variations
  "individual": "INDIVIDUAL",
  "person": "INDIVIDUAL",
  "private": "INDIVIDUAL",
  "company": "COMPANY",
  "business": "COMPANY",
  "corporate": "COMPANY",
  "organization": "COMPANY",
  "investor": "INVESTOR",
  "broker": "BROKER",
  "agent": "BROKER",
  // Greek translations
  "ιδιώτης": "INDIVIDUAL",
  "φυσικό πρόσωπο": "INDIVIDUAL",
  "εταιρεία": "COMPANY",
  "επιχείρηση": "COMPANY",
  "νομικό πρόσωπο": "COMPANY",
  "επενδυτής": "INVESTOR",
  "μεσίτης": "BROKER",
};

/**
 * Client Intent mappings
 */
export const clientIntentMap: EnumMapping = {
  // English variations
  "buy": "BUY",
  "purchase": "BUY",
  "buying": "BUY",
  "rent": "RENT",
  "renting": "RENT",
  "lease": "LEASE",
  "leasing": "LEASE",
  "sell": "SELL",
  "selling": "SELL",
  "invest": "INVEST",
  "investment": "INVEST",
  "investing": "INVEST",
  // Greek translations
  "αγορά": "BUY",
  "ενοικίαση": "RENT",
  "μίσθωση": "LEASE",
  "πώληση": "SELL",
  "επένδυση": "INVEST",
};

/**
 * Property Purpose mappings
 */
export const propertyPurposeMap: EnumMapping = {
  // English variations
  "residential": "RESIDENTIAL",
  "home": "RESIDENTIAL",
  "living": "RESIDENTIAL",
  "commercial": "COMMERCIAL",
  "business": "COMMERCIAL",
  "office": "COMMERCIAL",
  "land": "LAND",
  "plot": "LAND",
  "parking": "PARKING",
  "garage": "PARKING",
  "other": "OTHER",
  // Greek translations
  "κατοικία": "RESIDENTIAL",
  "επαγγελματικό": "COMMERCIAL",
  "γη": "LAND",
  "οικόπεδο": "LAND",
  "πάρκινγκ": "PARKING",
  "άλλο": "OTHER",
};

/**
 * Timeline mappings
 */
export const timelineMap: EnumMapping = {
  // English variations
  "immediate": "IMMEDIATE",
  "now": "IMMEDIATE",
  "asap": "IMMEDIATE",
  "urgent": "IMMEDIATE",
  "1-3 months": "ONE_THREE_MONTHS",
  "one_three_months": "ONE_THREE_MONTHS",
  "1-3": "ONE_THREE_MONTHS",
  "3-6 months": "THREE_SIX_MONTHS",
  "three_six_months": "THREE_SIX_MONTHS",
  "3-6": "THREE_SIX_MONTHS",
  "6+ months": "SIX_PLUS_MONTHS",
  "six_plus_months": "SIX_PLUS_MONTHS",
  "6+": "SIX_PLUS_MONTHS",
  "later": "SIX_PLUS_MONTHS",
  // Greek translations
  "άμεσα": "IMMEDIATE",
  "τώρα": "IMMEDIATE",
  "1-3 μήνες": "ONE_THREE_MONTHS",
  "3-6 μήνες": "THREE_SIX_MONTHS",
  "6+ μήνες": "SIX_PLUS_MONTHS",
  "αργότερα": "SIX_PLUS_MONTHS",
};

/**
 * Financing Type mappings
 */
export const financingTypeMap: EnumMapping = {
  // English variations
  "cash": "CASH",
  "all cash": "CASH",
  "mortgage": "MORTGAGE",
  "loan": "MORTGAGE",
  "bank loan": "MORTGAGE",
  "financing": "MORTGAGE",
  "preapproval pending": "PREAPPROVAL_PENDING",
  "preapproval_pending": "PREAPPROVAL_PENDING",
  "pending": "PREAPPROVAL_PENDING",
  "pre-approval": "PREAPPROVAL_PENDING",
  // Greek translations
  "μετρητά": "CASH",
  "στεγαστικό": "MORTGAGE",
  "δάνειο": "MORTGAGE",
  "στεγαστικό δάνειο": "MORTGAGE",
  "εκκρεμεί προέγκριση": "PREAPPROVAL_PENDING",
};

/**
 * Lead Source mappings
 */
export const leadSourceMap: EnumMapping = {
  // English variations
  "referral": "REFERRAL",
  "referred": "REFERRAL",
  "word of mouth": "REFERRAL",
  "web": "WEB",
  "website": "WEB",
  "online": "WEB",
  "internet": "WEB",
  "portal": "PORTAL",
  "listing site": "PORTAL",
  "walk in": "WALK_IN",
  "walk_in": "WALK_IN",
  "walkin": "WALK_IN",
  "office": "WALK_IN",
  "social": "SOCIAL",
  "social media": "SOCIAL",
  "facebook": "SOCIAL",
  "instagram": "SOCIAL",
  // Greek translations
  "σύσταση": "REFERRAL",
  "ιστοσελίδα": "WEB",
  "διαδίκτυο": "WEB",
  "πύλη": "PORTAL",
  "επίσκεψη": "WALK_IN",
  "γραφείο": "WALK_IN",
  "κοινωνικά δίκτυα": "SOCIAL",
  "κοινωνικά μέσα": "SOCIAL",
};

/**
 * Normalize an enum value using the provided mapping
 * Returns the normalized value or the original if no match found
 */
export function normalizeEnumValue(
  value: unknown,
  mapping: EnumMapping
): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  
  // Convert to string safely
  const valueStr = typeof value === "object" ? JSON.stringify(value) : String(value);
  const strValue = valueStr.toLowerCase().trim();
  
  // Check if it's already a valid enum value (uppercase)
  const upperValue = valueStr.toUpperCase().trim();
  const validEnumValues = new Set(Object.values(mapping));
  if (validEnumValues.has(upperValue)) {
    return upperValue;
  }
  
  // Look up in mapping
  return mapping[strValue] || null;
}

/**
 * All property enum mappings
 */
export const propertyEnumMappings = {
  property_type: propertyTypeMap,
  property_status: propertyStatusMap,
  transaction_type: transactionTypeMap,
  heating_type: heatingTypeMap,
  energy_cert_class: energyCertClassMap,
  condition: propertyConditionMap,
  furnished: furnishedStatusMap,
  price_type: priceTypeMap,
  portal_visibility: portalVisibilityMap,
  address_privacy_level: addressPrivacyLevelMap,
  legalization_status: legalizationStatusMap,
};

/**
 * All client enum mappings
 */
export const clientEnumMappings = {
  client_type: clientTypeMap,
  client_status: clientStatusMap,
  person_type: personTypeMap,
  intent: clientIntentMap,
  purpose: propertyPurposeMap,
  timeline: timelineMap,
  financing_type: financingTypeMap,
  lead_source: leadSourceMap,
};

/**
 * Normalize all enum fields in a property import row
 */
export function normalizePropertyEnums(
  row: Record<string, unknown>
): Record<string, unknown> {
  const normalized = { ...row };
  
  for (const [field, mapping] of Object.entries(propertyEnumMappings)) {
    if (normalized[field] !== undefined && normalized[field] !== null && normalized[field] !== "") {
      const normalizedValue = normalizeEnumValue(normalized[field], mapping);
      normalized[field] = normalizedValue;
    }
  }
  
  return normalized;
}

/**
 * Normalize all enum fields in a client import row
 */
export function normalizeClientEnums(
  row: Record<string, unknown>
): Record<string, unknown> {
  const normalized = { ...row };
  
  for (const [field, mapping] of Object.entries(clientEnumMappings)) {
    if (normalized[field] !== undefined && normalized[field] !== null && normalized[field] !== "") {
      const normalizedValue = normalizeEnumValue(normalized[field], mapping);
      normalized[field] = normalizedValue;
    }
  }
  
  return normalized;
}



