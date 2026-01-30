"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import {
  calculateBatchMatches,
  DEFAULT_MIN_MATCH_SCORE,
  MATCH_THRESHOLDS,
} from "@/lib/matchmaking";
import type {
  ClientForMatching,
  PropertyForMatching,
  MatchAnalytics,
  MatchResultWithClient,
  MatchResultWithProperty,
  MatchDistribution,
  ClientSummary,
  PropertyWithMatchStats,
} from "@/lib/matchmaking";
import { requireAction } from "@/lib/permissions/action-guards";

/**
 * Get comprehensive match analytics for the dashboard
 */
export async function getMatchAnalytics(): Promise<MatchAnalytics> {
  // Permission check: Users need matchmaking:view_analytics permission
  const guard = await requireAction("matchmaking:view_analytics");
  if (guard) return getEmptyAnalytics();

  const organizationId = await getCurrentOrgIdSafe();
  
  if (!organizationId) {
    return getEmptyAnalytics();
  }
  
  // Fetch clients and properties in parallel
  const [clients, properties] = await Promise.all([
    prismadb.clients.findMany({
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
    }),
    prismadb.properties.findMany({
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
    }),
  ]);
  
  if (clients.length === 0 || properties.length === 0) {
    return {
      ...getEmptyAnalytics(),
      totalClients: clients.length,
      totalProperties: properties.length,
    };
  }
  
  // Convert to match format
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
  
  // Calculate all matches
  const allMatches = calculateBatchMatches(clientsForMatching, propertiesForMatching);
  
  // Create lookup maps
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const propertyMap = new Map(properties.map(p => [p.id, p]));
  
  // Top matches (above threshold, sorted by score)
  const topMatches = allMatches
    .filter(m => m.overallScore >= MATCH_THRESHOLDS.FAIR)
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 20)
    .map(m => {
      const client = clientMap.get(m.clientId)!;
      const property = propertyMap.get(m.propertyId)!;
      
      return {
        ...m,
        client: {
          id: client.id,
          client_name: client.client_name,
          full_name: client.full_name,
          intent: client.intent,
          budget_min: client.budget_min ? Number(client.budget_min) : null,
          budget_max: client.budget_max ? Number(client.budget_max) : null,
          client_status: client.client_status,
        },
        property: {
          id: property.id,
          property_name: property.property_name,
          price: property.price,
          property_type: property.property_type,
          bedrooms: property.bedrooms,
          area: property.area,
          address_city: property.address_city,
          property_status: property.property_status,
          imageUrl: property.Documents[0]?.document_file_url ?? null,
        },
      };
    }) as Array<MatchResultWithClient & MatchResultWithProperty>;
  
  // Match distribution
  const matchDistribution: MatchDistribution[] = [
    { range: "0-25%", min: 0, max: 25, count: 0 },
    { range: "26-50%", min: 26, max: 50, count: 0 },
    { range: "51-70%", min: 51, max: 70, count: 0 },
    { range: "71-85%", min: 71, max: 85, count: 0 },
    { range: "86-100%", min: 86, max: 100, count: 0 },
  ];
  
  allMatches.forEach(m => {
    const bucket = matchDistribution.find(
      d => m.overallScore >= d.min && m.overallScore <= d.max
    );
    if (bucket) bucket.count++;
  });
  
  // Find clients without good matches
  const clientBestScores = new Map<string, number>();
  allMatches.forEach(m => {
    const current = clientBestScores.get(m.clientId) ?? 0;
    if (m.overallScore > current) {
      clientBestScores.set(m.clientId, m.overallScore);
    }
  });
  
  const unmatchedClients: ClientSummary[] = clients
    .filter(c => (clientBestScores.get(c.id) ?? 0) < MATCH_THRESHOLDS.FAIR)
    .map(c => ({
      id: c.id,
      client_name: c.client_name,
      full_name: c.full_name,
      intent: c.intent as ClientSummary["intent"],
      budget_min: c.budget_min ? Number(c.budget_min) : null,
      budget_max: c.budget_max ? Number(c.budget_max) : null,
      client_status: c.client_status as ClientSummary["client_status"],
      bestMatchScore: clientBestScores.get(c.id) ?? 0,
    }))
    .sort((a, b) => (a.bestMatchScore ?? 0) - (b.bestMatchScore ?? 0))
    .slice(0, 10);
  
  // Hot properties (most matches above threshold)
  const propertyMatchCounts = new Map<string, { count: number; totalScore: number; topScore: number }>();
  allMatches.forEach(m => {
    if (m.overallScore >= MATCH_THRESHOLDS.FAIR) {
      const current = propertyMatchCounts.get(m.propertyId) ?? { count: 0, totalScore: 0, topScore: 0 };
      propertyMatchCounts.set(m.propertyId, {
        count: current.count + 1,
        totalScore: current.totalScore + m.overallScore,
        topScore: Math.max(current.topScore, m.overallScore),
      });
    }
  });
  
  const hotProperties: PropertyWithMatchStats[] = properties
    .map(p => {
      const stats = propertyMatchCounts.get(p.id) ?? { count: 0, totalScore: 0, topScore: 0 };
      return {
        id: p.id,
        property_name: p.property_name,
        price: p.price,
        property_type: p.property_type as PropertyWithMatchStats["property_type"],
        area: p.area,
        address_city: p.address_city,
        property_status: p.property_status as PropertyWithMatchStats["property_status"],
        imageUrl: p.Documents[0]?.document_file_url ?? null,
        matchCount: stats.count,
        averageMatchScore: stats.count > 0 ? Math.round(stats.totalScore / stats.count) : 0,
        topMatchScore: stats.topScore,
      };
    })
    .filter(p => p.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 10);
  
  // Overall stats
  const totalMatches = allMatches.length;
  const matchesAboveThreshold = allMatches.filter(m => m.overallScore >= MATCH_THRESHOLDS.FAIR).length;
  const averageScore = totalMatches > 0 
    ? Math.round(allMatches.reduce((sum, m) => sum + m.overallScore, 0) / totalMatches)
    : 0;
  
  const clientsWithMatches = Array.from(new Set(
    allMatches
      .filter(m => m.overallScore >= MATCH_THRESHOLDS.FAIR)
      .map(m => m.clientId)
  )).length;
  
  const analytics: MatchAnalytics = {
    topMatches,
    matchDistribution,
    unmatchedClients,
    hotProperties,
    totalClients: clients.length,
    totalProperties: properties.length,
    averageMatchScore: averageScore,
    clientsWithMatches,
  };
  
  // Serialize for client components
  return JSON.parse(JSON.stringify(analytics));
}

