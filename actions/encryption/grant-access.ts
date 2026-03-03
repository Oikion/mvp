"use server";

import { requireAction } from "@/lib/permissions/action-guards";
import { getCurrentOrgId, getCurrentUserId } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { prismadb } from "@/lib/prisma";

interface GrantAccessInput {
  targetUserId: string;
  wrappedKey: string; // OMK wrapped with target user's KEK
  salt: string; // Salt for target user's KEK derivation
}

/**
 * Grant encryption access to a team member
 * 
 * Flow:
 * 1. Admin enters their passphrase → derives their KEK → unwraps OMK
 * 2. Target user enters their passphrase → salt is generated
 * 3. Client derives target user's KEK from their passphrase
 * 4. Client wraps OMK with target user's KEK
 * 5. Server stores wrapped key for target user
 */
export async function grantEncryptionAccess(
  input: GrantAccessInput
): Promise<ActionResponse<void>> {
  // Require admin permission
  const guard = await requireAction("admin:manage_roles");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const grantedById = await getCurrentUserId();

  try {
    // Get encryption status
    const status = await prismadb.organizationEncryptionStatus.findUnique({
      where: { organizationId },
    });

    if (!status?.isEnabled) {
      return actionError("Encryption is not enabled for this organization", "VALIDATION_ERROR");
    }

    // Check if target user is in the organization (via Clerk org membership)
    // For now, we'll trust the client has verified this
    
    // Check if user already has access
    const existingKey = await prismadb.organizationEncryptionKey.findFirst({
      where: {
        organizationId,
        userId: input.targetUserId,
        keyVersion: status.keyVersion,
        revokedAt: null,
      },
    });

    if (existingKey) {
      return actionError("User already has encryption access", "VALIDATION_ERROR");
    }

    // Store wrapped key for target user
    await prismadb.organizationEncryptionKey.create({
      data: {
        organizationId,
        userId: input.targetUserId,
        wrappedKey: input.wrappedKey,
        salt: input.salt,
        keyVersion: status.keyVersion,
        grantedById,
      },
    });

    console.log("[GRANT_ACCESS] Encryption access granted to user:", input.targetUserId);

    return actionSuccess();
  } catch (error) {
    console.error("[GRANT_ACCESS]", error);
    return actionError("Failed to grant encryption access", error as Error);
  }
}

/**
 * Get list of organization members who don't have encryption access
 */
export async function getMembersWithoutAccess(): Promise<
  ActionResponse<{ id: string; name: string | null; email: string }[]>
> {
  const guard = await requireAction("admin:manage_roles");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  try {
    // Get encryption status
    const status = await prismadb.organizationEncryptionStatus.findUnique({
      where: { organizationId },
    });

    if (!status?.isEnabled) {
      return actionSuccess([]);
    }

    // Get users who already have access
    const usersWithAccess = await prismadb.organizationEncryptionKey.findMany({
      where: {
        organizationId,
        keyVersion: status.keyVersion,
        revokedAt: null,
      },
      select: { userId: true },
    });

    const userIdsWithAccess = new Set(usersWithAccess.map((u) => u.userId));

    // Get all org members from Clerk (this would need to be done via Clerk API)
    // For now, we'll get users who have any data in this org
    // In production, you'd query Clerk's organization members
    
    // This is a simplified approach - in reality you'd use Clerk's API
    // to get all organization members
    const orgUsers = await prismadb.users.findMany({
      where: {
        // Users who have created content in this org
        OR: [
          { Clients_Clients_assigned_toToUsers: { some: { organizationId } } },
          { Properties_Properties_assigned_toToUsers: { some: { organizationId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Filter out users who already have access
    const usersWithoutAccess = orgUsers.filter((u) => !userIdsWithAccess.has(u.id));

    return actionSuccess(usersWithoutAccess);
  } catch (error) {
    console.error("[GET_MEMBERS_WITHOUT_ACCESS]", error);
    return actionError("Failed to get members", error as Error);
  }
}
