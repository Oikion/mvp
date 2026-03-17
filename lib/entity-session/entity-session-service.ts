// lib/entity-session/entity-session-service.ts
import { prismadb } from "@/lib/prisma";
import type {
  CreateEntitySessionInput,
  CreateSessionShareInput,
  RotateEntitySessionInput,
  EntityType,
} from "./types";

export class EntitySessionExistsError extends Error {
  constructor(public readonly sessionId: string) {
    super("ALREADY_EXISTS");
  }
}

/**
 * Create a new entity session with creator's share and ORK backup.
 * Called when: first comment on an entity in E2EE org, or entity creation in E2EE org.
 */
export async function createEntitySession(input: CreateEntitySessionInput) {
  const {
    entityType,
    entityId,
    orgId,
    megolmSessionId,
    creatorShare,
    orkBackup,
    additionalShares,
  } = input;

  // Use interactive transaction to get the session ID for related records
  return prismadb.$transaction(async (tx) => {
    const existing = await tx.entitySession.findFirst({
      where: { entityType, entityId, isActive: true },
      select: { id: true },
    });
    if (existing) {
      throw new EntitySessionExistsError(existing.id);
    }

    const session = await tx.entitySession.create({
      data: {
        entityType,
        entityId,
        megolmSessionId,
        orgId,
      },
    });

    // Creator's share
    await tx.entitySessionShare.create({
      data: {
        entitySessionId: session.id,
        userId: creatorShare.userId,
        encryptedSession: creatorShare.encryptedSession,
        startingIndex: 0,
      },
    });

    // ORK backup
    await tx.entitySessionBackup.create({
      data: {
        entitySessionId: session.id,
        encryptedSession: orkBackup,
      },
    });

    // Additional shares (e.g., assigned agent)
    if (additionalShares?.length) {
      for (const share of additionalShares) {
        await tx.entitySessionShare.create({
          data: {
            entitySessionId: session.id,
            userId: share.userId,
            encryptedSession: share.encryptedSession,
            startingIndex: share.startingIndex,
          },
        });
      }
    }

    return session;
  });
}

/**
 * Get the active entity session for an entity.
 * Returns null if no session exists (Standard org or not yet created).
 */
export async function getActiveEntitySession(
  entityType: EntityType,
  entityId: string,
  orgId: string
) {
  return prismadb.entitySession.findFirst({
    where: {
      entityType,
      entityId,
      orgId,
      isActive: true,
    },
  });
}

/**
 * Get the active session for an entity WITH the specified user's share.
 * Returns the session with the user's share populated, or null.
 */
export async function getEntitySessionShareForUser(
  entityType: EntityType,
  entityId: string,
  userId: string,
  orgId: string
) {
  const session = await prismadb.entitySession.findFirst({
    where: {
      entityType,
      entityId,
      orgId,
      isActive: true,
    },
    include: {
      shares: {
        where: { userId },
      },
    },
  });

  if (!session || session.shares.length === 0) return null;

  const share = session.shares[0];
  return {
    ...session,
    share,
    // Expose share fields at top level for convenient access
    encryptedSession: share.encryptedSession,
    startingIndex: share.startingIndex,
  };
}

/**
 * Create a session share for a user (granting access to entity's E2EE comments).
 * Called by the granting user's browser.
 */
export async function createSessionShare(input: CreateSessionShareInput) {
  return prismadb.entitySessionShare.create({
    data: {
      entitySessionId: input.entitySessionId,
      userId: input.userId,
      encryptedSession: input.encryptedSession,
      startingIndex: input.startingIndex,
    },
  });
}

/**
 * Rotate an entity session: deactivate old, create new with fresh shares + backup.
 * Triggers: access revocation, 100-message limit, admin manual rotation.
 */
export async function rotateEntitySession(input: RotateEntitySessionInput) {
  const { entityType, entityId, orgId, newMegolmSessionId, shares, orkBackup } =
    input;

  return prismadb.$transaction(async (tx) => {
    // Find current active session INSIDE transaction to prevent TOCTOU race
    const currentSession = await tx.entitySession.findFirst({
      where: { entityType, entityId, isActive: true },
    });

    if (!currentSession) {
      throw new Error(
        `No active session to rotate for ${entityType}:${entityId}`
      );
    }

    const newVersion = currentSession.version + 1;

    // Deactivate old session
    await tx.entitySession.update({
      where: { id: currentSession.id },
      data: { isActive: false, rotatedAt: new Date() },
    });

    // Create new session
    const newSession = await tx.entitySession.create({
      data: {
        entityType,
        entityId,
        megolmSessionId: newMegolmSessionId,
        version: newVersion,
        orgId,
        lastMessageIndex: null,
      },
    });

    // Create shares for remaining authorized users
    for (const share of shares) {
      await tx.entitySessionShare.create({
        data: {
          entitySessionId: newSession.id,
          userId: share.userId,
          encryptedSession: share.encryptedSession,
          startingIndex: 0, // New session starts at 0
        },
      });
    }

    // Create ORK backup
    await tx.entitySessionBackup.create({
      data: {
        entitySessionId: newSession.id,
        encryptedSession: orkBackup,
      },
    });

    return newSession;
  });
}

/**
 * Delete all entity sessions (and cascading shares + backups) for an entity.
 * Called when an entity is deleted.
 */
export async function deleteEntitySessionsForEntity(
  entityType: EntityType,
  entityId: string
) {
  return prismadb.entitySession.deleteMany({
    where: { entityType, entityId },
  });
}
