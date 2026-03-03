"use server";

import { requireAuth } from "@/lib/permissions/action-guards";
import { getCurrentOrgId, getCurrentUserId } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { prismadb } from "@/lib/prisma";

export interface EncryptionStatus {
  isEnabled: boolean;
  keyVersion: number;
  enabledAt: Date | null;
  userHasAccess: boolean;
  authorizedUsers: {
    id: string;
    name: string | null;
    email: string;
    grantedAt: Date;
  }[];
}

/**
 * Get the encryption status for the current organization
 */
export async function getOrganizationEncryptionStatus(): Promise<ActionResponse<EncryptionStatus>> {
  // Check authentication
  const guard = await requireAuth();
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  try {
    // Get encryption status
    const status = await prismadb.organizationEncryptionStatus.findUnique({
      where: { organizationId },
    });

    if (!status || !status.isEnabled) {
      return actionSuccess({
        isEnabled: false,
        keyVersion: 0,
        enabledAt: null,
        userHasAccess: false,
        authorizedUsers: [],
      });
    }

    // Check if current user has access
    const userKey = await prismadb.organizationEncryptionKey.findFirst({
      where: {
        organizationId,
        userId,
        keyVersion: status.keyVersion,
        revokedAt: null,
      },
    });

    // Get list of authorized users
    const authorizedKeys = await prismadb.organizationEncryptionKey.findMany({
      where: {
        organizationId,
        keyVersion: status.keyVersion,
        revokedAt: null,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { grantedAt: "asc" },
    });

    return actionSuccess({
      isEnabled: true,
      keyVersion: status.keyVersion,
      enabledAt: status.enabledAt,
      userHasAccess: !!userKey,
      authorizedUsers: authorizedKeys.map((key) => ({
        id: key.User.id,
        name: key.User.name,
        email: key.User.email,
        grantedAt: key.grantedAt,
      })),
    });
  } catch (error) {
    console.error("[GET_ENCRYPTION_STATUS]", error);
    return actionError("Failed to get encryption status", error as Error);
  }
}

/**
 * Get the user's wrapped key for decryption
 */
export async function getUserWrappedKey(): Promise<
  ActionResponse<{ wrappedKey: string; salt: string; keyVersion: number } | null>
> {
  const guard = await requireAuth();
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  try {
    // Check if encryption is enabled
    const status = await prismadb.organizationEncryptionStatus.findUnique({
      where: { organizationId },
    });

    if (!status || !status.isEnabled) {
      return actionSuccess(null);
    }

    // Get user's wrapped key
    const userKey = await prismadb.organizationEncryptionKey.findFirst({
      where: {
        organizationId,
        userId,
        keyVersion: status.keyVersion,
        revokedAt: null,
      },
    });

    if (!userKey) {
      return actionSuccess(null);
    }

    return actionSuccess({
      wrappedKey: userKey.wrappedKey,
      salt: userKey.salt,
      keyVersion: userKey.keyVersion,
    });
  } catch (error) {
    console.error("[GET_USER_WRAPPED_KEY]", error);
    return actionError("Failed to get encryption key", error as Error);
  }
}
