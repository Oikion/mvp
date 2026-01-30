/**
 * XE.gr Bulk Import Tool (BIT) API v1.4.1 Type Definitions
 *
 * These types define the structure of requests and responses for the
 * XE.gr Unified Ad Format used in property listing syndication.
 */

// ============================================
// ITEM TYPES
// ============================================

/**
 * XE property item types based on the Unified Ad Format
 */
export type XeItemType =
  | "re_residence" // Residential properties (apartments, houses, maisonettes)
  | "re_prof" // Professional/commercial properties
  | "re_land" // Land and plots
  | "re_parking" // Parking spaces
  | "re_misc"; // Other/miscellaneous

/**
 * XE transaction types
 */
export type XeTransactionType =
  | "SELL.NORMAL" // Regular sale
  | "SELL.EXCHANGE" // Property exchange
  | "SELL.AUCTION" // Auction sale
  | "SELL.GIFT" // Gift/donation
  | "SELL.ANTIPAROXI" // Antiparochi (exchange for construction)
  | "LET.NORMAL"; // Regular rental

/**
 * XE publication types affecting visibility and features
 */
export type XePublicationType = "BASIC" | "GOLD";

/**
 * XE sync policies for package submissions
 */
export type XePolicy = "RENEW_ALL_STOCK" | "INCREMENTAL";

// ============================================
// PACKAGE METADATA
// ============================================

/**
 * Package metadata for XE submissions
 */
export interface XePackageMetadata {
  xeAuthToken: string;
  schemaVersion: "1.1";
  id: string;
  timestamp: string; // ISO 8601 format
  storeId?: string;
  trademark?: string;
  skipAssets?: boolean;
  crmProviderCode?: string;
  policy: XePolicy;
}

// ============================================
// FIELD DEFINITIONS
// ============================================

/**
 * XE field definition for property attributes
 */
export interface XeField {
  Name: string;
  Value: string;
}

/**
 * XE asset definition for images and videos
 */
export interface XeAsset {
  "Asset.type": "IMAGE" | "VIDEO";
  "Asset.id": string;
  "Asset.fileType"?: "jpg" | "jpeg" | "png" | "bmp";
  "Asset.status"?: "ACTIVE" | "INACTIVE";
  "Asset.isPrimary": "0" | "1";
  "Asset.caption"?: string;
  "Asset.order": number;
  "Asset.uri": string;
  "Asset.properties"?: { key: string; value: string };
}

// ============================================
// ITEM DEFINITION
// ============================================

/**
 * XE item (property listing) structure
 */
export interface XeItem {
  "@type": XeItemType;
  "@refId": string;
  "@publicationType"?: XePublicationType;
  "Item.ownerId": string;
  "Item.majorPhone": string;
  "Item.departmentOnCategory"?: string;
  "Item.otherPhones"?: { "Item.phone": string[] };
  "Item.internetText"?: string;
  "Item.addOnText"?: string;
  "Item.bodyText"?: string;
  "Transaction.price"?: string;
  "Transaction.currency"?: "EUR";
  "Transaction.frequency"?: string;
  "Transaction.type": XeTransactionType;
  "Transaction.isOffer"?: "0" | "1";
  "Transaction.isPromo"?: "0" | "1";
  "Transaction.isNegotiable"?: "0" | "1";
  Field: XeField[];
  Asset?: XeAsset[];
}

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Add items request structure
 */
export interface XeAddItemsRequest {
  "Package.xeAuthToken": string;
  "Package.schemaVersion": "1.1";
  "Package.id": string;
  "Package.timestamp": string;
  "Package.storeId"?: string;
  "Package.trademark"?: string;
  "Package.skipAssets"?: string;
  "Package.crmProviderCode"?: string;
  "Package.policy": XePolicy;
  Item: XeItem[];
}

/**
 * Remove items request structure
 */
export interface XeRemoveItemsRequest {
  "Package.xeAuthToken": string;
  "Package.schemaVersion": "1.1";
  "Package.id": string;
  "Package.timestamp": string;
  "Package.storeId"?: string;
  "Package.trademark"?: string;
  Item: Pick<XeItem, "@type" | "@refId">[];
}

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * XE API response from package submission
 */
export interface XeApiResponse {
  success: boolean;
  packageId: string;
  message: string;
  statusCode?: number;
  headers?: Record<string, string>;
}

// ============================================
// FIELD NAME CONSTANTS
// ============================================

/**
 * Standard XE field names for the Unified Ad Format
 */
