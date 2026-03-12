"use server";

import { prismadb } from "@/lib/prisma";
import {
  actionSuccess,
  actionError,
  type ActionResponse,
} from "@/lib/action-response";
import { requireAction } from "@/lib/permissions/action-guards";
import { getCurrentOrgId } from "@/lib/get-current-user";
import type { DepartureLog } from "@prisma/client";

/**
 * List departure logs for the current organization.
 * Permission: admin:manage_org_settings (ORG_OWNER/ADMIN)
 */
export async function getDepartureLogs(): Promise<
  ActionResponse<DepartureLog[]>
> {
  const guard = await requireAction("admin:manage_org_settings");
  if (guard) return guard;

  const orgId = await getCurrentOrgId();

  try {
    const logs = await prismadb.departureLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    return actionSuccess(logs);
  } catch (error) {
    return actionError("Failed to fetch departure logs", error as Error);
  }
}

/**
 * Get a single departure log by ID.
 * Permission: admin:manage_org_settings (ORG_OWNER/ADMIN)
 */
export async function getDepartureLog(
  id: string
): Promise<ActionResponse<DepartureLog>> {
  const guard = await requireAction("admin:manage_org_settings");
  if (guard) return guard;

  const orgId = await getCurrentOrgId();

  try {
    const log = await prismadb.departureLog.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!log) {
      return actionError("Departure log not found", "NOT_FOUND");
    }

    return actionSuccess(log);
  } catch (error) {
    return actionError("Failed to fetch departure log", error as Error);
  }
}
