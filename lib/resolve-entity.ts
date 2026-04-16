import { prismadb } from "@/lib/prisma";

/**
 * Per-entity resolvers for looking up records by friendlyId.
 * All user-facing lookups (URL slugs, API params) use friendlyId,
 * which is org-scoped and non-nullable.
 */

export async function resolveProperty(
  friendlyId: string,
  organizationId: string
) {
  return prismadb.properties.findFirst({
    where: { friendlyId, organizationId },
  });
}

export async function resolveClient(
  friendlyId: string,
  organizationId: string
) {
  return prismadb.contact.findFirst({
    where: { friendlyId, organizationId },
  });
}

export async function resolveMandate(
  friendlyId: string,
  organizationId: string
) {
  return prismadb.mandate.findFirst({
    where: { friendlyId, organizationId },
  });
}

export async function resolveDocument(
  friendlyId: string,
  organizationId: string
) {
  return prismadb.documents.findFirst({
    where: { friendlyId, organizationId },
  });
}

export async function resolveTask(
  friendlyId: string,
  organizationId: string
) {
  return prismadb.crm_Accounts_Tasks.findFirst({
    where: { friendlyId, organizationId },
  });
}

export async function resolveDeal(
  friendlyId: string,
  organizationId: string
) {
  return prismadb.deal.findFirst({
    where: { friendlyId, organizationId },
  });
}

export async function resolveCalendarEvent(
  friendlyId: string,
  organizationId: string
) {
  return prismadb.calendarEvent.findFirst({
    where: { friendlyId, organizationId },
  });
}

/**
 * Resolve a property by friendlyId without org context.
 * Only for cross-org use cases (shared entities, public routes).
 */
export async function resolvePropertyGlobal(friendlyId: string) {
  return prismadb.properties.findFirst({
    where: { friendlyId },
  });
}
