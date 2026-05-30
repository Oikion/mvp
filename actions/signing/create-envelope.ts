"use server";

import { createHmac } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { openSignClient } from "@/lib/opensign/client";
import { encryptSigningEnvelopeSignerForOrg } from "@/lib/model-encryption";
import type { SignerType } from "@prisma/client";

export interface CreateEnvelopeInput {
  documentId: string;
  subject: string;
  message?: string;
  expiresAt?: Date;
  signers: {
    name: string;
    email: string;
    signerType: "INTERNAL" | "EXTERNAL";
    userId?: string;
    order: number;
  }[];
}

const ACTIVE_STATUSES: ("DRAFT" | "SENT" | "IN_PROGRESS")[] = ["DRAFT", "SENT", "IN_PROGRESS"];

export async function createEnvelope(input: CreateEnvelopeInput) {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return null;

  const guard = await requireAction("signing:create_envelope");
  if (guard) return null;

  // Validate document exists, belongs to org, is PDF
  const document = await prismadb.documents.findFirst({
    where: { id: input.documentId, organizationId },
  });
  if (!document) return null;
  if (document.document_file_mimeType !== "application/pdf") return null;

  // Enforce one active envelope per document (scoped to org to prevent cross-tenant bypass)
  const existing = await prismadb.signingEnvelope.findFirst({
    where: {
      sourceDocumentId: input.documentId,
      organizationId,
      status: { in: ACTIVE_STATUSES },
    },
  });
  if (existing) return null;

  // Fetch PDF from Vercel Blob
  const blobRes = await fetch(document.document_file_url);
  if (!blobRes.ok) {
    console.error("[SIGNING] failed to fetch document blob for documentId:", input.documentId);
    return null;
  }
  const buffer = Buffer.from(await blobRes.arrayBuffer());
  const fileName = `${input.documentId}.pdf`;

  // Build per-org callback token (HMAC of orgId with webhook secret).
  // Guard first — falling back to "" silently disables webhook auth.
  if (!process.env.OPENSIGN_WEBHOOK_SECRET) {
    console.error("[SIGNING] OPENSIGN_WEBHOOK_SECRET is not set — aborting envelope creation");
    return null;
  }
  const orgToken = createHmac("sha256", process.env.OPENSIGN_WEBHOOK_SECRET)
    .update(organizationId)
    .digest("hex");
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/opensign?org=${orgToken}`;

  // Upload to OpenSign
  let openSignFileId: string;
  let openSignEnvelopeId: string;
  // signerIdMap: order → OpenSign-assigned signerId (populated if API returns them)
  let signerIdMap: Record<number, string> = {};
  try {
    const { fileId } = await openSignClient.uploadDocument(buffer, fileName);
    openSignFileId = fileId;

    const openSignRes = await openSignClient.createEnvelope({
      documentFileId: openSignFileId,
      signers: input.signers.map((s) => ({
        name: s.name,
        email: s.email,
        order: s.order,
      })),
      subject: input.subject,
      message: input.message,
      expiryDays: input.expiresAt
        ? Math.ceil((input.expiresAt.getTime() - Date.now()) / 86_400_000)
        : undefined,
      callbackUrl,
    });
    openSignEnvelopeId = openSignRes.envelopeId;

    // Populate signer IDs eagerly if the API returns them (avoids null-lookup bug at webhook time)
    if (openSignRes.signers) {
      for (const s of openSignRes.signers) {
        if (s.signerId && s.order) signerIdMap[s.order] = s.signerId;
      }
    }
  } catch (err) {
    console.error("[SIGNING] opensign API call failed:", err);
    return null;
  }

  // Encrypt signer PII and persist
  try {
    const encryptedSigners = await Promise.all(
      input.signers.map((s) =>
        encryptSigningEnvelopeSignerForOrg({ name: s.name, email: s.email }, organizationId).then(
          (enc) => ({ ...s, name: enc.name, email: enc.email }),
        ),
      ),
    );

    const envelope = await prismadb.signingEnvelope.create({
      data: {
        organizationId,
        sourceDocumentId: input.documentId,
        openSignEnvelopeId,
        openSignFileId,
        status: "SENT",
        subject: input.subject,
        message: input.message ?? null,
        expiresAt: input.expiresAt ?? null,
        signers: {
          create: encryptedSigners.map((s) => ({
            signerType: s.signerType as SignerType,
            userId: s.userId ?? null,
            name: s.name,
            email: s.email,
            order: s.order,
            status: "PENDING",
            // Eagerly set if API returned signer IDs; webhook Step 0 handles any gaps
            openSignSignerId: signerIdMap[s.order] ?? null,
          })),
        },
      },
    });
    return envelope;
  } catch (err) {
    // OpenSign succeeded but our DB write failed — attempt best-effort cancellation
    // so the envelope doesn't remain active in OpenSign with no corresponding DB record.
    console.error("[SIGNING] DB write failed after opensign envelope creation:", err);
    try {
      await openSignClient.cancelEnvelope(openSignEnvelopeId);
    } catch (cancelErr) {
      console.error("[SIGNING] compensation cancel also failed for openSignEnvelopeId:", openSignEnvelopeId, cancelErr);
    }
    return null;
  }
}
