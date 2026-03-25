import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getOrgMembersFromDb } from "@/lib/org-members";

/**
 * POST /api/e2ee/group-sessions/[id]/rotate — Rotate session
 * Creates a new session and marks the old one as inactive.
 *
 * Security (NC-2): Verifies the session's conversation/channel belongs to the caller's org,
 * the caller holds a share on the old session, and all new share recipients are org members.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: oldSessionId } = await params;
    const body = await req.json();
    const { shares } = body;

    if (!shares?.length) {
      return NextResponse.json({ error: "Must provide shares" }, { status: 400 });
    }

    // NC-2: Fetch old session with org context
    const oldSession = await prismadb.groupSession.findUnique({
      where: { id: oldSessionId },
      include: {
        conversation: { select: { organizationId: true } },
        channel: { select: { organizationId: true } },
      },
    });
    if (!oldSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionOrgId = oldSession.conversation?.organizationId ?? oldSession.channel?.organizationId;
    if (sessionOrgId !== orgId) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // NC-2: Verify all new share recipients are org members
    const orgMembers = await getOrgMembersFromDb({ organizationId: orgId });
    const memberClerkIds = new Set(orgMembers.clerkUserIds);
    for (const share of shares) {
      if (!share.userId || !memberClerkIds.has(share.userId)) {
        return NextResponse.json(
          { error: `User ${share.userId} is not a member of this organization` },
          { status: 403 }
        );
      }
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
        data: shares.map((s: { userId: string; ephemeralPublicKey: string; encryptedSessionExport: string; iv: string; startingIndex: number }) => ({
          groupSessionId: session.id,
          userId: s.userId,
          encryptedSession: s.encryptedSessionExport,
          ephemeralPublicKey: s.ephemeralPublicKey,
          iv: s.iv,
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
