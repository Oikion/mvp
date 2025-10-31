import { PrismaClient } from "@prisma/client";
import { PrismaClient as PrismaClientEdge } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var cachedPrisma: ReturnType<typeof createPrismaClient>;
}

function createPrismaClient() {
  // Check if DATABASE_URL uses Prisma Accelerate connection string
  // Accelerate URLs start with prisma:// or prisma+postgres://
  const databaseUrl = process.env.DATABASE_URL || "";
  const isAccelerateConnection = databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+postgres://");
  
  if (isAccelerateConnection) {
    // Use edge client for Accelerate as per Prisma's recommendation
    const basePrisma = new PrismaClientEdge();
    return basePrisma.$extends(withAccelerate()) as unknown as PrismaClient;
  }
  
  // Use regular client for non-Accelerate connections
  return new PrismaClient();
}

let prisma: ReturnType<typeof createPrismaClient>;
if (process.env.NODE_ENV === "production") {
  prisma = createPrismaClient();
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = createPrismaClient();
  }
  prisma = global.cachedPrisma;
}

export const prismadb = prisma;
