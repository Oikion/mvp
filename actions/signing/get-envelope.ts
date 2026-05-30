"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptSigningEnvelopeSignerForOrg } from "@/lib/model-encryption";

export async function getEnvelopeForDocument(documentId: string) {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return null;

  const guard = await requireAction("signing:read_envelope");
  if (guard) return null;

  const envelope = await prismadb.signingEnvelope.findFirst({
    where: { sourceDocumentId: documentId, organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      signers: { orderBy: { order: "asc" } },
      signedDocument: { select: { id: true, friendlyId: true } },
      createdByUser: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!envelope) return null;

  // Decrypt signer PII
  const decryptedSigners = await Promise.all(
    envelope.signers.map((s) =>
      decryptSigningEnvelopeSignerForOrg({ name: s.name, email: s.email }, organizationId).then(
        (dec) => ({ ...s, name: dec.name, email: dec.email }),
      ),
    ),
  );

  return { ...envelope, signers: decryptedSigners };
}
