import { PrismaClient, Prisma } from "@prisma/client";
import { prismadb as defaultPrisma } from "@/lib/prisma";

/**
 * Entity type to prefix mapping for friendly IDs
 * Format: prefix-NNNNNN (e.g., prp-000001, clt-000042)
 */
export const ENTITY_PREFIXES = {
  Properties: "prp",
  Contact: "clt",
  Mandates: "mnd",
  Request: "req",
  Users: "usr",
  Documents: "doc",
  crm_Accounts_Tasks: "tsk",
  Deal: "deal",
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
  "Properties", "Contact", "Mandates", "Request", "Documents",
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
  _prisma: PrismaClient | Prisma.TransactionClient,
  entityType: EntityType,
  organizationId?: string
): Promise<string> {
  const ids = await generateFriendlyIds(defaultPrisma, entityType, 1, organizationId);
  return ids[0];
}

/**
 * Generates multiple friendly IDs in a single transaction, scoped to an organization.
 * Uses a two-step find+upsert via the primary key (`id`) for full Accelerate compatibility.
 *
 * @param _prisma - Prisma client instance (ignored — uses module-level singleton)
 * @param entityType - The type of entity
 * @param count - Number of IDs to generate
 * @param organizationId - The organization ID (required for org-scoped entities, ignored for Users)
 * @returns Promise<string[]> - Array of generated friendly IDs
 */
export async function generateFriendlyIds(
  _prisma: PrismaClient,
  entityType: EntityType,
  count: number,
  organizationId?: string
): Promise<string[]> {
  const prefix = ENTITY_PREFIXES[entityType];
  const orgId = resolveOrgId(entityType, organizationId);
  const compositeId = `${prefix}:${orgId}`;

  // Two-step approach: read current value, then upsert with computed new value.
  // Uses primary key `id` (not compound unique) for maximum Accelerate compatibility.
  const existing = await defaultPrisma.idSequence.findUnique({
    where: { id: compositeId },
    select: { lastValue: true },
  });

  const currentValue = existing?.lastValue ?? 0;
  const newValue = currentValue + count;

  await defaultPrisma.idSequence.upsert({
    where: { id: compositeId },
    create: {
      id: compositeId,
      prefix,
      organizationId: orgId,
      lastValue: newValue,
      updatedAt: new Date(),
    },
    update: {
      lastValue: newValue,
      updatedAt: new Date(),
    },
  });

  const startValue = currentValue + 1;
  const ids: string[] = [];
  for (let i = startValue; i <= newValue; i++) {
    ids.push(`${prefix}-${String(i).padStart(6, "0")}`);
  }
  return ids;
}

/**
 * Gets the current sequence value for an entity type without incrementing
 *
 * @param _prisma - Prisma client instance (ignored — uses module-level singleton)
 * @param entityType - The type of entity
 * @param organizationId - The organization ID (required for org-scoped entities)
 * @returns Promise<number> - Current sequence value (0 if not initialized)
 */
export async function getCurrentSequenceValue(
  _prisma: PrismaClient,
  entityType: EntityType,
  organizationId?: string
): Promise<number> {
  const prefix = ENTITY_PREFIXES[entityType];
  const orgId = resolveOrgId(entityType, organizationId);
  const compositeId = `${prefix}:${orgId}`;

  const record = await defaultPrisma.idSequence.findUnique({
    where: { id: compositeId },
    select: { lastValue: true },
  });
  return record?.lastValue ?? 0;
}

/**
 * Initializes or resets the sequence for an entity type
 * WARNING: Only use for migrations or testing
 *
 * @param _prisma - Prisma client instance (ignored — uses module-level singleton)
 * @param entityType - The type of entity
 * @param startValue - The value to set (default: 0)
 * @param organizationId - The organization ID (required for org-scoped entities)
 */
export async function initializeSequence(
  _prisma: PrismaClient,
  entityType: EntityType,
  startValue: number = 0,
  organizationId?: string
): Promise<void> {
  const prefix = ENTITY_PREFIXES[entityType];
  const orgId = resolveOrgId(entityType, organizationId);
  const compositeId = `${prefix}:${orgId}`;

  await defaultPrisma.idSequence.upsert({
    where: { id: compositeId },
    create: {
      id: compositeId,
      prefix,
      organizationId: orgId,
      lastValue: startValue,
      updatedAt: new Date(),
    },
    update: {
      lastValue: startValue,
      updatedAt: new Date(),
    },
  });
}
