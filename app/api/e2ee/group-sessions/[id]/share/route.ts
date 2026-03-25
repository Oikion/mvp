import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

/**
 * GET /api/e2ee/group-sessions/[id]/share — Get my encrypted share
 *
 * Security (NC-2): Verifies the session's conversation/channel belongs to the caller's org.
 * The compound unique (groupSessionId, userId) already restricts to the caller's own share,
 * but the org check prevents information leakage if a session ID from another org is guessed.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // NC-2: Fetch session with its conversation/channel to verify org ownership
    const session = await prismadb.groupSession.findUnique({
      where: { id },
      include: {
        conversation: { select: { organizationId: true } },
        channel: { select: { organizationId: true } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionOrgId = session.conversation?.organizationId ?? session.channel?.organizationId;
    if (sessionOrgId !== orgId) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

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
      // Field names match the GroupSessionShare type expected by decryptSessionExportFromShare()
      encryptedSessionExport: share.encryptedSession,
      ephemeralPublicKey: share.ephemeralPublicKey,
      iv: share.iv,
      startingIndex: share.startingIndex,
    });
  } catch (error) {
    console.error("[E2EE GroupSession Share]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
