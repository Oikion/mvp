import { prismadb } from "@/lib/prisma";

/**
 * Helper function to invalidate Prisma Accelerate cache by tags
 * Only works if DATABASE_URL uses Prisma Accelerate connection string
 */
export async function invalidateCache(tags: string[]) {
  const databaseUrl = process.env.DATABASE_URL || "";
  const isAccelerateConnection = databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+postgres://");
  
  if (isAccelerateConnection && 'accelerate' in prismadb) {
    try {
      await (prismadb as any).$accelerate.invalidate({ tags });
    } catch (error) {
      // Silently fail if Accelerate is not configured or unavailable
      console.debug("Cache invalidation skipped:", error);
    }
  }
}

