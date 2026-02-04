import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// Type for the extended Prisma client (with or without Accelerate)
// This ensures type safety when accessing models like prismadb.properties
type ExtendedPrismaClient = PrismaClient;

// Declare global type for caching across hot reloads and serverless invocations
declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var cachedPrisma: ExtendedPrismaClient | undefined;
}

function createPrismaClient(): ExtendedPrismaClient {
  const basePrisma = new PrismaClient({
    // Log errors in production, more verbose in development
    log: process.env.NODE_ENV === "development" 
      ? ["query", "error", "warn"] 
      : ["error"],
  });
  
  // Add Accelerate extension if DATABASE_URL uses Prisma Accelerate connection string
  // Accelerate URLs start with prisma:// or prisma+postgres://
  const databaseUrl = process.env.DATABASE_URL || "";
  const isAccelerateConnection = databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+postgres://");
  
  if (isAccelerateConnection) {
    // Accelerate extension preserves the base PrismaClient interface
    return basePrisma.$extends(withAccelerate()) as unknown as ExtendedPrismaClient;
  }
  
  return basePrisma;
}

// FIXED: Always use singleton pattern to prevent connection exhaustion in serverless
// Use existing cached instance if available, otherwise create a new one
const prismadb = globalThis.cachedPrisma ?? createPrismaClient();

// Cache the instance globally to reuse across requests
// - In development: Preserves across hot reloads (module re-evaluation)
// - In production serverless: globalThis persists across warm invocations
globalThis.cachedPrisma = prismadb;

export { prismadb };
