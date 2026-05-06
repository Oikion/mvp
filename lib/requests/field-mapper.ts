import type { Prisma } from "@prisma/client";
import type { PreviewRequest } from "@/lib/types/auto-generate-requests";

export interface RawPropertyForMapping {
  id: string;
  friendlyId: string | null;
  price: Prisma.Decimal | null;
  size_net_sqm: Prisma.Decimal | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
  transaction_type: string | null;
  municipality: string | null;
  region: string | null;
  area: string | null;
  condition: string | null;
  furnished: string | null;
  heating_type: string | null;
  elevator: boolean | null;
  energy_cert_class: string | null;
}

function deriveRequestType(
  transactionType: string | null,
  contactCategories: string[]
): "BUY" | "RENT" {
  if (transactionType === "SALE") return "BUY";
  if (transactionType === "RENTAL") return "RENT";
  if (contactCategories.includes("BUYER")) return "BUY";
  if (contactCategories.includes("TENANT")) return "RENT";
  return "BUY";
}

export function mapPropertyToPreviewRequest(
  contactId: string,
  contactName: string,
  contactCategories: string[],
  hasMultipleProperties: boolean,
  property: RawPropertyForMapping
): PreviewRequest {
  const price = property.price?.toNumber() ?? null;
  const sqm = property.size_net_sqm?.toNumber() ?? null;

  const suffix =
    hasMultipleProperties
      ? ` (${property.friendlyId ?? property.id.slice(-6)})`
      : "";
  const name = `${contactName} — Search Brief${suffix}`;

  return {
    previewId: `${contactId}::${property.id}`,
    contactId,
    contactName,
    propertyId: property.id,
    propertyFriendlyId: property.friendlyId ?? property.id.slice(-6),

    name,
    requestType: deriveRequestType(property.transaction_type, contactCategories),

    budgetMax: price,
    budgetMin: price !== null ? Math.round(price * 0.85) : null,
    surfaceMin: sqm,
    surfaceMax: sqm !== null ? Math.round(sqm * 1.1) : null,

    bedroomsMin: property.bedrooms ?? null,
    bathroomsMin:
      property.bathrooms != null ? Math.floor(property.bathrooms) : null,

    propertyTypes: property.property_type ? [property.property_type] : [],
    municipality: property.municipality ?? null,
    region: property.region ?? null,
    locationDisplayName: property.area ?? null,

    conditionPreference: property.condition ? [property.condition] : [],
    furnished: property.furnished ?? null,
    heatingTypes: property.heating_type ? [property.heating_type] : [],
    requiresElevator: property.elevator ?? null,
    energyClassMin: property.energy_cert_class ?? null,
  };
}
