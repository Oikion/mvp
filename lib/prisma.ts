import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { withAccelerate } from "@prisma/extension-accelerate";

// Prisma 7 uses the "client" engine which requires a driver adapter or accelerateUrl.
type ExtendedPrismaClient = PrismaClient;

declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var cachedPrisma: ExtendedPrismaClient | undefined;
}

function createPrismaClient(): ExtendedPrismaClient {
  const databaseUrl = process.env.DATABASE_URL || "";
  const isAccelerateConnection =
    databaseUrl.startsWith("prisma://") ||
    databaseUrl.startsWith("prisma+postgres://");
  const shouldUseAccelerate =
    process.env.NODE_ENV === "production" && isAccelerateConnection;

  if (shouldUseAccelerate) {
    // Production + Accelerate: pass accelerateUrl, then apply the extension
    const base = new PrismaClient({
      log: ["error"],
      accelerateUrl: databaseUrl,
    } as ConstructorParameters<typeof PrismaClient>[0]);
    return base.$extends(withAccelerate()) as unknown as ExtendedPrismaClient;
  }

  // Development: use the pg driver adapter for a direct PostgreSQL connection
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
}

// FIXED: Always use singleton pattern to prevent connection exhaustion in serverless
// Use existing cached instance if available, otherwise create a new one
const prismadb = globalThis.cachedPrisma ?? createPrismaClient();

// Cache the instance globally to reuse across requests
// - In development: Preserves across hot reloads (module re-evaluation)
// - In production serverless: globalThis persists across warm invocations
globalThis.cachedPrisma = prismadb;

export { prismadb };
