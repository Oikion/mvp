/**
 * Helper to conditionally add cacheStrategy to Prisma queries
 * Only adds cacheStrategy when Prisma Accelerate is enabled
 * Uses ttl (Time-to-Live) as per Prisma's recommended approach
 */
export function getCacheStrategy(ttl: number, tags?: string[]) {
  const databaseUrl = process.env.DATABASE_URL || "";
  const isAccelerateConnection = 
    databaseUrl.startsWith("prisma://") || 
    databaseUrl.startsWith("prisma+postgres://");
  
  if (isAccelerateConnection) {
    const strategy: { ttl: number; tags?: string[] } = { ttl };
    if (tags && tags.length > 0) {
      strategy.tags = tags;
    }
    return {
      cacheStrategy: strategy,
    };
  }
  
  return {};
}
