import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { put } from "@vercel/blob";
import { prismadb } from "@/lib/prisma";
import { openSignClient } from "@/lib/opensign/client";
import { verifyOpenSignWebhook } from "@/lib/opensign/webhook-verifier";
import { encryptDocumentForOrg, decryptDocumentForOrg } from "@/lib/model-encryption";
import { generateFriendlyId } from "@/lib/friendly-id";
import type { OpenSignWebhookPayload } from "@/lib/opensign/types";

// In-process IP rate limit: 30 webhook calls per minute per IP
const ipHits = new Map<string, { count: number; resetAt: number }>();

function checkWebhookRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || entry.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkWebhookRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = await request.text();
  const signature = request.headers.get("x-opensign-signature") ?? "";
  const timestamp = request.headers.get("x-opensign-timestamp") ?? "";

  let valid: boolean;
  try {
    valid = verifyOpenSignWebhook(body, signature, timestamp);
  } catch {
    console.error("[OPENSIGN_WEBHOOK] OPENSIGN_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (!valid) {
    console.error("[OPENSIGN_WEBHOOK] invalid signature or expired timestamp from IP:", ip);
    return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
  }

  // Guard against malformed JSON — a valid HMAC + bad JSON would otherwise throw and return 500,
  // causing OpenSign to retry indefinitely.
  let payload: OpenSignWebhookPayload;
  try {
    payload = JSON.parse(body) as OpenSignWebhookPayload;
  } catch {
    console.error("[OPENSIGN_WEBHOOK] malformed JSON body from IP:", ip);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const envelope = await prismadb.signingEnvelope.findUnique({
    where: { openSignEnvelopeId: payload.envelopeId },
    include: { signers: true, sourceDocument: true },
  });

  if (!envelope) {
    // Unknown envelope — return 200 to prevent OpenSign retry storm
    console.error("[OPENSIGN_WEBHOOK] unknown envelopeId:", payload.envelopeId);
    return NextResponse.json({ received: true });
  }

  // Tenant guard: verify the per-org HMAC token in the query param.
  // Both orgToken and expectedToken are hex strings — decode to raw bytes before
  // comparing (same rationale as verifyOpenSignWebhook — avoids ASCII-vs-bytes mismatch).
  const orgToken = request.nextUrl.searchParams.get("org") ?? "";
  const expectedToken = createHmac("sha256", process.env.OPENSIGN_WEBHOOK_SECRET!)
    .update(envelope.organizationId)
    .digest("hex");
  const orgBuf = Buffer.from(orgToken, "hex");
  const expBuf = Buffer.from(expectedToken, "hex");
  if (orgBuf.length !== expBuf.length || !timingSafeEqual(orgBuf, expBuf)) {
    console.error("[OPENSIGN_WEBHOOK] org token mismatch for envelopeId:", envelope.id);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Step 0 (all statuses): hydrate openSignSignerId on signers from webhook payload.
  // openSignSignerId is null at row-creation time when createEnvelope response includes no signers.
  // This must run before any status-specific logic that matches on openSignSignerId.
  if (payload.signers && payload.signers.length > 0) {
    for (let i = 0; i < payload.signers.length; i++) {
      const s = payload.signers[i];
      if (s.signerId) {
        await prismadb.signingEnvelopeSigner
          .updateMany({
            where: { envelopeId: envelope.id, order: i + 1, openSignSignerId: null },
            data: { openSignSignerId: s.signerId },
          })
          .catch(() => {
            // Non-fatal — the ID may already be set from a previous webhook delivery
          });
      }
    }
  }

  if (payload.status === "completed") {
    try {
      const signedPdfBuffer = await openSignClient.getSignedDocument(payload.envelopeId);

      const { document_name: decryptedName } = await decryptDocumentForOrg(
        { document_name: envelope.sourceDocument.document_name },
        envelope.organizationId,
      );

      const blob = await put(
        `documents/signed-${envelope.id}.pdf`,
        signedPdfBuffer,
        { access: "private" },
      );

      const { document_name: encryptedName } = await encryptDocumentForOrg(
        { document_name: `${decryptedName ?? "Document"} — Signed`, description: null },
        envelope.organizationId,
      );

      const src = envelope.sourceDocument;
      const friendlyId = await generateFriendlyId(prismadb, "Documents", envelope.organizationId);

      await prismadb.$transaction(async (tx) => {
        const signedDocument = await tx.documents.create({
          data: {
            organizationId: envelope.organizationId,
            document_name: encryptedName,
            description: null,
            document_file_url: blob.url,
            document_file_mimeType: "application/pdf",
            document_system_type: "CONTRACT",
            size: signedPdfBuffer.byteLength,
            linkedPropertiesIds: src.linkedPropertiesIds,
            contactsIDs: src.contactsIDs,
            linkedCalendarEventsIds: src.linkedCalendarEventsIds,
            linkedTasksIds: src.linkedTasksIds,
            linkedMandatesIds: src.linkedMandatesIds,
            tags: src.tags ?? undefined,
            friendlyId,
          },
        });

        await tx.signingEnvelope.update({
          where: { id: envelope.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            signedDocumentId: signedDocument.id,
          },
        });

        await tx.signingEnvelopeSigner.updateMany({
          where: { envelopeId: envelope.id },
          data: { status: "SIGNED", signedAt: new Date() },
        });
      });

      console.log("[OPENSIGN_WEBHOOK] completed envelopeId:", envelope.id);
    } catch (err) {
      console.error(
        "[OPENSIGN_WEBHOOK] completion processing failed for envelopeId:",
        envelope.id,
        "error type:", (err as Error)?.constructor?.name,
      );
      // Return 200 to prevent retry storm; envelope stays IN_PROGRESS for manual remediation
    }
  } else if (payload.status === "declined" || payload.status === "expired") {
    const newStatus = payload.status === "declined" ? "DECLINED" : "EXPIRED";
    await prismadb.signingEnvelope.update({
      where: { id: envelope.id },
      data: { status: newStatus },
    });

    if (payload.status === "declined" && payload.signers) {
      for (const s of payload.signers) {
        if (s.status === "declined" && s.signerId) {
          await prismadb.signingEnvelopeSigner.updateMany({
            where: { envelopeId: envelope.id, openSignSignerId: s.signerId },
            data: { status: "DECLINED" },
          });
        }
      }
    }

    console.log("[OPENSIGN_WEBHOOK]", newStatus.toLowerCase(), "envelopeId:", envelope.id);
  }

  return NextResponse.json({ received: true });
}
