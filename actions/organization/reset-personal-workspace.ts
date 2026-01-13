"use server";

import { auth } from "@clerk/nextjs/server";
import { prismaForOrg } from "@/lib/tenant";
import { getCurrentUser } from "@/lib/get-current-user";
import { isOrgPersonal } from "@/lib/personal-workspace-guard";

export async function resetPersonalWorkspace() {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return { error: "No organization selected" };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { error: "User not authenticated" };
    }

    // Verify this is a personal workspace before allowing reset
    const isPersonal = await isOrgPersonal(orgId);
    if (!isPersonal) {
      return { error: "This action is only available for personal workspaces. Use organization settings to manage agency organizations." };
    }

    const db = prismaForOrg(orgId);

    // Delete all data within the personal workspace
    // Note: We're using transactions to ensure atomicity
    await db.$transaction(async (tx) => {
      // Delete in order of dependencies
      await tx.crm_Accounts_Tasks_Comments.deleteMany({});
      await tx.crm_Accounts_Tasks.deleteMany({});
      await tx.clientComment.deleteMany({});
      await tx.propertyComment.deleteMany({});
      await tx.client_Properties.deleteMany({});
      await tx.client_Contacts.deleteMany({});
      await tx.clients.deleteMany({});
      await tx.properties.deleteMany({});
      await tx.documents.deleteMany({});
      await tx.calComEvent.deleteMany({});
      await tx.socialPostComment.deleteMany({});
      await tx.socialPostLike.deleteMany({});
      await tx.socialPost.deleteMany({});
      await tx.sharedEntity.deleteMany({});
      await tx.audienceMember.deleteMany({});
      await tx.audience.deleteMany({});
      await tx.notification.deleteMany({});
      await tx.feedback.deleteMany({});
      await tx.attachment.deleteMany({});
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Error resetting personal workspace:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to reset personal workspace";
    return { error: errorMessage };
  }
}
