/**
 * Property to XE.gr Mapper
 *
 * Maps Oikion property data to XE.gr Unified Ad Format (BIT API v1.4.1)
 */

import type { Properties } from "@prisma/client";
import type {
  XeItem,
  XeItemType,
  XeTransactionType,
  XeField,
  XeAsset,
  XeAgentPublishSettings,
  XePublicationType,
} from "@/types/xe-api";
import {
  XE_FIELD_NAMES,
  XE_LEVEL_CODES,
  XE_ENERGY_CLASSES,
  XE_HEATING_TYPES,
  XE_FURNISHED_STATUS,
  XE_CONDITION,
} from "@/types/xe-api";

// ============================================
// TYPE MAPPINGS
// ============================================

/**
 * Map Oikion PropertyType to XE ItemType
 */
const PROPERTY_TYPE_TO_XE: Record<string, XeItemType> = {
  APARTMENT: "re_residence",
  HOUSE: "re_residence",
  MAISONETTE: "re_residence",
  RESIDENTIAL: "re_residence",
  VACATION: "re_residence",
  RENTAL: "re_residence",
  COMMERCIAL: "re_prof",
  WAREHOUSE: "re_prof",
  INDUSTRIAL: "re_prof",
  LAND: "re_land",
  PLOT: "re_land",
  FARM: "re_land",
  PARKING: "re_parking",
  OTHER: "re_misc",
};

/**
 * Map Oikion TransactionType to XE TransactionType
 */
const TRANSACTION_TYPE_TO_XE: Record<string, XeTransactionType> = {
  SALE: "SELL.NORMAL",
  RENTAL: "LET.NORMAL",
  SHORT_TERM: "LET.NORMAL",
  EXCHANGE: "SELL.EXCHANGE",
};

/**
 * Map Oikion EnergyCertClass to XE energy class
 */
const ENERGY_CLASS_TO_XE: Record<string, string> = {
  A_PLUS: XE_ENERGY_CLASSES.A_PLUS,
  A: XE_ENERGY_CLASSES.A,
  B: XE_ENERGY_CLASSES.B,
  C: XE_ENERGY_CLASSES.C,
  D: XE_ENERGY_CLASSES.D,
  E: XE_ENERGY_CLASSES.E,
  F: XE_ENERGY_CLASSES.F,
  G: XE_ENERGY_CLASSES.G,
  H: XE_ENERGY_CLASSES.H,
  IN_PROGRESS: XE_ENERGY_CLASSES.IN_PROGRESS,
};

/**
 * Map Oikion HeatingType to XE heating type
 */
const HEATING_TYPE_TO_XE: Record<string, string> = {
  AUTONOMOUS: XE_HEATING_TYPES.AUTONOMOUS,
  CENTRAL: XE_HEATING_TYPES.CENTRAL,
  NATURAL_GAS: XE_HEATING_TYPES.NATURAL_GAS,
  HEAT_PUMP: XE_HEATING_TYPES.HEAT_PUMP,
  ELECTRIC: XE_HEATING_TYPES.ELECTRIC,
  NONE: XE_HEATING_TYPES.NONE,
};

/**
 * Map Oikion FurnishedStatus to XE furnished status
 */
const FURNISHED_TO_XE: Record<string, string> = {
  NO: XE_FURNISHED_STATUS.NO,
  PARTIALLY: XE_FURNISHED_STATUS.PARTIALLY,
  FULLY: XE_FURNISHED_STATUS.FULLY,
};

/**
 * Map Oikion PropertyCondition to XE condition
 */
