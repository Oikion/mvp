/**
 * Geodesic distance and radius scoring utilities for matchmaking.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Computes the great-circle distance between two points using the Haversine formula.
 * Returns distance in kilometres, rounded to 2 decimal places.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c * 100) / 100;
}

/**
 * Converts a geodesic distance into a match score.
 * The effective radius is extended by 20% to create a soft edge.
 * Score is proportional to closeness within the extended radius.
 *
 * Formula: Math.max(0, Math.round(maxPoints * (1 - distanceKm / (radiusKm * 1.2))))
 *
 * @param distanceKm - Actual distance in km
 * @param radiusKm - Buyer's preferred search radius in km
 * @param maxPoints - Maximum points this criterion can award
 */
export function scoreByRadius(
  distanceKm: number,
  radiusKm: number,
  maxPoints: number
): number {
  return Math.max(
    0,
    Math.round(maxPoints * (1 - distanceKm / (radiusKm * 1.2)))
  );
}
