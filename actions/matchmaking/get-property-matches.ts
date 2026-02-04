"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import {
  findMatchingClients,
  DEFAULT_MIN_MATCH_SCORE,
  DEFAULT_MATCH_LIMIT,
} from "@/lib/matchmaking";
import type {
  ClientForMatching,
  PropertyForMatching,
  MatchResultWithClient,
  MatchOptions,
} from "@/lib/matchmaking";
import { requireAction } from "@/lib/permissions/action-guards";

/**
 * Get matching clients for a specific property
 * Returns clients ranked by match score
 */
export async function getPropertyMatches(
  propertyId: string,
  options: MatchOptions = {}
): Promise<MatchResultWithClient[]> {
  // Permission check: Users need matchmaking:run permission
  const guard = await requireAction("matchmaking:run");
  if (guard) return [];

  const organizationId = await getCurrentOrgIdSafe();
  
  if (!organizationId) {
    return [];
  }
  
  const {
    limit = DEFAULT_MATCH_LIMIT,
    minScoreThreshold = DEFAULT_MIN_MATCH_SCORE,
    includeBreakdown = true,
  } = options;
  
  // Fetch the property
  const property = await prismadb.properties.findFirst({
    where: {
      id: propertyId,
      organizationId,
    },
    select: {
      id: true,
      property_name: true,
      price: true,
      property_type: true,
      transaction_type: true,
      property_status: true,
      area: true,
      address_city: true,
      address_state: true,
      municipality: true,
      bedrooms: true,
      bathrooms: true,
      size_net_sqm: true,
      size_gross_sqm: true,
      square_feet: true,
      floor: true,
      elevator: true,
      accepts_pets: true,
      furnished: true,
      heating_type: true,
      energy_cert_class: true,
      condition: true,
      amenities: true,
      assigned_to: true,
      organizationId: true,
    },
  });
  
  if (!property) {
    return [];
  }
  
  // Fetch active clients (leads and active)
  const clients = await prismadb.clients.findMany({
    where: {
      organizationId,
      client_status: {
        in: ["LEAD", "ACTIVE"],
      },
    },
    select: {
      id: true,
      client_name: true,
      full_name: true,
      intent: true,
      purpose: true,
      budget_min: true,
      budget_max: true,
      areas_of_interest: true,
      property_preferences: true,
      client_status: true,
      assigned_to: true,
      organizationId: true,
    },
  });
  
  // Convert property to match format
  const propertyForMatching: PropertyForMatching = {
    id: property.id,
    property_name: property.property_name,
    price: property.price,
    property_type: property.property_type as PropertyForMatching["property_type"],
    transaction_type: property.transaction_type as PropertyForMatching["transaction_type"],
    property_status: property.property_status as PropertyForMatching["property_status"],
    area: property.area,
    address_city: property.address_city,
    address_state: property.address_state,
    municipality: property.municipality,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    size_net_sqm: property.size_net_sqm,
    size_gross_sqm: property.size_gross_sqm,
    square_feet: property.square_feet,
    floor: property.floor,
    elevator: property.elevator,
    accepts_pets: property.accepts_pets,
    furnished: property.furnished as PropertyForMatching["furnished"],
    heating_type: property.heating_type as PropertyForMatching["heating_type"],
    energy_cert_class: property.energy_cert_class as PropertyForMatching["energy_cert_class"],
    condition: property.condition as PropertyForMatching["condition"],
    amenities: property.amenities as PropertyForMatching["amenities"],
    assigned_to: property.assigned_to,
    organizationId: property.organizationId,
  };
  
  // Convert clients to match format
  const clientsForMatching: ClientForMatching[] = clients.map(c => ({
    id: c.id,
    client_name: c.client_name,
    full_name: c.full_name,
    intent: c.intent as ClientForMatching["intent"],
    purpose: c.purpose as ClientForMatching["purpose"],
    budget_min: c.budget_min,
    budget_max: c.budget_max,
    areas_of_interest: c.areas_of_interest as string[] | null,
    property_preferences: c.property_preferences as ClientForMatching["property_preferences"],
    client_status: c.client_status as ClientForMatching["client_status"],
    assigned_to: c.assigned_to,
    organizationId: c.organizationId,
  }));
  
  // Calculate matches
  const matchResults = findMatchingClients(
    propertyForMatching,
    clientsForMatching,
    minScoreThreshold,
    limit
  );
  
  // Enrich with client details
  const clientMap = new Map(clients.map(c => [c.id, c]));
  
  const enrichedResults: MatchResultWithClient[] = matchResults.map(result => {
    const client = clientMap.get(result.clientId)!;
    
    return {
      ...result,
      breakdown: includeBreakdown ? result.breakdown : [],
      client: {
        id: client.id,
        client_name: client.client_name,
        full_name: client.full_name,
        intent: client.intent as MatchResultWithClient["client"]["intent"],
        budget_min: client.budget_min ? Number(client.budget_min) : null,
        budget_max: client.budget_max ? Number(client.budget_max) : null,
        client_status: client.client_status as MatchResultWithClient["client"]["client_status"],
      },
    };
  });
  
  // Serialize for client components
  return JSON.parse(JSON.stringify(enrichedResults));
}

/**
 * Get a quick match count for a property
 * Returns how many clients match above the threshold
 */
export async function getPropertyMatchCount(
  propertyId: string,
  minScore: number = 50
): Promise<{ total: number; excellent: number; good: number; fair: number }> {
  const matches = await getPropertyMatches(propertyId, {
    limit: 1000,
    minScoreThreshold: 0,
    includeBreakdown: false,
  });
  
  return {
    total: matches.filter(m => m.overallScore >= minScore).length,
    excellent: matches.filter(m => m.overallScore >= 85).length,
    good: matches.filter(m => m.overallScore >= 70 && m.overallScore < 85).length,
    fair: matches.filter(m => m.overallScore >= 50 && m.overallScore < 70).length,
  };
}