const CONDITION_TO_XE: Record<string, string> = {
  EXCELLENT: XE_CONDITION.EXCELLENT,
  VERY_GOOD: XE_CONDITION.VERY_GOOD,
  GOOD: XE_CONDITION.GOOD,
  NEEDS_RENOVATION: XE_CONDITION.NEEDS_RENOVATION,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map floor value to XE level code
 */
export function mapFloorToXeLevel(floor: string | null | undefined): string {
  if (!floor) return XE_LEVEL_CODES.GROUND;

  const floorStr = floor.toString().toLowerCase().trim();

  // Handle text values
  if (floorStr === "ground" || floorStr === "ισόγειο") {
    return XE_LEVEL_CODES.GROUND;
  }
  if (floorStr === "basement" || floorStr === "υπόγειο") {
    return XE_LEVEL_CODES.BASEMENT_1;
  }
  if (floorStr === "mezzanine" || floorStr === "ημιόροφος") {
    return XE_LEVEL_CODES.MEZZANINE;
  }

  // Handle numeric values
  const floorNum = parseInt(floorStr, 10);
  if (isNaN(floorNum)) return XE_LEVEL_CODES.GROUND;

  if (floorNum <= -2) return XE_LEVEL_CODES.BASEMENT_2;
  if (floorNum === -1) return XE_LEVEL_CODES.BASEMENT_1;
  if (floorNum === 0) return XE_LEVEL_CODES.GROUND;
  if (floorNum === 1) return XE_LEVEL_CODES.FLOOR_1;
  if (floorNum === 2) return XE_LEVEL_CODES.FLOOR_2;
  if (floorNum === 3) return XE_LEVEL_CODES.FLOOR_3;
  if (floorNum === 4) return XE_LEVEL_CODES.FLOOR_4;
  if (floorNum === 5) return XE_LEVEL_CODES.FLOOR_5;
  if (floorNum === 6) return XE_LEVEL_CODES.FLOOR_6;
  if (floorNum === 7) return XE_LEVEL_CODES.FLOOR_7;
  if (floorNum === 8) return XE_LEVEL_CODES.FLOOR_8;
  return XE_LEVEL_CODES.FLOOR_9_PLUS;
}

/**
 * Extract images from property (stored as JSON or array field)
 */
function extractPropertyImages(property: Properties): string[] {
  // Images might be stored in different fields depending on the property structure
  // Check common patterns used in the codebase
  const possibleImageFields = [
    "images",
    "photos",
    "gallery",
    "property_images",
  ];

  for (const field of possibleImageFields) {
    const value = (property as Record<string, unknown>)[field];
    if (Array.isArray(value) && value.length > 0) {
      return value.filter((url): url is string => typeof url === "string");
    }
  }

  return [];
}

/**
 * Clean and format phone number for XE
 */
export function formatPhoneForXe(phone: string): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Ensure Greek prefix if no country code
  if (!cleaned.startsWith("+") && !cleaned.startsWith("00")) {
    return "+30" + cleaned;
  }

  return cleaned;
}

/**
 * Generate a unique reference ID for the property
 */
export function generateXeRefId(
  propertyId: string,
  organizationId: string
): string {
  // Use existing xeRefId if available, otherwise create a new one
  const timestamp = Date.now().toString(36);
  return `OIKION-${organizationId.slice(0, 8)}-${propertyId.slice(0, 8)}-${timestamp}`.toUpperCase();
}

/**
 * Sanitize text for XML output
 */
function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

// ============================================
// MAIN MAPPER
// ============================================

/**
 * Extended property type with optional computed fields
 */
export type PropertyWithExtras = Properties & {
  images?: string[];
  latitude?: number;
  longitude?: number;
  coordinates?: { lat: number; lng: number };
};

/**
 * Map a single Oikion property to XE Item format
 */
