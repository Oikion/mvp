/**
 * Privacy filtering for cross-org network matches.
 *
 * Each org controls how much of their shared data peers can see.
 * Filtering is applied at read time so privacy level changes take
 * effect immediately without recomputing CrossOrgMatch rows.
 */

import type { NetworkPrivacyLevel } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────
// Input types (raw data from DB before filtering)
// ─────────────────────────────────────────────────────────────────

export interface RawPropertyForNetwork {
  id: string;
  friendlyId: string;
  property_name: string;
  price: number | null;
  transaction_type: string | null;
  property_type: string | null;
  area: string | null;
  address_city: string | null;
  municipality: string | null;
  bedrooms: number | null;
  size_net_sqm: number | null;
  organizationId: string;
  // Agency info (from AgencyProfile join)
  agencyName: string | null;
  agencyLogo: string | null;
  // Listing agent info (from Users join via assigned_to)
  listingAgentName: string | null;
  listingAgentPhone: string | null;
}

export interface RawRequestForNetwork {
  id: string;
  friendlyId: string | null;
  requestType: string;
  propertyCategory: string | null;
  areasOfInterest: string[] | null;
  municipality: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  organizationId: string;
  // Agency info
  agencyName: string | null;
  agencyLogo: string | null;
  // Assigned agent info
  agentName: string | null;
  agentPhone: string | null;
}

// ─────────────────────────────────────────────────────────────────
// Output types (what the viewing org receives)
// ─────────────────────────────────────────────────────────────────

/** Base fields always visible regardless of privacy level */
interface PropertyBase {
  id: string;
  transaction_type: string | null;
  property_type: string | null;
  area: string | null;
  address_city: string | null;
  municipality: string | null;
  bedrooms: number | null;
  size_net_sqm: number | null;
  price: number | null;
  sourceOrgId: string;
  privacyLevel: NetworkPrivacyLevel;
}

export interface AnonymizedProperty extends PropertyBase {
  privacyLevel: "ANONYMIZED";
}

export interface AgencyIdentifiedProperty extends PropertyBase {
  privacyLevel: "AGENCY_IDENTIFIED";
  agencyName: string | null;
  agencyLogo: string | null;
}

export interface FullProperty extends PropertyBase {
  privacyLevel: "FULL";
  agencyName: string | null;
  agencyLogo: string | null;
  listingAgentName: string | null;
  listingAgentPhone: string | null;
  friendlyId: string;
}

export type FilteredProperty =
  | AnonymizedProperty
  | AgencyIdentifiedProperty
  | FullProperty;

interface RequestBase {
  id: string;
  requestType: string;
  propertyCategory: string | null;
  areasOfInterest: string[] | null;
  municipality: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  sourceOrgId: string;
  privacyLevel: NetworkPrivacyLevel;
}

export interface AnonymizedRequest extends RequestBase {
  privacyLevel: "ANONYMIZED";
}

export interface AgencyIdentifiedRequest extends RequestBase {
  privacyLevel: "AGENCY_IDENTIFIED";
  agencyName: string | null;
  agencyLogo: string | null;
}

export interface FullRequest extends RequestBase {
  privacyLevel: "FULL";
  agencyName: string | null;
  agencyLogo: string | null;
  agentName: string | null;
  agentPhone: string | null;
  friendlyId: string | null;
}

export type FilteredRequest =
  | AnonymizedRequest
  | AgencyIdentifiedRequest
  | FullRequest;

// ─────────────────────────────────────────────────────────────────
// Filter functions
// ─────────────────────────────────────────────────────────────────

export function filterProperty(
  raw: RawPropertyForNetwork,
  privacyLevel: NetworkPrivacyLevel,
): FilteredProperty {
  const base: PropertyBase = {
    id: raw.id,
    transaction_type: raw.transaction_type,
    property_type: raw.property_type,
    area: raw.area,
    address_city: raw.address_city,
    municipality: raw.municipality,
    bedrooms: raw.bedrooms,
    size_net_sqm: raw.size_net_sqm,
    price: raw.price,
    sourceOrgId: raw.organizationId,
    privacyLevel,
  };

  if (privacyLevel === "ANONYMIZED") {
    return { ...base, privacyLevel: "ANONYMIZED" };
  }

  if (privacyLevel === "AGENCY_IDENTIFIED") {
    return {
      ...base,
      privacyLevel: "AGENCY_IDENTIFIED",
      agencyName: raw.agencyName,
      agencyLogo: raw.agencyLogo,
    };
  }

  // FULL
  return {
    ...base,
    privacyLevel: "FULL",
    agencyName: raw.agencyName,
    agencyLogo: raw.agencyLogo,
    listingAgentName: raw.listingAgentName,
    listingAgentPhone: raw.listingAgentPhone,
    friendlyId: raw.friendlyId,
  };
}

export function filterRequest(
  raw: RawRequestForNetwork,
  privacyLevel: NetworkPrivacyLevel,
): FilteredRequest {
  const base: RequestBase = {
    id: raw.id,
    requestType: raw.requestType,
    propertyCategory: raw.propertyCategory,
    areasOfInterest: raw.areasOfInterest,
    municipality: raw.municipality,
    budgetMin: raw.budgetMin,
    budgetMax: raw.budgetMax,
    sourceOrgId: raw.organizationId,
    privacyLevel,
  };

  if (privacyLevel === "ANONYMIZED") {
    return { ...base, privacyLevel: "ANONYMIZED" };
  }

  if (privacyLevel === "AGENCY_IDENTIFIED") {
    return {
      ...base,
      privacyLevel: "AGENCY_IDENTIFIED",
      agencyName: raw.agencyName,
      agencyLogo: raw.agencyLogo,
    };
  }

  // FULL
  return {
    ...base,
    privacyLevel: "FULL",
    agencyName: raw.agencyName,
    agencyLogo: raw.agencyLogo,
    agentName: raw.agentName,
    agentPhone: raw.agentPhone,
    friendlyId: raw.friendlyId,
  };
}
