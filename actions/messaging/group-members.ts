"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions";
import { isOrgAdmin } from "@/lib/org-admin";
import { getOrgMembersFromDb } from "@/lib/org-members";

/**
 * Add an org member to an existing group conversation
 */
export async function addGroupMember(
  conversationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const guard = await requireAction("messaging:manage_members");
    if (guard) return guard;

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Verify the conversation is a group in this org
    const conversation = await prismadb.conversation.findFirst({
      where: { id: conversationId, organizationId, isGroup: true },
      include: { participants: { where: { leftAt: null } } },
    });

    if (!conversation) {
      return { success: false, error: "Group conversation not found" };
    }

    // Verify the calling user is a participant
    const isMember = conversation.participants.some(
      (p) => p.userId === currentUser.id
    );
    if (!isMember) {
      return { success: false, error: "Not a member of this conversation" };
    }

    // SECURITY: the user being added must belong to this org. Users have no
    // organizationId column, so membership is resolved via Clerk — same check
    // createGroupConversation uses. Prevents adding arbitrary/foreign users.
    const { users: orgUsers } = await getOrgMembersFromDb({ organizationId });
    const isOrgMember = orgUsers.some((u: { id: string }) => u.id === userId);
    if (!isOrgMember) {
      return { success: false, error: "User is not a member of this organization" };
    }

    // Upsert participant (handles re-add after leave)
    await prismadb.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId },
      update: { leftAt: null },
    });

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Add group member error:", error);
    return { success: false, error: "Failed to add member" };
  }
}

/**
 * Remove a member from a group conversation.
 * Users cannot remove the creator or themselves (use leaveConversation for self).
 */
export async function removeGroupMember(
  conversationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const guard = await requireAction("messaging:manage_members");
    if (guard) return guard;

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const conversation = await prismadb.conversation.findFirst({
      where: { id: conversationId, organizationId, isGroup: true },
    });

    if (!conversation) {
      return { success: false, error: "Group conversation not found" };
    }

    // Only the group creator or an org admin/owner may remove other members.
    // Without this, any participant could evict colleagues from the group.
    const callerIsCreator = conversation.createdById === currentUser.id;
    const callerIsAdmin = await isOrgAdmin();
    if (!callerIsCreator && !callerIsAdmin) {
      return { success: false, error: "Only the group creator or an org admin can remove members" };
    }

    // Cannot remove the creator
    if (conversation.createdById === userId) {
      return { success: false, error: "Cannot remove the group creator" };
    }

    // Cannot remove yourself via this action (use leave)
    if (userId === currentUser.id) {
      return { success: false, error: "Use 'Leave conversation' to remove yourself" };
    }

    await prismadb.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { leftAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Remove group member error:", error);
    return { success: false, error: "Failed to remove member" };
  }
}
