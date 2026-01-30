/**
 * Facebook Marketplace Export Template
 * 
 * CSV export template for Facebook Marketplace/Commerce.
 * Follows Facebook's product catalog specification for real estate listings.
 */

import type { PortalTemplate, FieldMapping, PropertyData } from "./index";
import { sanitizeTextForExport, truncateText } from "./field-mapper";

// ============================================
// FACEBOOK-SPECIFIC TYPE MAPPINGS
// ============================================

/**
 * Facebook property type mapping
 * Facebook uses specific category IDs for real estate
 */
export const FACEBOOK_PROPERTY_TYPES: Record<string, string> = {
  APARTMENT: "apartment",
  HOUSE: "house",
  MAISONETTE: "townhouse",
  COMMERCIAL: "commercial",
  LAND: "land",
  PLOT: "land",
  WAREHOUSE: "commercial",
  PARKING: "other",
  INDUSTRIAL: "commercial",
  FARM: "land",
  VACATION: "house",
  RESIDENTIAL: "apartment",
  RENTAL: "apartment",
  OTHER: "other",
};

/**
 * Facebook availability status
 */
export const FACEBOOK_AVAILABILITY: Record<string, string> = {
  ACTIVE: "in stock",
  PENDING: "available for order",
  SOLD: "out of stock",
  OFF_MARKET: "out of stock",
  WITHDRAWN: "discontinued",
};

/**
 * Facebook condition mapping
 */
export const FACEBOOK_CONDITIONS: Record<string, string> = {
  EXCELLENT: "new",
  VERY_GOOD: "refurbished",
  GOOD: "used",
  NEEDS_RENOVATION: "used",
};

// ============================================
// FIELD MAPPINGS
// ============================================

export const FACEBOOK_FIELD_MAPPINGS: FieldMapping[] = [
  // Required fields for Facebook Commerce
  {
    internalField: "id",
    portalField: "id",
    type: "string",
    required: true,
    labelEn: "Product ID",
    labelEl: "ID Προϊόντος",
  },
  {
    internalField: "property_name",
    portalField: "title",
    type: "string",
    required: true,
    labelEn: "Title",
    labelEl: "Τίτλος",
    transform: (value, property) => {
      // Create a descriptive title for Facebook
      const type = property.property_type ? 
        FACEBOOK_PROPERTY_TYPES[property.property_type] || property.property_type : "property";
      const location = property.address_city || "";
      const beds = property.bedrooms ? `${property.bedrooms} bed` : "";
      
      const title = truncateText(sanitizeTextForExport(value as string), 100);
      
      // If title is generic, create a more descriptive one
      if (title.length < 20) {
        return [beds, type, "in", location].filter(Boolean).join(" ");
      }
      return title;
    },
  },
  {
    internalField: "description",
    portalField: "description",
    type: "string",
    required: true,
    labelEn: "Description",
    labelEl: "Περιγραφή",
    transform: (value, property) => {
      // Create rich description for Facebook
      const desc = sanitizeTextForExport(value as string);
      const details: string[] = [];
      
      if (property.bedrooms) details.push(`${property.bedrooms} Bedrooms`);
      if (property.bathrooms) details.push(`${property.bathrooms} Bathrooms`);
      if (property.square_feet) details.push(`${property.square_feet} sqm`);
      if (property.year_built) details.push(`Built: ${property.year_built}`);
      
      const detailStr = details.length > 0 ? `\n\n${details.join(" | ")}` : "";
      return truncateText(desc + detailStr, 5000);
    },
  },
  {
    internalField: "property_status",
    portalField: "availability",
    type: "enum",
    required: true,
    labelEn: "Availability",
    labelEl: "Διαθεσιμότητα",
    enumMap: FACEBOOK_AVAILABILITY,
    defaultValue: "in stock",
  },
  {
    internalField: "condition",
    portalField: "condition",
    type: "enum",
    required: true,
    labelEn: "Condition",
    labelEl: "Κατάσταση",
    enumMap: FACEBOOK_CONDITIONS,
    defaultValue: "used",
  },
  {
    internalField: "price",
    portalField: "price",
    type: "string",
    required: true,
    labelEn: "Price",
    labelEl: "Τιμή",
    transform: (value) => {
      // Facebook requires price in format "1000.00 EUR"
      const price = typeof value === "number" ? value : parseFloat(String(value)) || 0;
      return `${price.toFixed(2)} EUR`;
    },
  },
  
  // Link to property listing
  {
    internalField: "id",
    portalField: "link",
    type: "url",
    required: true,
    labelEn: "Link",
    labelEl: "Σύνδεσμος",
    transform: (value, property) => {
      // This should be customized with actual listing URL
      return `https://example.com/property/${value}`;
    },
  },
  
  // Primary image
  {
    internalField: "images",
    portalField: "image_link",
    type: "url",
    required: true,
    labelEn: "Image Link",
    labelEl: "Σύνδεσμος Εικόνας",
    transform: (value) => {
      if (Array.isArray(value) && value.length > 0) {
        return value[0];
      }
      return "";
    },
  },
  
  // Additional images
  {
    internalField: "images",
    portalField: "additional_image_link",
    type: "string",
    required: false,
    labelEn: "Additional Images",
    labelEl: "Επιπλέον Εικόνες",
    transform: (value) => {
      if (Array.isArray(value) && value.length > 1) {
        // Return images 2-10 (Facebook limit), comma separated
        return value.slice(1, 10).join(",");
      }
      return "";
    },
  },
  
  // Property type as category
  {
    internalField: "property_type",
    portalField: "product_type",
    type: "enum",
    required: false,
    labelEn: "Property Type",
    labelEl: "Τύπος Ακινήτου",
    enumMap: FACEBOOK_PROPERTY_TYPES,
  },
  
  // Brand (Agency name placeholder)
  {
    internalField: "id",
    portalField: "brand",
    type: "string",
    required: false,
    labelEn: "Brand",
    labelEl: "Εταιρεία",
    transform: () => "Real Estate Agency", // Placeholder - should be customized
  },
  
  // Location
  {
    internalField: "address_city",
    portalField: "custom_label_0",
    type: "string",
    required: false,
    labelEn: "City",
    labelEl: "Πόλη",
  },
  {
    internalField: "area",
    portalField: "custom_label_1",
    type: "string",
    required: false,
    labelEn: "Area",
    labelEl: "Περιοχή",
  },
  {
    internalField: "bedrooms",
    portalField: "custom_label_2",
    type: "string",
    required: false,
    labelEn: "Bedrooms",
    labelEl: "Υπνοδωμάτια",
    transform: (value) => value ? `${value} Beds` : "",
  },
  {
    internalField: "square_feet",
    portalField: "custom_label_3",
    type: "string",
    required: false,
    labelEn: "Size",
    labelEl: "Εμβαδόν",
    transform: (value) => value ? `${value} sqm` : "",
  },
  {
    internalField: "transaction_type",
    portalField: "custom_label_4",
    type: "string",
    required: false,
    labelEn: "Transaction Type",
    labelEl: "Τύπος Συναλλαγής",
    transform: (value) => {
      if (value === "SALE") return "For Sale";
      if (value === "RENTAL") return "For Rent";
      if (value === "SHORT_TERM") return "Short Term Rental";
      return value || "For Sale";
    },
  },
  
  // Google product category for real estate
  {
    internalField: "id",
    portalField: "google_product_category",
    type: "string",
    required: false,
    labelEn: "Category",
    labelEl: "Κατηγορία",
    transform: () => "Property", // Real estate category
  },
];

