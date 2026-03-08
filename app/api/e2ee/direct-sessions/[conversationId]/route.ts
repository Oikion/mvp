import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

/**
 * GET /api/e2ee/direct-sessions/[conversationId] — Fetch initial message for responder
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;

    const session = await prismadb.directSession.findUnique({
      where: { conversationId },
    });

    if (!session) {
      return NextResponse.json({ error: "No direct session found" }, { status: 404 });
    }

    // Only initiator or responder can fetch
    if (session.initiatorUserId !== userId && session.responderUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      id: session.id,
      initiatorUserId: session.initiatorUserId,
      responderUserId: session.responderUserId,
      initialMessage: JSON.parse(session.initialMessage),
      isEstablished: session.isEstablished,
    });
  } catch (error) {
    console.error("[E2EE DirectSession GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * PUT /api/e2ee/direct-sessions/[conversationId] — Mark session as established
 */
export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;

    const session = await prismadb.directSession.findUnique({
      where: { conversationId },
    });

    if (!session || session.responderUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prismadb.directSession.update({
      where: { conversationId },
      data: { isEstablished: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[E2EE DirectSession PUT]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
