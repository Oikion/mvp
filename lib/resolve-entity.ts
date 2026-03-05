import { prismadb } from "@/lib/prisma";
import { isFriendlyId } from "@/lib/friendly-id";

/**
 * Builds a Prisma `where` clause that resolves either a friendlyId or UUID.
 * Use this anywhere a user-facing identifier (URL slug, API param) needs to
 * be turned into a database lookup scoped to an organization.
 *
 * - Friendly IDs (e.g. "prp-000001") → { friendlyId, organizationId }
 * - UUIDs / legacy PKs                → { id, organizationId }
 */
function resolveWhere(idOrFriendlyId: string, organizationId: string) {
  if (isFriendlyId(idOrFriendlyId)) {
    return { friendlyId: idOrFriendlyId, organizationId };
  }
  return { id: idOrFriendlyId, organizationId };
}

// ---------------------------------------------------------------------------
// Per-entity resolvers
// ---------------------------------------------------------------------------

export async function resolveProperty(
  idOrFriendlyId: string,
  organizationId: string
) {
  return prismadb.properties.findFirst({
    where: resolveWhere(idOrFriendlyId, organizationId),
  });
}

export async function resolveClient(
  idOrFriendlyId: string,
  organizationId: string
) {
  return prismadb.clients.findFirst({
    where: resolveWhere(idOrFriendlyId, organizationId),
  });
}

export async function resolveMandate(
  idOrFriendlyId: string,
  organizationId: string
) {
  return prismadb.mandate.findFirst({
    where: resolveWhere(idOrFriendlyId, organizationId),
  });
}

export async function resolveDocument(
  idOrFriendlyId: string,
  organizationId: string
) {
  return prismadb.documents.findFirst({
    where: resolveWhere(idOrFriendlyId, organizationId),
  });
}

export async function resolveTask(
  idOrFriendlyId: string,
  organizationId: string
) {
  return prismadb.crm_Accounts_Tasks.findFirst({
    where: resolveWhere(idOrFriendlyId, organizationId),
  });
}

export async function resolveDeal(
  idOrFriendlyId: string,
  organizationId: string
) {
  return prismadb.deal.findFirst({
    where: resolveWhere(idOrFriendlyId, organizationId),
  });
}

export async function resolveCalendarEvent(
  idOrFriendlyId: string,
  organizationId: string
) {
  return prismadb.calendarEvent.findFirst({
    where: resolveWhere(idOrFriendlyId, organizationId),
  });
}

/**
 * Resolve a property by friendlyId without org context.
 * Only for cross-org use cases (shared entities, public routes).
 */
export async function resolvePropertyGlobal(idOrFriendlyId: string) {
  if (isFriendlyId(idOrFriendlyId)) {
    return prismadb.properties.findFirst({
      where: { friendlyId: idOrFriendlyId },
    });
  }
  return prismadb.properties.findFirst({
    where: { id: idOrFriendlyId },
  });
}
