/**
 * Infers a boolean property feature from a JSON amenities field.
 *
 * The amenities field may be in array form (["garden", "pool"]) or object form
 * ({ garden: true, pool: false }). Keys are normalized: lowercase + hyphens/spaces → underscore.
 * Returns null when amenities is null/undefined (unknown, not false).
 */
export function inferBooleanAmenity(
  amenities: unknown,
  keys: string[],
): boolean | null {
  if (amenities === null || amenities === undefined) return null;
  if (Array.isArray(amenities)) {
    const normalized = (amenities as unknown[])
      .filter((a): a is string => typeof a === "string")
      .map((a) => a.toLowerCase().replace(/[-\s]/g, "_"));
    return keys.some((k) =>
      normalized.includes(k.toLowerCase().replace(/[-\s]/g, "_")),
    );
  }
  if (typeof amenities === "object") {
    const obj = amenities as Record<string, unknown>;
    const normalizedKeys = Object.keys(obj).map((k) =>
      k.toLowerCase().replace(/[-\s]/g, "_"),
    );
    for (const key of keys) {
      const norm = key.toLowerCase().replace(/[-\s]/g, "_");
      if (normalizedKeys.includes(norm)) {
        const rawKey = Object.keys(obj).find(
          (k) => k.toLowerCase().replace(/[-\s]/g, "_") === norm,
        );
        return rawKey !== undefined ? obj[rawKey] === true : false;
      }
    }
    return false;
  }
  return null;
}
