import { prismadb } from "@/lib/prisma";

/**
 * Nullify all user references in org-scoped data for a departing user.
 * Executed in a single Prisma transaction for atomicity.
 *
 * Two cases:
 * - Models WITH organizationId: direct updateMany filter
 * - Models WITHOUT organizationId: join through parent model
 */
export async function nullifyOrgReferences(
  userId: string,
  orgId: string
): Promise<{ nulledCount: number }> {
  const results = await prismadb.$transaction([
    // ── Top-level org models (direct organizationId filter) ──

    // Contact.assignedAgentId
    prismadb.contact.updateMany({
      where: { organizationId: orgId, assignedAgentId: userId },
      data: { assignedAgentId: null },
    }),

    // Properties.assigned_to
    prismadb.properties.updateMany({
      where: { organizationId: orgId, assigned_to: userId },
      data: { assigned_to: null },
    }),

    // Request.assignedAgentId
    prismadb.request.updateMany({
      where: { organizationId: orgId, assignedAgentId: userId },
      data: { assignedAgentId: null },
    }),

    // Deal.buyerAgentId
    prismadb.deal.updateMany({
      where: { organizationId: orgId, buyerAgentId: userId },
      data: { buyerAgentId: null },
    }),

    // Deal.listingAgentId
    prismadb.deal.updateMany({
      where: { organizationId: orgId, listingAgentId: userId },
      data: { listingAgentId: null },
    }),

    // Deal.proposedById
    prismadb.deal.updateMany({
      where: { organizationId: orgId, proposedById: userId },
      data: { proposedById: null },
    }),

    // Documents.assigned_user
    prismadb.documents.updateMany({
      where: { organizationId: orgId, assigned_user: userId },
      data: { assigned_user: null },
    }),

    // Documents.created_by_user
    prismadb.documents.updateMany({
      where: { organizationId: orgId, created_by_user: userId },
      data: { created_by_user: null },
    }),

    // CalendarEvent.assignedUserId
    prismadb.calendarEvent.updateMany({
      where: { organizationId: orgId, assignedUserId: userId },
      data: { assignedUserId: null },
    }),

    // SocialPost.authorId
    prismadb.socialPost.updateMany({
      where: { organizationId: orgId, authorId: userId },
      data: { authorId: null },
    }),

    // crm_Accounts_Tasks.user
    prismadb.crm_Accounts_Tasks.updateMany({
      where: { organizationId: orgId, user: userId },
      data: { user: null },
    }),

    // Feedback — userId is optional, null it out
    prismadb.feedback.updateMany({
      where: { organizationId: orgId, userId },
      data: { userId: null },
    }),

    // Attachment.uploadedById
    prismadb.attachment.updateMany({
      where: { organizationId: orgId, uploadedById: userId },
      data: { uploadedById: null },
    }),

    // Message.senderId
    prismadb.message.updateMany({
      where: { organizationId: orgId, senderId: userId },
      data: { senderId: null },
    }),

    // ChangelogEntry.createdById (no organizationId — changelog is global, null by userId)
    prismadb.changelogEntry.updateMany({
      where: { createdById: userId },
      data: { createdById: null },
    }),

    // ChangelogBroadcast.sentById (no organizationId — global)
    prismadb.changelogBroadcast.updateMany({
      where: { sentById: userId },
      data: { sentById: null },
    }),

    // (client_Contacts table removed — ContactRelationship has no assigned_to/created_by fields)

    // crm_Accounts_Tasks_Comments.user (has organizationId)
    prismadb.crm_Accounts_Tasks_Comments.updateMany({
      where: { organizationId: orgId, user: userId },
      data: { user: null },
    }),

    // ── Comment models (join through parent) ──

    // ContactComment → via Contact.organizationId
    prismadb.contactComment.updateMany({
      where: { userId, contact: { organizationId: orgId } },
      data: { userId: null },
    }),

    // PropertyComment → via Properties.organizationId
    prismadb.propertyComment.updateMany({
      where: { userId, Properties: { organizationId: orgId } },
      data: { userId: null },
    }),

    // RequestComment → via Request.organizationId
    prismadb.requestComment.updateMany({
      where: { userId, request: { organizationId: orgId } },
      data: { userId: null },
    }),

    // ── Social models (via SocialPost.organizationId join) ──

    // SocialPostComment → via SocialPost.organizationId
    prismadb.socialPostComment.updateMany({
      where: { userId, SocialPost: { organizationId: orgId } },
      data: { userId: null },
    }),

    // SocialPostLike → via SocialPost.organizationId
    prismadb.socialPostLike.updateMany({
      where: { userId, SocialPost: { organizationId: orgId } },
      data: { userId: null },
    }),

    // ── Cross-cutting models ──

    // SharedEntity.sharedById (no organizationId — null by userId match)
    prismadb.sharedEntity.updateMany({
      where: { sharedById: userId },
      data: { sharedById: null },
    }),

    // SharedEntity.sharedWithId
    prismadb.sharedEntity.updateMany({
      where: { sharedWithId: userId },
      data: { sharedWithId: null },
    }),

    // DocumentView → via Documents.organizationId
    prismadb.documentView.updateMany({
      where: { viewerUserId: userId, Documents: { organizationId: orgId } },
      data: { viewerUserId: null },
    }),

    // Property_Contacts → via Properties (no organizationId on model)
    prismadb.property_Contacts.updateMany({
      where: { assigned_to: userId, Properties: { organizationId: orgId } },
      data: { assigned_to: null },
    }),

    // ReferralCode — deactivate and null userId
    prismadb.referralCode.updateMany({
      where: { userId },
      data: { userId: null, isActive: false },
    }),

    // Referral.referredUserId
    prismadb.referral.updateMany({
      where: { referredUserId: userId },
      data: { referredUserId: null },
    }),
  ]);

  const nulledCount = results.reduce((sum: number, r: { count: number }) => sum + r.count, 0);
  return { nulledCount };
}
