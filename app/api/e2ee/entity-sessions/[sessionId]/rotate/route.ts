import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { isE2EEOrg } from "@/lib/entity-session/encryption-mode";
import { rotateEntitySession } from "@/lib/entity-session/entity-session-service";
import type { EntityType } from "@/lib/entity-session/types";
import { prismadb } from "@/lib/prisma";

/**
 * POST /api/e2ee/entity-sessions/[sessionId]/rotate
 * Rotate an entity session: deactivate old, create new with fresh shares.
 * Triggered by: access revocation, 100-message limit, admin manual rotation.
 * Body: { newMegolmSessionId, shares: [{ userId, encryptedSession }], orkBackup }
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

    // Verify session exists and belongs to org
    const currentSession = await prismadb.entitySession.findFirst({
      where: { id: sessionId, orgId, isActive: true },
    });

    if (!currentSession) {
      return NextResponse.json(
        { error: "Active entity session not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { newMegolmSessionId, shares, orkBackup } = body;

    if (!newMegolmSessionId || !shares?.length || !orkBackup) {
      return NextResponse.json(
        { error: "newMegolmSessionId, shares, and orkBackup are required" },
        { status: 400 }
      );
    }

    const newSession = await rotateEntitySession({
      entityType: currentSession.entityType as EntityType,
      entityId: currentSession.entityId,
      orgId,
      newMegolmSessionId,
      shares,
      orkBackup,
    });

    return NextResponse.json({
      session: newSession,
      rotatedFromVersion: currentSession.version,
    });
  } catch (error) {
    console.error("[ENTITY_SESSION_ROTATE_POST]", error);
    return NextResponse.json(
      { error: "Failed to rotate entity session" },
      { status: 500 }
    );
  }
}
