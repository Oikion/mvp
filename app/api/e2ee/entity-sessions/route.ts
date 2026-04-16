// @ts-nocheck
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { isE2EEOrg } from "@/lib/entity-session/encryption-mode";
import {
  createEntitySession,
  getEntitySessionShareForUser,
  EntitySessionExistsError,
} from "@/lib/entity-session/entity-session-service";
import { getOrgMembersFromDb } from "@/lib/org-members";
import type { EntityType } from "@/lib/entity-session/types";

const VALID_ENTITY_TYPES = new Set(["CLIENT", "PROPERTY", "MANDATE", "TASK"]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    // NEW-C6: Verify caller has access to the underlying entity
    switch (entityType) {
      case "CLIENT": {
        const entity = await prismadb.clients.findFirst({
          where: { id: entityId, organizationId: orgId },
          select: { id: true },
        });
        if (!entity)
          return NextResponse.json(
            { error: "Entity not found" },
            { status: 404 }
          );
        break;
      }
      case "PROPERTY": {
        const entity = await prismadb.properties.findFirst({
          where: { id: entityId, organizationId: orgId },
          select: { id: true },
        });
        if (!entity)
          return NextResponse.json(
            { error: "Entity not found" },
            { status: 404 }
          );
        break;
      }
      case "MANDATE": {
        const entity = await prismadb.mandate.findFirst({
          where: { id: entityId, organizationId: orgId },
          select: { id: true },
        });
        if (!entity)
          return NextResponse.json(
            { error: "Entity not found" },
            { status: 404 }
          );
        break;
      }
      case "TASK": {
        const entity = await prismadb.crm_Accounts_Tasks.findFirst({
          where: { id: entityId, organizationId: orgId },
          select: { id: true },
        });
        if (!entity)
          return NextResponse.json(
            { error: "Entity not found" },
            { status: 404 }
          );
        break;
      }
    }

    const result = await getEntitySessionShareForUser(
      entityType,
      entityId,
      user.id,
      orgId
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
        encryptedSessionExport: result.share.encryptedSession,
        ephemeralPublicKey: result.share.ephemeralPublicKey,
        iv: result.share.iv,
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
 * Body: { entityType, entityId, megolmSessionId, creatorShare, orkBackup, additionalShares? }
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
      creatorShare,
      orkBackup,
      additionalShares,
    } = body;

    if (
      !entityType ||
      !entityId ||
      !megolmSessionId ||
      !creatorShare?.encryptedSession ||
      !orkBackup
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // NH-4: Require ECIES fields on creator share — without ephemeralPublicKey and iv,
    // recipients cannot ECIES-decrypt the session export, creating an undecryptable session.
    if (!creatorShare.ephemeralPublicKey || !creatorShare.iv) {
      return NextResponse.json(
        { error: "creatorShare must include ephemeralPublicKey and iv (ECIES fields)" },
        { status: 400 }
      );
    }

    if (!VALID_ENTITY_TYPES.has(entityType)) {
      return NextResponse.json(
        { error: "Invalid entity type" },
        { status: 400 }
      );
    }

    // NEW-C5: Assert creatorShare.userId matches the authenticated caller
    if (!creatorShare || creatorShare.userId !== user.id) {
      return NextResponse.json(
        { error: "creatorShare.userId must match the authenticated caller" },
        { status: 403 }
      );
    }

    // NEW-I8: UUID format validation on entityId
    if (!UUID_RE.test(entityId)) {
      return NextResponse.json({ error: "Invalid entityId" }, { status: 400 });
    }

    // Max-length guards on encrypted blobs
    if (creatorShare.encryptedSession.length > 65536) {
      return NextResponse.json(
        { error: "encryptedSession too large" },
        { status: 400 }
      );
    }
    if (orkBackup && orkBackup.length > 65536) {
      return NextResponse.json(
        { error: "orkBackup too large" },
        { status: 400 }
      );
    }

    // I3: Validate additionalShares recipients are org members
    if (additionalShares !== undefined) {
      if (
        !Array.isArray(additionalShares) ||
        additionalShares.length > 100
      ) {
        return NextResponse.json(
          {
            error:
              "additionalShares must be an array of at most 100 items",
          },
          { status: 400 }
        );
      }
      const orgMembers = await getOrgMembersFromDb({ organizationId: orgId });
      const memberIds = new Set(
        orgMembers.users.map((u: any) => u.id)
      );
      for (const share of additionalShares) {
        if (!memberIds.has(share.userId)) {
          return NextResponse.json(
            {
              error: `User ${share.userId} is not a member of this organization`,
            },
            { status: 403 }
          );
        }
      }
    }

    try {
      const session = await createEntitySession({
        entityType,
        entityId,
        orgId,
        megolmSessionId,
        creatorShare: {
          userId: user.id,
          encryptedSession: creatorShare.encryptedSession,
          ephemeralPublicKey: creatorShare.ephemeralPublicKey,
          iv: creatorShare.iv,
        },
        orkBackup,
        additionalShares,
      });
      return NextResponse.json({ session }, { status: 201 });
    } catch (err) {
      if (err instanceof EntitySessionExistsError) {
        return NextResponse.json(
          { error: "Active session already exists for this entity", sessionId: err.sessionId },
          { status: 409 }
        );
      }
      if ((err as any).code === "P2002") {
        return NextResponse.json(
          { error: "Session creation conflict — retry" },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("[ENTITY_SESSIONS_POST]", error);
    return NextResponse.json(
      { error: "Failed to create entity session" },
      { status: 500 }
    );
  }
}
