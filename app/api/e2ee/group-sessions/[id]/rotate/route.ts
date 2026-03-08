import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

/**
 * POST /api/e2ee/group-sessions/[id]/rotate — Rotate session
 * Creates a new session and marks the old one as inactive
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: oldSessionId } = await params;
    const body = await req.json();
    const { shares } = body;

    if (!shares?.length) {
      return NextResponse.json({ error: "Must provide shares" }, { status: 400 });
    }

    const oldSession = await prismadb.groupSession.findUnique({
      where: { id: oldSessionId },
    });
    if (!oldSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const newSession = await prismadb.$transaction(async (tx) => {
      // Deactivate old session
      await tx.groupSession.update({
        where: { id: oldSessionId },
        data: { isActive: false, rotatedAt: new Date() },
      });

      // Create new session
      const session = await tx.groupSession.create({
        data: {
          conversationId: oldSession.conversationId,
          channelId: oldSession.channelId,
          creatorUserId: userId,
          sessionIndex: oldSession.sessionIndex + 1,
        },
      });

      // Create shares
      await tx.groupSessionShare.createMany({
        data: shares.map((s: { userId: string; encryptedSession: string; startingIndex: number }) => ({
          groupSessionId: session.id,
          userId: s.userId,
          encryptedSession: s.encryptedSession,
          startingIndex: s.startingIndex,
        })),
      });

      return session;
    });

    return NextResponse.json({ id: newSession.id, sessionIndex: newSession.sessionIndex });
  } catch (error) {
    console.error("[E2EE GroupSession Rotate]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
