import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

/**
 * GET /api/e2ee/group-sessions/active?conversationId= or ?channelId=
 * Returns the active session for the given conversation or channel
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const channelId = searchParams.get("channelId");

    if (!conversationId && !channelId) {
      return NextResponse.json({ error: "Must provide conversationId or channelId" }, { status: 400 });
    }

    const session = await prismadb.groupSession.findFirst({
      where: {
        ...(conversationId ? { conversationId } : { channelId }),
        isActive: true,
      },
      include: {
        shares: {
          where: { userId },
          select: {
            encryptedSession: true,
            startingIndex: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        sessionIndex: session.sessionIndex,
        messageCount: session.messageCount,
        maxMessages: session.maxMessages,
        myShare: session.shares[0] ?? null,
      },
    });
  } catch (error) {
    console.error("[E2EE GroupSession Active]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
