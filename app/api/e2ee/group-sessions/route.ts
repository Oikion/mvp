import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getOrgMembersFromDb } from "@/lib/org-members";

/**
 * POST /api/e2ee/group-sessions — Create group session with shares
 *
 * Security (NC-2): Verifies the conversation/channel belongs to the caller's org
 * and all share recipients are org members.
 */
export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
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

    // NC-2: Verify the conversation/channel belongs to the caller's org
    if (conversationId) {
      const conv = await prismadb.conversation.findUnique({
        where: { id: conversationId },
        select: { organizationId: true },
      });
      if (!conv || conv.organizationId !== orgId) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    } else if (channelId) {
      const chan = await prismadb.channel.findUnique({
        where: { id: channelId },
        select: { organizationId: true },
      });
      if (!chan || chan.organizationId !== orgId) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 });
      }
    }

    // NC-2: Verify all share recipient userIds are members of this org
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
        data: shares.map((s: { userId: string; ephemeralPublicKey: string; encryptedSessionExport: string; iv: string; startingIndex: number }) => ({
          groupSessionId: newSession.id,
          userId: s.userId,
          encryptedSession: s.encryptedSessionExport,
          ephemeralPublicKey: s.ephemeralPublicKey,
          iv: s.iv,
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
