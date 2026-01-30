import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// Type for the extended Prisma client (with or without Accelerate)
// This ensures type safety when accessing models like prismadb.properties
type ExtendedPrismaClient = PrismaClient;

declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var cachedPrisma: ExtendedPrismaClient;
}

function createPrismaClient(): ExtendedPrismaClient {
  const basePrisma = new PrismaClient();
  
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

let prisma: ExtendedPrismaClient;
if (process.env.NODE_ENV === "production") {
  prisma = createPrismaClient();
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = createPrismaClient();
  }
  prisma = global.cachedPrisma;
}

export const prismadb = prisma;
