"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { calculateMatchScore } from "@/lib/matchmaking";
import type {
  ClientForMatching,
  PropertyForMatching,
  MatchResult,
} from "@/lib/matchmaking";

/**
 * Get match score between a specific client and property
 */
export async function getMatchScore(
  clientId: string,
  propertyId: string
): Promise<MatchResult | null> {
  const organizationId = await getCurrentOrgIdSafe();
  
  if (!organizationId) {
    return null;
  }
  
  // Fetch both in parallel
  const [client, property] = await Promise.all([
    prismadb.clients.findFirst({
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
    }),
    prismadb.properties.findFirst({
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
    }),
  ]);
  
  if (!client || !property) {
    return null;
  }
  
  // Convert to match formats
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
  
  // Calculate score
  const result = calculateMatchScore(clientForMatching, propertyForMatching);
  
  // Serialize for client components
  return JSON.parse(JSON.stringify(result));
}

/**
 * Get match scores for multiple client-property pairs
 */
export async function getBatchMatchScores(
  pairs: Array<{ clientId: string; propertyId: string }>
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];
  
  for (const pair of pairs) {
    const result = await getMatchScore(pair.clientId, pair.propertyId);
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}
