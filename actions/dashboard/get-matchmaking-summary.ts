"use server";

import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { getRequestMatchAnalytics } from "@/actions/matchmaking/get-request-matches";

export interface MatchmakingSummary {
  hotProperties: Array<{
    id: string;
    property_name: string;
    price: number | null;
    address_city: string | null;
    image_url: string | null;
    matchCount: number;
    averageMatchScore: number;
    topMatchScore: number;
  }>;
  topMatches: Array<{
    requestId: string;
    propertyId: string;
    overallScore: number;
    clientName: string;
    propertyName: string;
  }>;
  totalMatches: number;
  averageScore: number;
}

type HotPropertyEntry = {
  id: string;
  property_name: string;
  price: number | null;
  address_city: string | null;
  imageUrl?: string | null;
  matchCount: number;
  averageMatchScore: number;
  topMatchScore: number;
};

type TopMatchEntry = {
  requestId: string;
  propertyId: string;
  overallScore: number;
  client?: { client_name?: string; full_name?: string | null } | null;
  property?: { property_name?: string } | null;
};

export async function getMatchmakingSummary(): Promise<MatchmakingSummary> {
  const organizationId = await getCurrentOrgIdSafe();

  if (!organizationId) {
    return {
      hotProperties: [],
      topMatches: [],
      totalMatches: 0,
      averageScore: 0,
    };
  }

  try {
    const analytics = await getRequestMatchAnalytics();

    if (!analytics) {
      return {
        hotProperties: [],
        topMatches: [],
        totalMatches: 0,
        averageScore: 0,
      };
    }

    const hotProperties = ((analytics.hotProperties ?? []) as HotPropertyEntry[])
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        property_name: p.property_name || "Unnamed Property",
        price: p.price,
        address_city: p.address_city,
        image_url: p.imageUrl ?? null,
        matchCount: p.matchCount || 0,
        averageMatchScore: p.averageMatchScore || 0,
        topMatchScore: p.topMatchScore || 0,
      }));

    const topMatches = ((analytics.topMatches ?? []) as unknown as TopMatchEntry[])
      .slice(0, 5)
      .map((m) => ({
        requestId: m.requestId,
        propertyId: m.propertyId,
        overallScore: m.overallScore,
        clientName: m.client?.client_name || m.client?.full_name || "Unknown Client",
        propertyName: m.property?.property_name ?? "Unknown Property",
      }));

    return {
      hotProperties,
      topMatches,
      totalMatches: analytics.requestStats.requestsWithMatches ?? 0,
      averageScore: analytics.averageMatchScore || 0,
    };
  } catch (error) {
    console.error("[DASHBOARD_MATCHMAKING_SUMMARY]", error);
    return {
      hotProperties: [],
      topMatches: [],
      totalMatches: 0,
      averageScore: 0,
    };
  }
}