export function mapPropertyToXeItem(
  property: PropertyWithExtras,
  agentSettings: XeAgentPublishSettings
): XeItem {
  const fields: XeField[] = [];

  // ============================================
  // PROPERTY CHARACTERISTICS
  // ============================================

  // Area/Size (required)
  const area =
    property.square_feet ||
    (property.size_net_sqm ? Number(property.size_net_sqm) : null);
  if (area) {
    fields.push({ Name: XE_FIELD_NAMES.AREA, Value: area.toString() });
  }

  // Construction year
  if (property.year_built) {
    fields.push({
      Name: XE_FIELD_NAMES.CONSTRUCTION_YEAR,
      Value: property.year_built.toString(),
    });
  }

  // Floor level
  if (property.floor) {
    fields.push({
      Name: XE_FIELD_NAMES.LEVEL,
      Value: mapFloorToXeLevel(property.floor),
    });
  }

  // Energy class
  if (property.energy_cert_class) {
    const xeEnergy = ENERGY_CLASS_TO_XE[property.energy_cert_class];
    if (xeEnergy) {
      fields.push({ Name: XE_FIELD_NAMES.ENERGY_CLASS, Value: xeEnergy });
    }
  }

  // Bedrooms
  if (property.bedrooms !== null && property.bedrooms !== undefined) {
    fields.push({
      Name: XE_FIELD_NAMES.BEDROOMS,
      Value: property.bedrooms.toString(),
    });
  }

  // Bathrooms
  if (property.bathrooms !== null && property.bathrooms !== undefined) {
    fields.push({
      Name: XE_FIELD_NAMES.BATHROOMS,
      Value: Math.floor(property.bathrooms).toString(),
    });
  }

  // Total floors
  if (property.floors_total) {
    fields.push({
      Name: XE_FIELD_NAMES.FLOORS_TOTAL,
      Value: property.floors_total.toString(),
    });
  }

  // Elevator
  if (property.elevator !== null && property.elevator !== undefined) {
    fields.push({
      Name: XE_FIELD_NAMES.ELEVATOR,
      Value: property.elevator ? "1" : "0",
    });
  }

  // Heating type
  if (property.heating_type) {
    const xeHeating = HEATING_TYPE_TO_XE[property.heating_type];
    if (xeHeating) {
      fields.push({ Name: XE_FIELD_NAMES.HEATING_TYPE, Value: xeHeating });
    }
  }

  // Furnished status
  if (property.furnished) {
    const xeFurnished = FURNISHED_TO_XE[property.furnished];
    if (xeFurnished) {
      fields.push({ Name: XE_FIELD_NAMES.FURNISHED, Value: xeFurnished });
    }
  }

  // Condition
  if (property.condition) {
    const xeCondition = CONDITION_TO_XE[property.condition];
    if (xeCondition) {
      fields.push({ Name: XE_FIELD_NAMES.CONDITION, Value: xeCondition });
    }
  }

  // Plot size (for land/houses)
  if (property.plot_size_sqm) {
    fields.push({
      Name: XE_FIELD_NAMES.PLOT_SIZE,
      Value: Number(property.plot_size_sqm).toString(),
    });
  }

  // Orientation (if available as JSON)
  if (property.orientation) {
    const orientations = Array.isArray(property.orientation)
      ? (property.orientation as string[])
      : [];
    if (orientations.length > 0) {
      fields.push({
        Name: XE_FIELD_NAMES.ORIENTATION,
        Value: orientations.join(","),
      });
    }
  }

  // ============================================
  // GEOGRAPHIC INFORMATION
  // ============================================

  if (property.address_street) {
    fields.push({
      Name: XE_FIELD_NAMES.GEO_STREET_NAME,
      Value: property.address_street,
    });
  }

  if (property.postal_code || property.address_zip) {
    fields.push({
      Name: XE_FIELD_NAMES.GEO_POSTCODE,
      Value: property.postal_code || property.address_zip || "",
    });
  }

  if (property.area) {
    fields.push({ Name: XE_FIELD_NAMES.GEO_AREA, Value: property.area });
  }

  if (property.address_city) {
    fields.push({
      Name: XE_FIELD_NAMES.GEO_CITY,
      Value: property.address_city,
    });
  }

  if (property.municipality) {
    fields.push({
      Name: XE_FIELD_NAMES.GEO_MUNICIPALITY,
      Value: property.municipality,
    });
  }

  // Coordinates
  const lat = property.latitude || property.coordinates?.lat;
  const lng = property.longitude || property.coordinates?.lng;
  if (lat && lng) {
    fields.push({ Name: XE_FIELD_NAMES.GEO_LATITUDE, Value: lat.toString() });
    fields.push({ Name: XE_FIELD_NAMES.GEO_LONGITUDE, Value: lng.toString() });
  }

  // ============================================
  // AMENITIES (from JSON field)
  // ============================================

  if (property.amenities && typeof property.amenities === "object") {
    const amenities = property.amenities as Record<string, boolean>;

    if (amenities.parking || amenities.hasParking) {
      fields.push({ Name: XE_FIELD_NAMES.HAS_PARKING, Value: "1" });
    }
    if (amenities.airConditioning || amenities.ac) {
      fields.push({ Name: XE_FIELD_NAMES.AIR_CONDITIONING, Value: "1" });
    }
    if (amenities.pool || amenities.swimmingPool) {
      fields.push({ Name: XE_FIELD_NAMES.POOL, Value: "1" });
    }
    if (amenities.garden) {
      fields.push({ Name: XE_FIELD_NAMES.GARDEN, Value: "1" });
    }
    if (amenities.storage) {
      fields.push({ Name: XE_FIELD_NAMES.STORAGE, Value: "1" });
    }
    if (amenities.balcony) {
      fields.push({ Name: XE_FIELD_NAMES.BALCONY, Value: "1" });
    }
    if (amenities.security || amenities.alarm) {
      fields.push({ Name: XE_FIELD_NAMES.SECURITY, Value: "1" });
    }
    if (amenities.view || amenities.seaView || amenities.mountainView) {
      fields.push({ Name: XE_FIELD_NAMES.VIEW, Value: "1" });
    }
  }

  // ============================================
  // BUILD XE ITEM
  // ============================================

  const refId = property.xeRefId || generateXeRefId(property.id, property.organizationId);

  const xeItem: XeItem = {
    "@type": mapPropertyTypeToXe(property.property_type),
    "@refId": refId,
    "@publicationType": agentSettings.publicationType || "BASIC",
    "Item.ownerId": agentSettings.xeOwnerId,
    "Item.majorPhone": formatPhoneForXe(agentSettings.majorPhone),
    "Item.departmentOnCategory": "Real Estate",
    "Transaction.type": mapTransactionTypeToXe(property.transaction_type),
    Field: fields,
  };

  // Add other phones if available
  if (agentSettings.otherPhones && agentSettings.otherPhones.length > 0) {
    xeItem["Item.otherPhones"] = {
      "Item.phone": agentSettings.otherPhones.map(formatPhoneForXe),
    };
  }

  // Add description
  if (property.description) {
    xeItem["Item.internetText"] = sanitizeText(property.description);
  }

  // Add property name as add-on text
  if (property.property_name) {
    xeItem["Item.addOnText"] = sanitizeText(property.property_name);
  }

  // Add pricing
  if (property.price) {
    xeItem["Transaction.price"] = property.price.toString();
    xeItem["Transaction.currency"] = "EUR";
    xeItem["Transaction.frequency"] =
      property.transaction_type === "RENTAL" ||
      property.transaction_type === "SHORT_TERM"
        ? "MONTHLY"
        : "ONCE";
  }

  // Add images (reference mode - URLs only)
  const images = extractPropertyImages(property);
  if (images.length > 0) {
    xeItem.Asset = mapImagesToXeAssets(images);
  }

  return xeItem;
}

