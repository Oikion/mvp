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

/** Sentinel value for entities that are not org-scoped (e.g., Users) */
const GLOBAL_ORG_ID = "__global__";

/** Entity types that use a global (non-org-scoped) sequence */
const GLOBAL_ENTITIES: Set<EntityType> = new Set<EntityType>(["Users"]);

/**
 * Resolves the effective organizationId for sequence operations.
 * Global entities always use "__global__". Org-scoped entities require an organizationId.
 */
function resolveOrgId(entityType: EntityType, organizationId?: string): string {
  if (GLOBAL_ENTITIES.has(entityType)) return GLOBAL_ORG_ID;
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

  // Use raw SQL for atomic upsert + increment to prevent race conditions
  // ON CONFLICT targets the compound unique (prefix, organizationId)
  const result = await (prisma as PrismaClient).$queryRaw<Array<{ lastValue: number }>>`
    INSERT INTO "IdSequence" (id, prefix, "organizationId", "lastValue", "updatedAt")
    VALUES (${compositeId}, ${prefix}, ${orgId}, 1, NOW())
    ON CONFLICT (prefix, "organizationId")
    DO UPDATE SET
      "lastValue" = "IdSequence"."lastValue" + 1,
      "updatedAt" = NOW()
    RETURNING "lastValue"
  `;

  const lastValue = result[0]?.lastValue ?? 1;

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

  // Atomically increment by count and get the new value
  const result = await prisma.$queryRaw<Array<{ lastValue: number }>>`
    INSERT INTO "IdSequence" (id, prefix, "organizationId", "lastValue", "updatedAt")
    VALUES (${compositeId}, ${prefix}, ${orgId}, ${count}, NOW())
    ON CONFLICT (prefix, "organizationId")
    DO UPDATE SET
      "lastValue" = "IdSequence"."lastValue" + ${count},
      "updatedAt" = NOW()
    RETURNING "lastValue"
  `;

  const endValue = result[0]?.lastValue ?? count;
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

  const sequence = await prisma.idSequence.findFirst({
    where: { prefix },
    select: { lastValue: true },
  });

  return sequence?.lastValue ?? 0;
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

  await prisma.idSequence.upsert({
    where: { prefix },
    update: { lastValue: startValue },
    create: {
      id: compositeId,
      prefix,
      lastValue: startValue,
      updatedAt: new Date(),
    },
  });
}
