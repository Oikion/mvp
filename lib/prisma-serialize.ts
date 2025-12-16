/**
 * Utility to serialize Prisma objects for passing to Client Components.
 * Converts Decimal to number and Date to ISO string.
 * This is necessary because Next.js cannot serialize Prisma Decimal objects
 * when passing data from Server Components to Client Components.
 */

/**
 * Recursively serializes Prisma objects to plain JavaScript objects.
 * - Converts Prisma Decimal objects to numbers
 * - Converts Date objects to ISO strings
 * - Recursively processes arrays and nested objects
 *
 * @param obj - The object to serialize
 * @returns A plain JavaScript object safe for Client Components
 */
export function serializePrisma<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle Prisma Decimal objects (they have a toNumber method)
  if (
    typeof obj === "object" &&
    obj !== null &&
    "toNumber" in obj &&
    typeof (obj as { toNumber: () => number }).toNumber === "function"
  ) {
    return (obj as { toNumber: () => number }).toNumber() as unknown as T;
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(serializePrisma) as unknown as T;
  }

  // Handle plain objects
  if (typeof obj === "object" && obj !== null) {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializePrisma(value);
    }
    return serialized as T;
  }

  return obj;
}

/**
 * Alternative serialization using JSON.parse(JSON.stringify())
 * This is simpler but slightly less performant for large objects.
 * Use this when you need a quick solution.
 *
 * @param obj - The object to serialize
 * @returns A plain JavaScript object safe for Client Components
 */
export function serializePrismaJson<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}


