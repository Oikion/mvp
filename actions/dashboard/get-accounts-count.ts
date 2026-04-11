"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";

export async function getAccountsCount(): Promise<ActionResponse<{ count: number }>> {
  const guard = await requireAction("contact:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  try {
    const count = await prismadb.contact.count({ where: { organizationId } });
    return actionSuccess({ count });
  } catch (error) {
    console.error("[GET_CONTACTS_COUNT]", error);
    return actionError("Failed to count contacts", error as Error);
  }
}
