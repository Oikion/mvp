import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

/**
 * POST /api/e2ee/group-sessions/[id]/add-members — Add shares for new participants
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

    const { id: sessionId } = await params;
    const body = await req.json();
    const { shares } = body;

    if (!shares?.length) {
      return NextResponse.json({ error: "Must provide shares" }, { status: 400 });
    }

    const session = await prismadb.groupSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || !session.isActive) {
      return NextResponse.json({ error: "Active session not found" }, { status: 404 });
    }

    await prismadb.groupSessionShare.createMany({
      data: shares.map((s: { userId: string; encryptedSession: string; startingIndex: number }) => ({
        groupSessionId: sessionId,
        userId: s.userId,
        encryptedSession: s.encryptedSession,
        startingIndex: s.startingIndex,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ added: shares.length });
  } catch (error) {
    console.error("[E2EE GroupSession AddMembers]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
