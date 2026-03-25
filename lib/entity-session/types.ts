/** Entity types that support E2EE sessions */
export type EntityType = "CLIENT" | "PROPERTY" | "MANDATE" | "TASK";

/** Input for creating a new entity session */
export interface CreateEntitySessionInput {
  entityType: EntityType;
  entityId: string;
  orgId: string;
  megolmSessionId: string;
  /** ECIES-encrypted Megolm session export for creator's identity public key */
  creatorShare: {
    userId: string;
    encryptedSession: string;
    // NH-4: ECIES fields are required for new sessions.
    // Prisma schema keeps them nullable (String?) for backward compat with pre-ECIES rows.
    ephemeralPublicKey: string;
    iv: string;
  };
  /** Megolm session export encrypted with ORK (for admin recovery) */
  orkBackup: string;
  /** Additional user shares (e.g., assigned agent already has access) */
  additionalShares?: Array<{
    userId: string;
    encryptedSession: string;
    ephemeralPublicKey: string;
    iv: string;
    startingIndex: number;
  }>;
}

/** Input for adding a session share (granting access) */
export interface CreateSessionShareInput {
  entitySessionId: string;
  userId: string;
  encryptedSession: string;
  // NH-4: Required for new shares
  ephemeralPublicKey: string;
  iv: string;
  startingIndex: number;
}

/** Input for session rotation (on access revocation or message limit) */
export interface RotateEntitySessionInput {
  entityType: EntityType;
  entityId: string;
  orgId: string;
  /** New Megolm session ID (generated client-side) */
  newMegolmSessionId: string;
  /** Shares for all remaining authorized users */
  shares: Array<{
    userId: string;
    encryptedSession: string;
    ephemeralPublicKey: string;
    iv: string;
  }>;
  /** New ORK backup */
  orkBackup: string;
}
