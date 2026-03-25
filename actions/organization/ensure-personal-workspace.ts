"use server";

import { createClerkClient } from "@clerk/backend";
import { auth } from "@clerk/nextjs/server";
import { DataOwnershipMode, EncryptionMode } from "@prisma/client";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { updateOrganizationMetadata } from "./update-org-metadata";

export async function ensurePersonalWorkspace() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { error: "User not authenticated" };
    }

    const user = await getCurrentUser();
    if (!user || !user.username) {
      return { error: "User not found or username not set" };
    }

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Get all user's organization memberships
    const memberships = await clerk.users.getOrganizationMembershipList({
      userId,
    });

    // Check if user already has a personal workspace
    const hasPersonalWorkspace = memberships.data?.some(
      (membership) =>
        (membership.organization.publicMetadata as Record<string, unknown>)
          ?.type === "personal"
    );

    if (hasPersonalWorkspace) {
      return { success: true, created: false };
    }

    // Create personal workspace (suffix with short timestamp to avoid slug collisions on retry)
    const personalOrgName = `${user.username}'s Workspace`;
    const slugBase = `${user.username}-personal`;
    const personalOrgSlug = `${slugBase}-${Date.now().toString(36)}`;

    const personalOrg = await clerk.organizations.createOrganization({
      name: personalOrgName,
      slug: personalOrgSlug,
      createdBy: userId,
    });

    if (!personalOrg) {
      return { error: "Failed to create personal workspace" };
    }

    // Set metadata to mark as personal workspace
    const metadataResult = await updateOrganizationMetadata(personalOrg.id, {
      type: "personal",
    });

    if (metadataResult.error) {
      console.error("Failed to set personal org metadata:", metadataResult.error);
      // Continue anyway - the org exists
    }

    // Personal workspaces: always STANDARD encryption, always AGENT data ownership.
    const now = new Date();
    await prismadb.organizationSettings.upsert({
      where: { organizationId: personalOrg.id },
      create: {
        organizationId: personalOrg.id,
        createdBy: userId,
        encryptionMode: EncryptionMode.STANDARD,
        dataOwnershipMode: DataOwnershipMode.AGENT,
        dataOwnershipSetAt: now,
        dataOwnershipChangedBy: userId,
        policyVersion: 1,
        policyHistory: [
          { mode: DataOwnershipMode.AGENT, from: now.toISOString(), to: null },
        ],
      },
      update: {},
    });

    return { success: true, created: true, organizationId: personalOrg.id };
  } catch (error: unknown) {
    console.error("Error ensuring personal workspace:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to ensure personal workspace";
    return { error: errorMessage };
  }
}