// ============================================
// TEMPLATE DEFINITION
// ============================================

export const FACEBOOK_TEMPLATE: PortalTemplate = {
  id: "facebook",
  name: "Facebook Marketplace",
  nameEl: "Facebook Marketplace",
  description: "Export properties for Facebook Marketplace and Commerce catalogs",
  descriptionEl: "Εξαγωγή ακινήτων για Facebook Marketplace και Commerce",
  format: "csv",
  website: "https://www.facebook.com/marketplace",
  icon: "/portals/facebook.png",
  fieldMappings: FACEBOOK_FIELD_MAPPINGS,
  
  // CSV configuration - Facebook prefers tab-delimited TSV
  csvDelimiter: "\t",
  csvBom: true,
  csvQuote: '"',
  
  // Validation rules - Facebook has strict requirements
  validation: {
    maxProperties: 5000,
    maxDescriptionLength: 5000,
    maxTitleLength: 100,
    minImages: 1,
    maxImages: 10,
    requiredFields: ["property_name", "price", "images", "description"],
    customValidation: (property: PropertyData) => {
      const errors = [];
      const warnings = [];
      
      // Check for required image
      if (!property.images || property.images.length === 0) {
        errors.push({
          field: "images",
          message: "At least one image is required for Facebook Marketplace",
          messageEl: "Απαιτείται τουλάχιστον μία εικόνα για το Facebook Marketplace",
        });
      }
      
      // Check image URLs are absolute
      if (property.images && property.images.length > 0) {
        const hasRelativeUrls = property.images.some(
          img => !img.startsWith("http://") && !img.startsWith("https://")
        );
        if (hasRelativeUrls) {
          errors.push({
            field: "images",
            message: "All image URLs must be absolute (start with http:// or https://)",
            messageEl: "Όλα τα URL εικόνων πρέπει να είναι απόλυτα (να ξεκινούν με http:// ή https://)",
          });
        }
      }
      
      // Check price is reasonable
      if (!property.price || property.price < 100) {
        warnings.push({
          field: "price",
          message: "Price seems too low for Facebook Marketplace listing",
          messageEl: "Η τιμή φαίνεται πολύ χαμηλή για αγγελία στο Facebook Marketplace",
        });
      }
      
      // Check description length
      if (!property.description || property.description.length < 50) {
        warnings.push({
          field: "description",
          message: "Description is too short, longer descriptions perform better",
          messageEl: "Η περιγραφή είναι πολύ σύντομη, οι μεγαλύτερες περιγραφές έχουν καλύτερα αποτελέσματα",
        });
      }
      
      return { valid: errors.length === 0, errors, warnings };
    },
  },
  
  // Export options
  exportOptions: {
    includeWithoutImages: false, // Facebook requires images
    includeDrafts: false,
    includeInactive: false,
    includeContact: false, // Facebook uses in-app messaging
    includeAgency: true,
    listingUrlPattern: "/property/:id",
  },
};