/**
 * Get summary stats for quick dashboard display
 */
export async function getMatchSummaryStats(): Promise<{
  totalClients: number;
  totalProperties: number;
  matchesAbove50: number;
  matchesAbove80: number;
  averageScore: number;
}> {
  const analytics = await getMatchAnalytics();
  
  const matchesAbove50 = analytics.matchDistribution
    .filter(d => d.min >= 51)
    .reduce((sum, d) => sum + d.count, 0);
  
  const matchesAbove80 = analytics.matchDistribution
    .filter(d => d.min >= 71)
    .reduce((sum, d) => sum + d.count, 0);
  
  return {
    totalClients: analytics.totalClients,
    totalProperties: analytics.totalProperties,
    matchesAbove50,
    matchesAbove80,
    averageScore: analytics.averageMatchScore,
  };
}

function getEmptyAnalytics(): MatchAnalytics {
  return {
    topMatches: [],
    matchDistribution: [
      { range: "0-25%", min: 0, max: 25, count: 0 },
      { range: "26-50%", min: 26, max: 50, count: 0 },
      { range: "51-70%", min: 51, max: 70, count: 0 },
      { range: "71-85%", min: 71, max: 85, count: 0 },
      { range: "86-100%", min: 86, max: 100, count: 0 },
    ],
    unmatchedClients: [],
    hotProperties: [],
    totalClients: 0,
    totalProperties: 0,
    averageMatchScore: 0,
    clientsWithMatches: 0,
  };
}
