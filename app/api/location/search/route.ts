import { NextRequest, NextResponse } from "next/server";
import {
  lookupPostalCode,
  searchMunicipality,
  GREEK_POSTAL_CODES,
  type GreekPostalCodeData,
} from "@/data/greek-postal-codes";

/**
 * Convert static Greek postal code data to Photon feature format
 * This ensures consistent response format whether data comes from static or API
 */
function postalCodeToPhotonFeature(data: GreekPostalCodeData): any {
  // Use approximate coordinates for Greek regions
  // These are rough center points - actual coordinates would require geocoding
  const regionCoordinates: Record<string, [number, number]> = {
    "Αττική": [23.7275, 37.9838],
    "Κεντρική Μακεδονία": [22.9444, 40.6401],
    "Δυτική Ελλάδα": [21.7342, 38.2466],
    "Κρήτη": [24.8093, 35.2401],
    "Θεσσαλία": [22.4191, 39.6394],
    "Ήπειρος": [20.8519, 39.6650],
    "Ανατολική Μακεδονία": [24.4014, 41.1171],
    "Νότιο Αιγαίο": [28.2241, 36.4340],
  };

  const coords = regionCoordinates[data.region || ""] || [23.7275, 37.9838]; // Default to Athens

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: coords,
    },
    properties: {
      osm_type: "N",
      osm_key: "place",
      osm_value: "postcode",
      name: `${data.municipality} ${data.postalCode}`,
      city: data.municipality,
      locality: data.area,
      state: data.region,
      country: "Greece",
      countrycode: "GR",
      postcode: data.postalCode,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    // Photon API only supports: default, en, de, fr - use "default" for best results
    const lang = "default";
    const limit = parseInt(searchParams.get("limit") || "5", 10);

    if (!query || query.length < 2) {
      return NextResponse.json({ features: [] });
    }

    const normalizedQuery = query.trim().replace(/\s+/g, "");

    // Check if query looks like a Greek postal code (5 digits)
    if (/^\d{5}$/.test(normalizedQuery)) {
      // First try exact match in static data
      const exactMatch = lookupPostalCode(normalizedQuery);
      if (exactMatch) {
        return NextResponse.json({
          type: "FeatureCollection",
          features: [postalCodeToPhotonFeature(exactMatch)],
        });
      }

      // Try partial match (e.g., searching for "14575" should also show nearby codes)
      const partialMatches = GREEK_POSTAL_CODES.filter(
        (entry) => entry.postalCode.startsWith(normalizedQuery.slice(0, 3))
      ).slice(0, limit);

      if (partialMatches.length > 0) {
        return NextResponse.json({
          type: "FeatureCollection",
          features: partialMatches.map(postalCodeToPhotonFeature),
        });
      }
    }

    // Check if query matches a municipality name in static data
    const municipalityMatches = searchMunicipality(normalizedQuery);
    if (municipalityMatches.length > 0) {
      // Deduplicate by municipality name
      const uniqueMunicipalities = new Map<string, GreekPostalCodeData>();
      municipalityMatches.forEach((entry) => {
        if (!uniqueMunicipalities.has(entry.municipality)) {
          uniqueMunicipalities.set(entry.municipality, entry);
        }
      });

      const staticFeatures = Array.from(uniqueMunicipalities.values())
        .slice(0, limit)
        .map(postalCodeToPhotonFeature);

      // If we have static results, return them immediately for speed
      if (staticFeatures.length >= limit) {
        return NextResponse.json({
          type: "FeatureCollection",
          features: staticFeatures,
        });
      }
    }

    // Fall back to Photon API for broader searches (street names, addresses, etc.)
    // Build the Photon API URL with proper parameters
    // Using location_bias for Greece center instead of bbox which can cause 400 errors
    const photonParams = new URLSearchParams({
      q: query,
      lang: lang,
      limit: String(limit * 3), // Request more to account for filtering
      lat: "38.5", // Greece center latitude
      lon: "23.5", // Greece center longitude
    });

    const photonUrl = `https://photon.komoot.io/api/?${photonParams.toString()}`;

    const response = await fetch(photonUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Oikion/1.0",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[LOCATION_SEARCH] Photon API error:", response.status, errorText);
      return NextResponse.json({ features: [] });
    }

    const data = await response.json();

    // Filter results to Greece only
    const greekFeatures = (data.features || []).filter((feature: any) => {
      const props = feature.properties;
      return (
        props.countrycode === "GR" ||
        props.country === "Greece" ||
        props.country === "Ελλάδα"
      );
    });

    // Limit to requested number of results
    const limitedFeatures = greekFeatures.slice(0, limit);

    return NextResponse.json({
      type: "FeatureCollection",
      features: limitedFeatures,
    });
  } catch (error) {
    console.error("[LOCATION_SEARCH] Error:", error);
    return NextResponse.json({ features: [] });
  }
}
