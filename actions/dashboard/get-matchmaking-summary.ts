import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { getMatchAnalytics } from "@/actions/matchmaking";

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
    clientId: string;
    propertyId: string;
    overallScore: number;
    clientName: string;
    propertyName: string;
  }>;
  totalMatches: number;
  averageScore: number;
}

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
    const analytics = await getMatchAnalytics();

    if (!analytics) {
      return {
        hotProperties: [],
        topMatches: [],
        totalMatches: 0,
        averageScore: 0,
      };
    }

    // Map hot properties to dashboard format
    const hotProperties = (analytics.hotProperties || []).slice(0, 5).map((p: any) => ({
      id: p.id,
      property_name: p.property_name || "Unnamed Property",
      price: p.price,
      address_city: p.address_city,
      image_url: p.image_url,
      matchCount: p.matchCount || 0,
      averageMatchScore: p.averageMatchScore || 0,
      topMatchScore: p.topMatchScore || 0,
    }));

    // Map top matches to dashboard format
    const topMatches = (analytics.topMatches || []).slice(0, 5).map((m: any) => ({
      clientId: m.clientId,
      propertyId: m.propertyId,
      overallScore: m.overallScore,
      clientName: m.client?.client_name || m.client?.full_name || "Unknown Client",
      propertyName: m.property?.property_name || "Unknown Property",
    }));

    return {
      hotProperties,
      topMatches,
      totalMatches: analytics.clientsWithMatches || 0,
      averageScore: analytics.averageMatchScore || 0,
    };
  } catch (error) {
    console.error("Failed to fetch matchmaking summary:", error);
    return {
      hotProperties: [],
      topMatches: [],
      totalMatches: 0,
      averageScore: 0,
    };
  }
}
