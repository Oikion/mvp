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

export interface RawMandateForNetwork {
  id: string;
  friendlyId: string;
  transaction_type: string | null;
  property_type: string | null;
  areas_of_interest: string[] | null;
  municipality: string | null;
  budget_min: number | null;
  budget_max: number | null;
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

interface MandateBase {
  id: string;
  transaction_type: string | null;
  property_type: string | null;
  areas_of_interest: string[] | null;
  municipality: string | null;
  budget_min: number | null;
  budget_max: number | null;
  sourceOrgId: string;
  privacyLevel: NetworkPrivacyLevel;
}

export interface AnonymizedMandate extends MandateBase {
  privacyLevel: "ANONYMIZED";
}

export interface AgencyIdentifiedMandate extends MandateBase {
  privacyLevel: "AGENCY_IDENTIFIED";
  agencyName: string | null;
  agencyLogo: string | null;
}

export interface FullMandate extends MandateBase {
  privacyLevel: "FULL";
  agencyName: string | null;
  agencyLogo: string | null;
  agentName: string | null;
  agentPhone: string | null;
  friendlyId: string;
}

export type FilteredMandate =
  | AnonymizedMandate
  | AgencyIdentifiedMandate
  | FullMandate;

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

export function filterMandate(
  raw: RawMandateForNetwork,
  privacyLevel: NetworkPrivacyLevel,
): FilteredMandate {
  const base: MandateBase = {
    id: raw.id,
    transaction_type: raw.transaction_type,
    property_type: raw.property_type,
    areas_of_interest: raw.areas_of_interest,
    municipality: raw.municipality,
    budget_min: raw.budget_min,
    budget_max: raw.budget_max,
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
