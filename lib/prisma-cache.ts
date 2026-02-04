/**
 * Helper to conditionally add cacheStrategy to Prisma queries
 * Only adds cacheStrategy when Prisma Accelerate is enabled
 */
export function getCacheStrategy(swr: number, tags: string[]) {
  const databaseUrl = process.env.DATABASE_URL || "";
  const isAccelerateConnection = 
    databaseUrl.startsWith("prisma://") || 
    databaseUrl.startsWith("prisma+postgres://");
  
  if (isAccelerateConnection) {
    return {
      cacheStrategy: {
        swr,
        tags,
      },
    };
  }
  
  return {};
}
