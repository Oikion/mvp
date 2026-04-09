import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { withAccelerate } from "@prisma/extension-accelerate";

// Models that support soft deletes (have a deletedAt field).
// Add model names here as they gain deletedAt support.
// Prisma passes model names in PascalCase (matching schema definition).
// Only include models that have a `deletedAt` field in the schema.
const SOFT_DELETE_MODELS: ReadonlySet<string> = new Set([
  "Contact",
  "Request",
  "Deal",
]);

// Prisma extension that auto-filters soft-deleted records.
// Only applies to models listed in SOFT_DELETE_MODELS.
// Use `{ where: { deletedAt: { not: null } } }` to explicitly query deleted records.
/**
 * Applies `deletedAt IS NULL` to queries on soft-delete-enabled models.
 * To query deleted records explicitly, pass `{ where: { deletedAt: { not: null } } }`.
 * Passing `deletedAt: undefined` in the where clause will NOT override the guard.
 */
function applySoftDeleteFilter(args: { where?: Record<string, unknown> }) {
  const callerWhere = args.where ?? {};
  const { deletedAt: callerDeletedAt, ...rest } = callerWhere;
  args.where = {
    ...rest,
    deletedAt: callerDeletedAt === undefined ? null : callerDeletedAt,
  };
}

const softDeleteExtension = Prisma.defineExtension({
  name: "softDelete",
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) applySoftDeleteFilter(args);
        return query(args);
      },
      async findFirst({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) applySoftDeleteFilter(args);
        return query(args);
      },
      async findFirstOrThrow({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) applySoftDeleteFilter(args);
        return query(args);
      },
      async findUnique({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) applySoftDeleteFilter(args);
        return query(args);
      },
      async findUniqueOrThrow({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) applySoftDeleteFilter(args);
        return query(args);
      },
      async count({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) applySoftDeleteFilter(args);
        return query(args);
      },
      async aggregate({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) applySoftDeleteFilter(args);
        return query(args);
      },
      async groupBy({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) applySoftDeleteFilter(args);
        return query(args);
      },
    },
  },
});

// Type for the extended Prisma client
type ExtendedPrismaClient = PrismaClient;

// Declare global type for caching across hot reloads and serverless invocations
declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var cachedPrisma: ExtendedPrismaClient | undefined;
}

function createPrismaClient(): ExtendedPrismaClient {
  // Prisma 7: the `datasource.url` field was removed from schema.prisma
  // (it now lives in prisma.config.ts for CLI operations). The runtime
  // client uses a driver adapter for direct Postgres connections, or the
  // Accelerate extension for `prisma://` / `prisma+postgres://` URLs.
  const databaseUrl = process.env.DATABASE_URL || "";
  const isAccelerateConnection =
    databaseUrl.startsWith("prisma://") ||
    databaseUrl.startsWith("prisma+postgres://");

  const logLevel: ("error" | "warn")[] =
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

  // For direct Postgres connections (plain `postgres://...`), Prisma 7
  // requires a driver adapter — the `client` engine cannot open a raw
  // connection on its own anymore. `PrismaPg` from `@prisma/adapter-pg`
  // wraps `node-postgres` and supplies the connection to the client.
  const basePrisma = isAccelerateConnection
    ? new PrismaClient({ accelerateUrl: databaseUrl, log: logLevel })
    : new PrismaClient({
        adapter: new PrismaPg(databaseUrl),
        log: logLevel,
      });

  // Add Accelerate extension only in production with Accelerate URLs
  const shouldUseAccelerate =
    process.env.NODE_ENV === "production" && isAccelerateConnection;

  if (shouldUseAccelerate) {
    return basePrisma
      .$extends(withAccelerate())
      .$extends(softDeleteExtension) as unknown as ExtendedPrismaClient;
  }

  return basePrisma.$extends(
    softDeleteExtension
  ) as unknown as ExtendedPrismaClient;
}

// Singleton pattern: reuse across hot reloads (dev) and warm invocations (prod serverless)
const prismadb = globalThis.cachedPrisma ?? createPrismaClient();
globalThis.cachedPrisma = prismadb;

export { prismadb };
