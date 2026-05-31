import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createEnvelope } from "@/actions/signing/create-envelope";
import { getEnvelopeForDocument } from "@/actions/signing/get-envelope";
import { z } from "zod";

const CreateEnvelopeSchema = z
  .object({
    subject: z.string().min(1).max(255),
    message: z.string().max(2000).optional(),
    expiresAt: z
      .string()
      .datetime()
      .optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    signers: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          email: z.string().email(),
          signerType: z.enum(["INTERNAL", "EXTERNAL"]),
          userId: z.string().uuid().optional(),
          order: z.number().int().min(1),
        }),
      )
      .min(1)
      .max(20),
  })
  .strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { documentId } = await params;

    const body = await request.json().catch(() => null);
    const parsed = CreateEnvelopeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const envelope = await createEnvelope({ documentId, ...parsed.data });
    if (!envelope) {
      return NextResponse.json(
        {
          error:
            "Failed to initiate signing. The document may not be a PDF, may already have an active signing request, or a server error occurred.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ envelopeId: envelope.id }, { status: 201 });
  } catch (error) {
    console.error("[DOCUMENT_SIGN_POST]", error);
    return NextResponse.json({ error: "Failed to initiate signing" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { documentId } = await params;
    const envelope = await getEnvelopeForDocument(documentId);

    if (!envelope) return NextResponse.json({ envelope: null });
    return NextResponse.json({ envelope });
  } catch (error) {
    console.error("[DOCUMENT_SIGN_GET]", error);
    return NextResponse.json({ error: "Failed to load signing status" }, { status: 500 });
  }
}
