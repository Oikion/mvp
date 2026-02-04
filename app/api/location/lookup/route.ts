import { NextRequest, NextResponse } from "next/server";
import {
  lookupPostalCode,
  lookupMunicipality,
  searchMunicipality,
} from "@/data/greek-postal-codes";

export interface LocationLookupResponse {
  postalCode?: string;
  municipality?: string;
  area?: string;
  region?: string;
  suggestions?: Array<{
    postalCode: string;
    municipality: string;
    area?: string;
    region?: string;
  }>;
}

/**
 * Location Lookup API Endpoint
 * 
 * Supports bi-directional lookups:
 * - postalCode -> municipality/area
 * - municipality -> postal codes
 * 
 * Uses static Greek postal code data first, falls back to Photon API
 * Restricted to specified country (default: Greece)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postalCode = searchParams.get("postalCode");
    const municipality = searchParams.get("municipality");
    const country = searchParams.get("country") || "GR"; // Default to Greece

    // Only support Greece (GR) for now
    if (country !== "GR") {
      return NextResponse.json({
        error: "Only Greece (GR) is currently supported",
      }, { status: 400 });
    }

    // Lookup by postal code
    if (postalCode) {
      const normalized = postalCode.trim().replace(/\s+/g, "");
      
      // Validate format (5 digits for Greek postal codes)
      if (!/^\d{5}$/.test(normalized)) {
        return NextResponse.json({
          error: "Invalid postal code format. Greek postal codes must be 5 digits.",
        }, { status: 400 });
      }

      // Try static data first
      const staticResult = lookupPostalCode(normalized);
      if (staticResult) {
        return NextResponse.json({
          postalCode: staticResult.postalCode,
          municipality: staticResult.municipality,
          area: staticResult.area,
          region: staticResult.region,
        });
      }

      // Fallback to Photon API
      try {
        const photonParams = new URLSearchParams({
          q: normalized,
          limit: "5",
          osm_tag: "place:postcode",
          countrycodes: "gr", // Restrict to Greece
        });

        const photonUrl = `https://photon.komoot.io/api/?${photonParams.toString()}`;
        const response = await fetch(photonUrl, {
          headers: {
            Accept: "application/json",
            "User-Agent": "Oikion/1.0",
          },
          next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (response.ok) {
          const data = await response.json();
          const features = data.features || [];
          
          if (features.length > 0) {
            const feature = features[0];
            const props = feature.properties;
            
            // Find the feature that matches the postal code
            const matchingFeature = features.find(
              (f: any) => f.properties.postcode === normalized
            ) || features[0];

            return NextResponse.json({
              postalCode: matchingFeature.properties.postcode || normalized,
              municipality: matchingFeature.properties.city || matchingFeature.properties.name,
              area: matchingFeature.properties.district || matchingFeature.properties.locality,
              region: matchingFeature.properties.state,
            });
          }
        }
      } catch (apiError) {
        console.error("[LOCATION_LOOKUP] Photon API error:", apiError);
        // Continue to return empty result
      }

      return NextResponse.json({
        postalCode: normalized,
        municipality: null,
        area: null,
        region: null,
      });
    }

    // Lookup by municipality (returns suggestions)
    if (municipality) {
      const normalized = municipality.trim();
      
      if (normalized.length < 2) {
        return NextResponse.json({
          error: "Municipality query must be at least 2 characters",
        }, { status: 400 });
      }

      // Try static data first
      const staticResults = searchMunicipality(normalized);
      if (staticResults.length > 0) {
        // Get unique municipalities and their postal codes
        const municipalityMap = new Map<string, string[]>();
        staticResults.forEach((entry) => {
          if (!municipalityMap.has(entry.municipality)) {
            municipalityMap.set(entry.municipality, []);
          }
          municipalityMap.get(entry.municipality)!.push(entry.postalCode);
        });

        const suggestions = Array.from(municipalityMap.entries())
          .slice(0, 10)
          .map(([mun, codes]) => ({
            municipality: mun,
            postalCodes: codes.slice(0, 5), // Limit to 5 postal codes per municipality
            area: staticResults.find((r) => r.municipality === mun)?.area,
            region: staticResults.find((r) => r.municipality === mun)?.region,
          }));

        return NextResponse.json({
          municipality: normalized,
          suggestions: suggestions.map((s) => ({
            postalCode: s.postalCodes[0], // Return first postal code as primary
            municipality: s.municipality,
            area: s.area,
            region: s.region,
          })),
        });
      }

      // Fallback to Photon API
      try {
        const photonParams = new URLSearchParams({
          q: normalized,
          limit: "10",
          countrycodes: "gr", // Restrict to Greece
        });

        const photonUrl = `https://photon.komoot.io/api/?${photonParams.toString()}`;
        const response = await fetch(photonUrl, {
          headers: {
            Accept: "application/json",
            "User-Agent": "Oikion/1.0",
          },
          next: { revalidate: 3600 },
        });

        if (response.ok) {
          const data = await response.json();
          const features = data.features || [];
          
          if (features.length > 0) {
            const suggestions = features
              .filter((f: any) => {
                const props = f.properties;
                return (
                  props.city ||
                  props.name ||
                  props.district ||
                  props.locality
                );
              })
              .slice(0, 10)
              .map((feature: any) => {
                const props = feature.properties;
                return {
                  postalCode: props.postcode || null,
                  municipality: props.city || props.name || props.district || props.locality,
                  area: props.district || props.locality,
                  region: props.state,
                };
              });

            return NextResponse.json({
              municipality: normalized,
              suggestions,
            });
          }
        }
      } catch (apiError) {
        console.error("[LOCATION_LOOKUP] Photon API error:", apiError);
      }

      return NextResponse.json({
        municipality: normalized,
        suggestions: [],
      });
    }

    return NextResponse.json(
      { error: "Either postalCode or municipality parameter is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[LOCATION_LOOKUP] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
