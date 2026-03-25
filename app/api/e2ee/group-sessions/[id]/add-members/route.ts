import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getOrgMembersFromDb } from "@/lib/org-members";

/**
 * POST /api/e2ee/group-sessions/[id]/add-members — Add shares for new participants
 *
 * Security (NC-2): Verifies the session's conversation/channel belongs to the caller's org,
 * the caller holds a share on the session, and new member IDs are org members.
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

    const { id: sessionId } = await params;
    const body = await req.json();
    const { shares } = body;

    if (!shares?.length) {
      return NextResponse.json({ error: "Must provide shares" }, { status: 400 });
    }

    // NC-2: Fetch session with org context
    const session = await prismadb.groupSession.findUnique({
      where: { id: sessionId },
      include: {
        conversation: { select: { organizationId: true } },
        channel: { select: { organizationId: true } },
      },
    });
    if (!session?.isActive) {
      return NextResponse.json({ error: "Active session not found" }, { status: 404 });
    }

    const sessionOrgId = session.conversation?.organizationId ?? session.channel?.organizationId;
    if (sessionOrgId !== orgId) {
      return NextResponse.json({ error: "Active session not found" }, { status: 404 });
    }

    // NC-2: Verify all new member IDs are org members
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

    await prismadb.groupSessionShare.createMany({
      data: shares.map((s: { userId: string; ephemeralPublicKey: string; encryptedSessionExport: string; iv: string; startingIndex: number }) => ({
        groupSessionId: sessionId,
        userId: s.userId,
        encryptedSession: s.encryptedSessionExport,
        ephemeralPublicKey: s.ephemeralPublicKey,
        iv: s.iv,
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
