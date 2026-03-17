import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { isE2EEOrg } from "@/lib/entity-session/encryption-mode";
import { createSessionShare } from "@/lib/entity-session/entity-session-service";

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
      where: { id: sessionId, orgId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Entity session not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { userId: recipientId, encryptedSession, startingIndex } = body;

    if (!recipientId || !encryptedSession || startingIndex === undefined) {
      return NextResponse.json(
        { error: "userId, encryptedSession, and startingIndex are required" },
        { status: 400 }
      );
    }

    const share = await createSessionShare({
      entitySessionId: sessionId,
      userId: recipientId,
      encryptedSession,
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
