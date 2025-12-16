import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    // Photon API only supports: default, en, de, fr - use "default" for best results
    const lang = "default";
    const limit = searchParams.get("limit") || "5";

    if (!query || query.length < 2) {
      return NextResponse.json({ features: [] });
    }

    // Build the Photon API URL with proper parameters
    // Using location_bias for Greece center instead of bbox which can cause 400 errors
    const photonParams = new URLSearchParams({
      q: query,
      lang: lang,
      limit: limit,
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
    return NextResponse.json(data);
  } catch (error) {
    console.error("[LOCATION_SEARCH] Error:", error);
    return NextResponse.json({ features: [] });
  }
}

