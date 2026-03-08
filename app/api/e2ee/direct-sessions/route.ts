import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

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
    const { conversationId, responderUserId, initialMessage } = body;

    if (!conversationId || !responderUserId || !initialMessage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

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
