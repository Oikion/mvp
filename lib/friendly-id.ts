import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Entity type to prefix mapping for friendly IDs
 * Format: prefix-NNNNNN (e.g., prp-000001, clt-000042)
 */
export const ENTITY_PREFIXES = {
  Properties: "prp",
  Clients: "clt",
  Mandates: "mnd",
  Users: "usr",
  Documents: "doc",
  crm_Accounts_Tasks: "tsk",
  Deal: "deal",
  Client_Contacts: "con",
  Property_Contacts: "pcon",
  CalendarEvent: "evt",
  Notification: "ntf",
  SocialPost: "post",
  // Messaging entities
  Channel: "chn",
  Conversation: "cnv",
  Message: "msg",
} as const;

export type EntityType = keyof typeof ENTITY_PREFIXES;

/** Sentinel value for entities that use a global (non-org-scoped) sequence */
const GLOBAL_ORG_ID = "__global__";

/** Core business entities with per-org friendly ID sequences */
const ORG_SCOPED_ENTITIES = new Set<EntityType>([
  "Properties", "Clients", "Mandates", "Documents",
  "crm_Accounts_Tasks", "Deal", "CalendarEvent",
]);

/**
 * Resolves the effective organizationId for sequence operations.
 * Org-scoped entities get per-org sequences; all others use the global sequence.
 */
function resolveOrgId(entityType: EntityType, organizationId?: string): string {
  if (!ORG_SCOPED_ENTITIES.has(entityType)) return GLOBAL_ORG_ID;
  if (!organizationId) {
    throw new Error(
      `generateFriendlyId: organizationId is required for entity type "${entityType}"`
    );
  }
  return organizationId;
}

/**
 * Validates if a string is a valid friendly ID format
 * @param id - The ID to validate
 * @returns boolean indicating if the ID matches the friendly format
 */
export function isFriendlyId(id: string): boolean {
  const prefixes = Object.values(ENTITY_PREFIXES);
  const pattern = new RegExp(String.raw`^(${prefixes.join("|")})-\d{6}$`);
  return pattern.test(id);
}

/**
 * Extracts the entity type from a friendly ID
 * @param id - The friendly ID
 * @returns The entity type or null if invalid
 */
export function getEntityTypeFromId(id: string): EntityType | null {
  if (!isFriendlyId(id)) return null;

  const prefix = id.split("-")[0];
  const entry = Object.entries(ENTITY_PREFIXES).find(([, p]) => p === prefix);
  return entry ? (entry[0] as EntityType) : null;
}

/**
 * Generates a friendly ID for a given entity type, scoped to an organization.
 * Uses atomic increment to prevent race conditions.
 *
 * @param prisma - Prisma client instance
 * @param entityType - The type of entity to generate an ID for
 * @param organizationId - The organization ID (required for org-scoped entities, ignored for Users)
 * @returns Promise<string> - The generated friendly ID (e.g., "prp-000001")
 */
export async function generateFriendlyId(
  prisma: PrismaClient | Prisma.TransactionClient,
  entityType: EntityType,
  organizationId?: string
): Promise<string> {
  const prefix = ENTITY_PREFIXES[entityType];
  const orgId = resolveOrgId(entityType, organizationId);
  const compositeId = `${prefix}:${orgId}`;

  // Use Prisma's standard upsert (Accelerate-compatible) instead of raw SQL.
  // The update atomically increments lastValue to prevent race conditions.
  const record = await (prisma as any).idSequence.upsert({
    where: {
      prefix_organizationId: { prefix, organizationId: orgId },
    },
    create: {
      id: compositeId,
      prefix,
      organizationId: orgId,
      lastValue: 1,
    },
    update: {
      lastValue: { increment: 1 },
    },
  });

  const lastValue = record.lastValue ?? 1;

  // Format: prefix-NNNNNN (6 digits, zero-padded)
  return `${prefix}-${String(lastValue).padStart(6, "0")}`;
}

/**
 * Generates multiple friendly IDs in a single transaction, scoped to an organization.
 * Useful for bulk imports.
 *
 * @param prisma - Prisma client instance
 * @param entityType - The type of entity
 * @param count - Number of IDs to generate
 * @param organizationId - The organization ID (required for org-scoped entities, ignored for Users)
 * @returns Promise<string[]> - Array of generated friendly IDs
 */
export async function generateFriendlyIds(
  prisma: PrismaClient,
  entityType: EntityType,
  count: number,
  organizationId?: string
): Promise<string[]> {
  const prefix = ENTITY_PREFIXES[entityType];
  const orgId = resolveOrgId(entityType, organizationId);
  const compositeId = `${prefix}:${orgId}`;

  // Use Prisma's standard upsert (Accelerate-compatible) instead of raw SQL.
  // Atomically increment by count to reserve a range of IDs.
  const record = await (prisma as any).idSequence.upsert({
    where: {
      prefix_organizationId: { prefix, organizationId: orgId },
    },
    create: {
      id: compositeId,
      prefix,
      organizationId: orgId,
      lastValue: count,
    },
    update: {
      lastValue: { increment: count },
    },
  });

  const endValue = record.lastValue ?? count;
  const startValue = endValue - count + 1;

  // Generate array of IDs
  const ids: string[] = [];
  for (let i = startValue; i <= endValue; i++) {
    ids.push(`${prefix}-${String(i).padStart(6, "0")}`);
  }

  return ids;
}

/**
 * Gets the current sequence value for an entity type without incrementing
 *
 * @param prisma - Prisma client instance
 * @param entityType - The type of entity
 * @param organizationId - The organization ID (required for org-scoped entities)
 * @returns Promise<number> - Current sequence value (0 if not initialized)
 */
export async function getCurrentSequenceValue(
  prisma: PrismaClient,
  entityType: EntityType,
  organizationId?: string
): Promise<number> {
  const prefix = ENTITY_PREFIXES[entityType];
  const orgId = resolveOrgId(entityType, organizationId);

  const record = await (prisma as any).idSequence.findUnique({
    where: {
      prefix_organizationId: { prefix, organizationId: orgId },
    },
    select: { lastValue: true },
  });

  return record?.lastValue ?? 0;
}

/**
 * Initializes or resets the sequence for an entity type
 * WARNING: Only use for migrations or testing
 *
 * @param prisma - Prisma client instance
 * @param entityType - The type of entity
 * @param startValue - The value to set (default: 0)
 * @param organizationId - The organization ID (required for org-scoped entities)
 */
export async function initializeSequence(
  prisma: PrismaClient,
  entityType: EntityType,
  startValue: number = 0,
  organizationId?: string
): Promise<void> {
  const prefix = ENTITY_PREFIXES[entityType];
  const orgId = resolveOrgId(entityType, organizationId);
  const compositeId = `${prefix}:${orgId}`;

  await (prisma as any).idSequence.upsert({
    where: {
      prefix_organizationId: { prefix, organizationId: orgId },
    },
    create: {
      id: compositeId,
      prefix,
      organizationId: orgId,
      lastValue: startValue,
    },
    update: {
      lastValue: startValue,
    },
  });
}
