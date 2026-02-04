"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import {
  calculateMatchScore,
  findMatchingProperties,
  DEFAULT_MIN_MATCH_SCORE,
  DEFAULT_MATCH_LIMIT,
} from "@/lib/matchmaking";
import type {
  ClientForMatching,
  PropertyForMatching,
  MatchResultWithProperty,
  MatchOptions,
} from "@/lib/matchmaking";
import { requireAction } from "@/lib/permissions/action-guards";

/**
 * Get matching properties for a specific client
 * Returns properties ranked by match score
 */
export async function getClientMatches(
  clientId: string,
  options: MatchOptions = {}
): Promise<MatchResultWithProperty[]> {
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
  
  // Fetch the client
  const client = await prismadb.clients.findFirst({
    where: {
      id: clientId,
      organizationId,
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
  
  if (!client) {
    return [];
  }
  
  // Fetch active properties
  const properties = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: {
        in: ["ACTIVE", "PENDING"],
      },
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
      Documents: {
        where: {
          document_file_mimeType: {
            startsWith: "image/",
          },
        },
        select: {
          document_file_url: true,
        },
        take: 1,
      },
    },
  });
  
  // Convert client to match format
  const clientForMatching: ClientForMatching = {
    id: client.id,
    client_name: client.client_name,
    full_name: client.full_name,
    intent: client.intent as ClientForMatching["intent"],
    purpose: client.purpose as ClientForMatching["purpose"],
    budget_min: client.budget_min,
    budget_max: client.budget_max,
    areas_of_interest: client.areas_of_interest as string[] | null,
    property_preferences: client.property_preferences as ClientForMatching["property_preferences"],
    client_status: client.client_status as ClientForMatching["client_status"],
    assigned_to: client.assigned_to,
    organizationId: client.organizationId,
  };
  
  // Convert properties to match format
  const propertiesForMatching: PropertyForMatching[] = properties.map(p => ({
    id: p.id,
    property_name: p.property_name,
    price: p.price,
    property_type: p.property_type as PropertyForMatching["property_type"],
    transaction_type: p.transaction_type as PropertyForMatching["transaction_type"],
    property_status: p.property_status as PropertyForMatching["property_status"],
    area: p.area,
    address_city: p.address_city,
    address_state: p.address_state,
    municipality: p.municipality,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    size_net_sqm: p.size_net_sqm,
    size_gross_sqm: p.size_gross_sqm,
    square_feet: p.square_feet,
    floor: p.floor,
    elevator: p.elevator,
    accepts_pets: p.accepts_pets,
    furnished: p.furnished as PropertyForMatching["furnished"],
    heating_type: p.heating_type as PropertyForMatching["heating_type"],
    energy_cert_class: p.energy_cert_class as PropertyForMatching["energy_cert_class"],
    condition: p.condition as PropertyForMatching["condition"],
    amenities: p.amenities as PropertyForMatching["amenities"],
    assigned_to: p.assigned_to,
    organizationId: p.organizationId,
  }));
  
  // Calculate matches
  const matchResults = findMatchingProperties(
    clientForMatching,
    propertiesForMatching,
    minScoreThreshold,
    limit
  );
  
  // Enrich with property details
  const propertyMap = new Map(properties.map(p => [p.id, p]));
  
  const enrichedResults: MatchResultWithProperty[] = matchResults.map(result => {
    const property = propertyMap.get(result.propertyId)!;
    
    return {
      ...result,
      breakdown: includeBreakdown ? result.breakdown : [],
      property: {
        id: property.id,
        property_name: property.property_name,
        price: property.price,
        property_type: property.property_type as MatchResultWithProperty["property"]["property_type"],
        bedrooms: property.bedrooms,
        area: property.area,
        address_city: property.address_city,
        property_status: property.property_status as MatchResultWithProperty["property"]["property_status"],
        imageUrl: property.Documents[0]?.document_file_url ?? null,
      },
    };
  });
  
  // Serialize for client components
  return JSON.parse(JSON.stringify(enrichedResults));
}

/**
 * Get a quick match count for a client
 * Returns how many properties match above the threshold
 */
export async function getClientMatchCount(
  clientId: string,
  minScore: number = 50
): Promise<{ total: number; excellent: number; good: number; fair: number }> {
  const matches = await getClientMatches(clientId, {
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
