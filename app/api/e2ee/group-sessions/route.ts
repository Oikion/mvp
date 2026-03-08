import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

/**
 * POST /api/e2ee/group-sessions — Create group session with shares
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, channelId, shares } = body;

    if (!conversationId && !channelId) {
      return NextResponse.json({ error: "Must provide conversationId or channelId" }, { status: 400 });
    }
    if (!shares?.length) {
      return NextResponse.json({ error: "Must provide at least one share" }, { status: 400 });
    }

    // Find the next session index
    const lastSession = await prismadb.groupSession.findFirst({
      where: conversationId ? { conversationId } : { channelId },
      orderBy: { sessionIndex: "desc" },
      select: { sessionIndex: true },
    });
    const sessionIndex = (lastSession?.sessionIndex ?? -1) + 1;

    const session = await prismadb.$transaction(async (tx) => {
      // Deactivate previous sessions
      await tx.groupSession.updateMany({
        where: conversationId
          ? { conversationId, isActive: true }
          : { channelId, isActive: true },
        data: { isActive: false, rotatedAt: new Date() },
      });

      // Create new session
      const newSession = await tx.groupSession.create({
        data: {
          conversationId,
          channelId,
          creatorUserId: userId,
          sessionIndex,
        },
      });

      // Create shares
      await tx.groupSessionShare.createMany({
        data: shares.map((s: { userId: string; encryptedSession: string; startingIndex: number }) => ({
          groupSessionId: newSession.id,
          userId: s.userId,
          encryptedSession: s.encryptedSession,
          startingIndex: s.startingIndex,
        })),
      });

      return newSession;
    });

    return NextResponse.json({ id: session.id, sessionIndex });
  } catch (error) {
    console.error("[E2EE GroupSession POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
