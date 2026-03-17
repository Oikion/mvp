import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { isE2EEOrg } from "@/lib/entity-session/encryption-mode";
import {
  createEntitySession,
  getEntitySessionShareForUser,
} from "@/lib/entity-session/entity-session-service";
import type { EntityType } from "@/lib/entity-session/types";

const VALID_ENTITY_TYPES = new Set(["CLIENT", "PROPERTY", "MANDATE", "TASK"]);

/**
 * GET /api/e2ee/entity-sessions?entityType=CLIENT&entityId=xxx
 * Get the active session + user's share for an entity.
 * Returns null fields if no session exists (lazy initialization).
 */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const orgId = await getCurrentOrgId();

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType") as EntityType;
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId || !VALID_ENTITY_TYPES.has(entityType)) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    if (!(await isE2EEOrg(orgId))) {
      return NextResponse.json(
        { error: "Entity sessions are only available for E2EE organizations" },
        { status: 400 }
      );
    }

    const result = await getEntitySessionShareForUser(
      entityType,
      entityId,
      user.id
    );

    if (!result) {
      return NextResponse.json({
        session: null,
        share: null,
      });
    }

    return NextResponse.json({
      session: {
        id: result.id,
        megolmSessionId: result.megolmSessionId,
        version: result.version,
        entityType: result.entityType,
        entityId: result.entityId,
      },
      share: {
        id: result.share.id,
        encryptedSession: result.share.encryptedSession,
        startingIndex: result.share.startingIndex,
      },
    });
  } catch (error) {
    console.error("[ENTITY_SESSIONS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch entity session" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/e2ee/entity-sessions
 * Create a new entity session (called by browser after entity creation or first comment).
 * Body: { entityType, entityId, megolmSessionId, creatorEncryptedSession, orkBackup, additionalShares? }
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const orgId = await getCurrentOrgId();

    if (!(await isE2EEOrg(orgId))) {
      return NextResponse.json(
        { error: "Entity sessions are only available for E2EE organizations" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      entityType,
      entityId,
      megolmSessionId,
      creatorEncryptedSession,
      orkBackup,
      additionalShares,
    } = body;

    if (
      !entityType ||
      !entityId ||
      !megolmSessionId ||
      !creatorEncryptedSession ||
      !orkBackup
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!VALID_ENTITY_TYPES.has(entityType)) {
      return NextResponse.json(
        { error: "Invalid entity type" },
        { status: 400 }
      );
    }

    // Guard: reject if an active session already exists (prevents race condition duplicates)
    const existing = await prismadb.entitySession.findFirst({
      where: { entityType, entityId, isActive: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Active session already exists for this entity", sessionId: existing.id },
        { status: 409 }
      );
    }

    const session = await createEntitySession({
      entityType,
      entityId,
      orgId,
      megolmSessionId,
      creatorShare: {
        userId: user.id,
        encryptedSession: creatorEncryptedSession,
      },
      orkBackup,
      additionalShares,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("[ENTITY_SESSIONS_POST]", error);
    return NextResponse.json(
      { error: "Failed to create entity session" },
      { status: 500 }
    );
  }
}
