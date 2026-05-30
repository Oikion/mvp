"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { openSignClient } from "@/lib/opensign/client";

export async function cancelEnvelope(envelopeId: string) {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return null;

  const guard = await requireAction("signing:cancel_envelope");
  if (guard) return null;

  const envelope = await prismadb.signingEnvelope.findFirst({
    where: { id: envelopeId, organizationId },
  });
  if (!envelope) return null;
  if (!["SENT", "IN_PROGRESS"].includes(envelope.status)) return null;

  try {
    await openSignClient.cancelEnvelope(envelope.openSignEnvelopeId);
  } catch (err) {
    console.error("[SIGNING] opensign cancel failed for envelopeId:", envelopeId, err);
    return null;
  }

  return prismadb.signingEnvelope.update({
    where: { id: envelopeId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
}
