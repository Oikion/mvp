import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

/**
 * GET /api/e2ee/group-sessions/[id]/share — Get my encrypted share
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const share = await prismadb.groupSessionShare.findUnique({
      where: {
        groupSessionId_userId: {
          groupSessionId: id,
          userId,
        },
      },
    });

    if (!share) {
      return NextResponse.json({ error: "No share found" }, { status: 404 });
    }

    return NextResponse.json({
      encryptedSession: share.encryptedSession,
      startingIndex: share.startingIndex,
    });
  } catch (error) {
    console.error("[E2EE GroupSession Share]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
