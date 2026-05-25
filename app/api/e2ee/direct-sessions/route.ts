import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { z } from "zod";

const DirectSessionSchema = z.object({
  conversationId: z.string().uuid(),
  responderUserId: z.string().min(1).max(255),
  initialMessage: z.string().min(1).max(65536),
}).strict();

/**
 * POST /api/e2ee/direct-sessions — Store X3DH initial message
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = DirectSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { conversationId, responderUserId, initialMessage } = parsed.data;

    const session = await prismadb.directSession.create({
      data: {
        conversationId,
        initiatorUserId: userId,
        responderUserId,
        initialMessage: JSON.stringify(initialMessage),
      },
    });

    return NextResponse.json({ id: session.id });
  } catch (error) {
    console.error("[E2EE DirectSession POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
