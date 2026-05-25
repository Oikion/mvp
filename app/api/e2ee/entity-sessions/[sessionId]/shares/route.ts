import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { isE2EEOrg } from "@/lib/entity-session/encryption-mode";
import { createSessionShare } from "@/lib/entity-session/entity-session-service";
import { getOrgMembersFromDb } from "@/lib/org-members";
import { z } from "zod";

const AddShareSchema = z.object({
  userId: z.string().min(1),
  encryptedSession: z.string().min(1).max(65536),
  ephemeralPublicKey: z.string().min(1),
  iv: z.string().min(1),
  startingIndex: z.number().int().min(0).default(0),
}).strict();

/**
 * POST /api/e2ee/entity-sessions/[sessionId]/shares
 * Create a share for a user (granting access to entity E2EE comments).
 * Called by the granting user's browser with the session encrypted for the recipient's public key.
 * Body: { userId, encryptedSession, startingIndex }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const orgId = await getCurrentOrgId();
    const { sessionId } = await params;

    if (!(await isE2EEOrg(orgId))) {
      return NextResponse.json(
        { error: "Entity sessions are only available for E2EE organizations" },
        { status: 400 }
      );
    }

    // Verify the session exists and belongs to the user's org
    const session = await prismadb.entitySession.findFirst({
      where: { id: sessionId, orgId, isActive: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Entity session not found" },
        { status: 404 }
      );
    }

    // Verify caller holds a share on this session (only share holders can grant access)
    const callerShare = await prismadb.entitySessionShare.findFirst({
      where: { entitySessionId: sessionId, userId: user.id },
      select: { id: true },
    });
    if (!callerShare) {
      return NextResponse.json(
        { error: "You do not have access to this session" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsedBody = AddShareSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { userId: recipientId, encryptedSession, ephemeralPublicKey, iv, startingIndex } = parsedBody.data;

    // Verify recipientId is a member of the session's org (C1: prevent cross-org share injection)
    const orgMembers = await getOrgMembersFromDb({ organizationId: session.orgId });
    const isMember = orgMembers.users.some((u: any) => u.id === recipientId);
    if (!isMember) {
      return NextResponse.json(
        { error: "Recipient is not a member of this organization" },
        { status: 403 }
      );
    }

    const share = await createSessionShare({
      entitySessionId: sessionId,
      userId: recipientId,
      encryptedSession,
      ephemeralPublicKey,
      iv,
      startingIndex,
    });

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    console.error("[ENTITY_SESSION_SHARES_POST]", error);
    return NextResponse.json(
      { error: "Failed to create session share" },
      { status: 500 }
    );
  }
}
