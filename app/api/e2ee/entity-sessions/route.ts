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
import { z } from "zod";

const VALID_ENTITY_TYPES = new Set(["CONTACT", "PROPERTY", "REQUEST", "TASK"]);

const EntitySessionShareSchema = z.object({
  userId: z.string().min(1),
  encryptedSession: z.string().min(1).max(65536),
  ephemeralPublicKey: z.string().min(1),
  iv: z.string().min(1),
  startingIndex: z.number().int().min(0).default(0),
}).strict();

const CreateEntitySessionSchema = z.object({
  entityType: z.enum(["CONTACT", "PROPERTY", "REQUEST", "TASK"]),
  entityId: z.string().uuid(),
  megolmSessionId: z.string().min(1),
  creatorShare: EntitySessionShareSchema,
  additionalShares: z.array(EntitySessionShareSchema).max(50).default([]),
  orkBackup: z.string().min(1).max(65536).optional(),
}).strict();

/**
 * GET /api/e2ee/entity-sessions?entityType=CONTACT&entityId=xxx
 * Get the active session + user's share for an entity.
 * Returns null fields if no session exists (lazy initialization).
 */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const orgId = await getCurrentOrgId();

    const { searchParams } = new URL(req.url);
    const rawEntityType = searchParams.get("entityType");
    const entityType = rawEntityType as EntityType;
    const entityId = searchParams.get("entityId");

    if (!rawEntityType || !entityId || !VALID_ENTITY_TYPES.has(rawEntityType)) {
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
      case "CONTACT": {
        const entity = await prismadb.contact.findFirst({
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
      case "REQUEST": {
        const entity = await prismadb.request.findFirst({
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
    const parsed = CreateEntitySessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { entityType, entityId, megolmSessionId, creatorShare, additionalShares, orkBackup } = parsed.data;

    // NEW-C5: Assert creatorShare.userId matches the authenticated caller
    if (creatorShare.userId !== user.id) {
      return NextResponse.json(
        { error: "creatorShare.userId must match the authenticated caller" },
        { status: 403 }
      );
    }

    // I3: Validate additionalShares recipients are org members
    if (additionalShares.length > 0) {
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
