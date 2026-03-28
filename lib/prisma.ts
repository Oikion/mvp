import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// Type for the extended Prisma client (with or without Accelerate)
// This ensures type safety when accessing models like prismadb.properties
type ExtendedPrismaClient = PrismaClient;

// Declare global type for caching across hot reloads and serverless invocations
declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var cachedPrisma: ExtendedPrismaClient | undefined;
  // eslint-disable-next-line no-var, no-unused-vars
  var cachedPrismaDirect: PrismaClient | undefined;
}

function createPrismaClient(): ExtendedPrismaClient {
  const basePrisma = new PrismaClient({
    // Log errors and warnings only (no query spam)
    log: process.env.NODE_ENV === "development"
      ? ["error", "warn"]
      : ["error"],
  });

  // Add Accelerate extension only in production with Accelerate URLs
  // This prevents accidental Accelerate usage in development
  const databaseUrl = process.env.DATABASE_URL || "";
  const isAccelerateConnection = databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+postgres://");
  const shouldUseAccelerate = process.env.NODE_ENV === "production" && isAccelerateConnection;

  if (shouldUseAccelerate) {
    // Accelerate extension preserves the base PrismaClient interface
    return basePrisma.$extends(withAccelerate()) as unknown as ExtendedPrismaClient;
  }

  return basePrisma;
}

/**
 * Creates a direct (non-Accelerate) Prisma client for operations that
 * require raw SQL ($queryRaw) or features Accelerate doesn't support.
 * Uses DIRECT_DATABASE_URL when available, falls back to DATABASE_URL.
 */
function createDirectPrismaClient(): PrismaClient {
  const directUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "";
  return new PrismaClient({
    datasourceUrl: directUrl,
    log: ["error"],
  });
}

// FIXED: Always use singleton pattern to prevent connection exhaustion in serverless
// Use existing cached instance if available, otherwise create a new one
const prismadb = globalThis.cachedPrisma ?? createPrismaClient();
const prismadbDirect = globalThis.cachedPrismaDirect ?? createDirectPrismaClient();

// Cache the instances globally to reuse across requests
// - In development: Preserves across hot reloads (module re-evaluation)
// - In production serverless: globalThis persists across warm invocations
globalThis.cachedPrisma = prismadb;
globalThis.cachedPrismaDirect = prismadbDirect;

export { prismadb, prismadbDirect };