/**
 * Map property type to XE item type
 */
export function mapPropertyTypeToXe(
  propertyType: string | null | undefined
): XeItemType {
  if (!propertyType) return "re_residence";
  return PROPERTY_TYPE_TO_XE[propertyType] || "re_misc";
}

/**
 * Map transaction type to XE transaction type
 */
export function mapTransactionTypeToXe(
  transactionType: string | null | undefined
): XeTransactionType {
  if (!transactionType) return "SELL.NORMAL";
  return TRANSACTION_TYPE_TO_XE[transactionType] || "SELL.NORMAL";
}

/**
 * Map image URLs to XE Asset array
 */
export function mapImagesToXeAssets(imageUrls: string[]): XeAsset[] {
  return imageUrls.slice(0, 30).map((url, index) => ({
    "Asset.type": "IMAGE" as const,
    "Asset.id": `img_${index + 1}`,
    "Asset.fileType": getFileExtension(url),
    "Asset.status": "ACTIVE" as const,
    "Asset.isPrimary": index === 0 ? ("1" as const) : ("0" as const),
    "Asset.order": index + 1,
    "Asset.uri": url,
  }));
}

/**
 * Get file extension from URL
 */
function getFileExtension(url: string): "jpg" | "jpeg" | "png" | "bmp" {
  const ext = url.split(".").pop()?.toLowerCase().split("?")[0];
  if (ext === "png") return "png";
  if (ext === "bmp") return "bmp";
  if (ext === "jpeg") return "jpeg";
  return "jpg";
}

/**
 * Map multiple properties to XE items
 */
export function mapPropertiesToXeItems(
  properties: PropertyWithExtras[],
  agentSettingsMap: Map<string, XeAgentPublishSettings>,
  defaultSettings: XeAgentPublishSettings
): XeItem[] {
  return properties.map((property) => {
    const agentSettings =
      agentSettingsMap.get(property.assigned_to || "") || defaultSettings;
    return mapPropertyToXeItem(property, agentSettings);
  });
}

/**
 * Validate property has required fields for XE publishing
 */
export function validatePropertyForXe(property: PropertyWithExtras): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!property.property_name) {
    errors.push("Property name is required");
  }

  if (!property.price && property.transaction_type !== "EXCHANGE") {
    errors.push("Price is required");
  }

  if (
    !property.square_feet &&
    !property.size_net_sqm &&
    !property.size_gross_sqm
  ) {
    errors.push("Property area/size is required");
  }

  // Recommended fields
  if (!property.description) {
    warnings.push("Description is recommended for better visibility");
  }

  if (!property.address_city && !property.municipality) {
    warnings.push("Location information is recommended");
  }

  const images = extractPropertyImages(property);
  if (images.length === 0) {
    warnings.push("At least one image is recommended");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
