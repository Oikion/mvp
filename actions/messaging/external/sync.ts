"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { actionError, actionSuccess, type ActionResponse } from "@/lib/action-response";

export async function syncExternalContacts(
  integrationId: string
): Promise<ActionResponse<void>> {
  const guard = await requireAction("messaging:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  try {
    const integration = await prismadb.messagingIntegration.findFirst({
      where: { id: integrationId, organizationId },
    });

    if (!integration) {
      return actionError("Integration not found", "NOT_FOUND");
    }

    // TODO: Implement platform-specific contact sync.
    await prismadb.messagingIntegration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date() },
    });

    return actionSuccess();
  } catch (error) {
    console.error("[EXTERNAL_CONTACT_SYNC]", error);
    return actionError("Failed to sync external contacts");
  }
}