export const XE_FIELD_NAMES = {
  // Property characteristics
  AREA: "Item.area",
  CONSTRUCTION_YEAR: "Item.constructionYear",
  LEVEL: "Item.level",
  ENERGY_CLASS: "Item.energy_class",
  BEDROOMS: "Item.bedrooms",
  BATHROOMS: "Item.bathrooms",
  HAS_PARKING: "Item.hasParking",
  PARKING_TYPE: "Item.parkingType",
  FURNISHED: "Item.furnished",
  HEATING_TYPE: "Item.heatingType",
  CONDITION: "Item.condition",
  FLOORS_TOTAL: "Item.floorsTotal",
  ELEVATOR: "Item.elevator",
  PLOT_SIZE: "Item.plotSize",
  ORIENTATION: "Item.orientation",
  BALCONY: "Item.balcony",
  STORAGE: "Item.storage",
  GARDEN: "Item.garden",
  POOL: "Item.pool",
  VIEW: "Item.view",
  SECURITY: "Item.security",
  AIR_CONDITIONING: "Item.airConditioning",

  // Geographic fields
  GEO_STREET_NAME: "Geo.streetName",
  GEO_STREET_NUMBER: "Geo.streetNumber",
  GEO_POSTCODE: "Geo.postcode",
  GEO_AREA: "Geo.area",
  GEO_CITY: "Geo.city",
  GEO_MUNICIPALITY: "Geo.municipality",
  GEO_LONGITUDE: "Geo.longitude",
  GEO_LATITUDE: "Geo.latitude",
} as const;

/**
 * XE level codes for floor mapping
 */
export const XE_LEVEL_CODES = {
  BASEMENT_2: "SH", // Υπόγειο 2
  BASEMENT_1: "S1", // Υπόγειο 1
  GROUND: "L0", // Ισόγειο
  MEZZANINE: "M1", // Ημιόροφος
  FLOOR_1: "L1",
  FLOOR_2: "L2",
  FLOOR_3: "L3",
  FLOOR_4: "L4",
  FLOOR_5: "L5",
  FLOOR_6: "L6",
  FLOOR_7: "L7",
  FLOOR_8: "L8",
  FLOOR_9_PLUS: "L9", // 9+ floors
} as const;

/**
 * XE energy class values
 */
export const XE_ENERGY_CLASSES = {
  A_PLUS: "A+",
  A: "A",
  B_PLUS: "B+",
  B: "B",
  C: "C",
  D: "D",
  E: "E",
  F: "F",
  G: "G",
  H: "H",
  IN_PROGRESS: "IN_PROGRESS",
} as const;

/**
 * XE heating type values
 */
export const XE_HEATING_TYPES = {
  AUTONOMOUS: "AUTONOMOUS",
  CENTRAL: "CENTRAL",
  NATURAL_GAS: "NATURAL_GAS",
  HEAT_PUMP: "HEAT_PUMP",
  ELECTRIC: "ELECTRIC",
  NONE: "NONE",
  SOLAR: "SOLAR",
  GEOTHERMAL: "GEOTHERMAL",
} as const;

/**
 * XE furnished status values
 */
export const XE_FURNISHED_STATUS = {
  NO: "NO",
  PARTIALLY: "PARTIALLY",
  FULLY: "FULLY",
} as const;

/**
 * XE property condition values
 */
export const XE_CONDITION = {
  NEW: "NEW",
  EXCELLENT: "EXCELLENT",
  VERY_GOOD: "VERY_GOOD",
  GOOD: "GOOD",
  NEEDS_RENOVATION: "NEEDS_RENOVATION",
  UNDER_CONSTRUCTION: "UNDER_CONSTRUCTION",
} as const;

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Configuration for XE client initialization
 */
export interface XeClientConfig {
  username: string;
  password: string;
  authToken: string;
  baseUrl?: string;
  isSandbox?: boolean;
  trademark?: string;
  storeId?: string;
  crmProviderCode?: string;
}

/**
 * Options for building an XE package
 */
export interface XeBuildPackageOptions {
  policy: XePolicy;
  organizationId: string;
  trademark?: string;
  skipAssets?: boolean;
}

/**
 * Agent settings required for XE publishing
 */
export interface XeAgentPublishSettings {
  xeOwnerId: string;
  majorPhone: string;
  otherPhones?: string[];
  publicationType?: XePublicationType;
}

/**
 * Result of a sync operation
 */
export interface XeSyncResult {
  success: boolean;
  packageId: string;
  message: string;
  totalItems: number;
  errors?: Array<{
    propertyId: string;
    refId: string;
    error: string;
  }>;
}
