/**
 * lib/delete-org-data.ts
 *
 * Hard-deletes all database records scoped to an organization.
 * Called when a Clerk `organization.deleted` webhook fires.
 *
 * Deletion order matters: child/join tables must be removed before their parents
 * to respect any FK constraints. Where Prisma-managed `onDelete: Cascade` already
 * handles children (e.g. PropertyImage → Properties), we skip the child explicitly
 * but still delete the parent — Prisma's cascade fires at the DB level.
 *
 * Tables intentionally excluded:
 *   - Users            — not org-scoped; handled by the user.deleted webhook
 *   - AgentProfile     — user-scoped (userId), not org-scoped; deleted via user.deleted cascade
 *   - AgentContactSubmission — cascades from AgentProfile; not org-scoped
 *   - UserNotificationSettings — user-scoped; cascades from Users
 *   - TodoList         — legacy table, no organizationId
 *   - WebsiteContactSubmission — platform-level, not tenant-scoped
 *   - DocFeedback      — platform-level, not tenant-scoped
 *   - Referral*        — no organizationId; platform-level
 *   - Employees        — no organizationId; legacy/demo data
 *   - SharedEntity     — no organizationId; cross-org by design
 *   - ImageUpload      — no organizationId
 *   - ReservedName     — platform-level allow/deny list
 *   - PlatformEncryptionKey — platform-level, not per-org
 *   - AdminAccessLog   — audit log, never delete
 *
 * Tables handled via cascade (not listed explicitly):
 *   - DealStageLog        → cascade from Deal
 *   - ShowingAttendee     → cascade from PropertyShowing
 *   - ContactComment      → cascade from Contact
 *   - RequestComment      → cascade from Request
 *   - PropertyComment     → cascade from Properties
 *   - SocialPostComment   → cascade from SocialPost
 *   - SocialPostLike      → cascade from SocialPost
 *   - MandateComment      → cascade from Mandate
 *   - Mandate_Properties  → cascade from Mandate / Properties
 *   - MessageReaction     → cascade from Message
 *   - MessageRead         → cascade from Message
 *   - MessageAttachment   → cascade from Message
 *   - MessageMention      → cascade from Message
 *   - ConversationParticipant → cascade from Conversation
 *   - ChannelMember       → cascade from Channel
 *   - EntitySessionShare  → cascade from EntitySession
 *   - EntitySessionBackup → cascade from EntitySession
 *   - GroupSessionShare   → cascade from GroupSession
 *   - GroupSession        → cascade from Conversation / Channel
 *   - DirectSession       → cascade from Conversation
 *   - WebhookDelivery     → cascade from WebhookEndpoint
 *   - XeSyncItem          → cascade from XeSyncHistory
 *   - ApiLog              → cascade from ApiKey
 *   - XeAgentSettings     → cascade from XeIntegration
 *   - AgencyContactSubmission → cascade from AgencyProfile
 *   - CalendarEventContact → cascade from CalendarEvent
 *   - CalendarEventAgent  → cascade from CalendarEvent
 */

import { prismadb } from "@/lib/prisma";
import { cacheDel } from "@/lib/redis";

/**
 * Delete all tenant-scoped data for an organization.
 * Runs inside a single transaction — either everything succeeds or nothing changes.
 *
 * @param orgId  Clerk organization ID (e.g. "org_xxx")
 */
export async function deleteOrgData(orgId: string): Promise<void> {
  if (!orgId) throw new Error("[deleteOrgData] orgId is required");

  // Clear DEK cache so no stale key material survives after deletion
  await cacheDel(`oik:dek:${orgId}`);

  await prismadb.$transaction(
    async (tx) => {
      // ── 1. Join / child tables (deepest level first) ──────────────────────
      // Only tables with their own organizationId need explicit deletion.
      // Tables that rely solely on cascade from a parent are omitted here.

      // Deal sub-records (DealStageLog cascades from Deal)
      await tx.dealParty.deleteMany({ where: { organizationId: orgId } });

      // Contact sub-records (ContactComment cascades from Contact)
      await tx.contactProperty.deleteMany({ where: { organizationId: orgId } });
      await tx.contactRelationship.deleteMany({ where: { organizationId: orgId } });

      // Request sub-records (RequestComment cascades from Request)
      await tx.requestContact.deleteMany({ where: { organizationId: orgId } });
      await tx.propertyRequestMatch.deleteMany({ where: { organizationId: orgId } });

      // Calendar sub-records
      // CalendarEventContact and CalendarEventAgent cascade from CalendarEvent
      await tx.calendarReminder.deleteMany({ where: { organizationId: orgId } });
      await tx.eventInvitee.deleteMany({ where: { organizationId: orgId } });

      // Property sub-records
      // PropertyComment cascades from Properties; Property_Contacts has no organizationId
      // but can be filtered via the Properties relation
      await tx.property_Contacts.deleteMany({
        where: { Properties: { organizationId: orgId } },
      });
      // ProfileShowcaseProperty has no organizationId; filter via Properties relation
      await tx.profileShowcaseProperty.deleteMany({
        where: { Properties: { organizationId: orgId } },
      });

      // Social sub-records
      // SocialPostComment and SocialPostLike cascade from SocialPost
      await tx.socialPostLog.deleteMany({ where: { organizationId: orgId } });

      // Mandate sub-records (MandateComment and Mandate_Properties cascade from Mandate)

      // Task sub-records
      await tx.crm_Accounts_Tasks_Comments.deleteMany({ where: { organizationId: orgId } });

      // Message sub-records (MessageReaction/Read/Attachment/Mention cascade from Message)

      // Conversation sub-records (ConversationParticipant cascades from Conversation)
      await tx.conversationOrgMembership.deleteMany({ where: { organizationId: orgId } });

      // Channel sub-records (ChannelMember cascades from Channel)

      // E2EE session sub-records
      // EntitySessionShare and EntitySessionBackup cascade from EntitySession
      // GroupSessionShare cascades from GroupSession
      // GroupSession cascades from Conversation / Channel
      // DirectSession cascades from Conversation
      await tx.e2eeSessionBackup.deleteMany({ where: { organizationId: orgId } });

      // Entity change logs / audit trails
      await tx.entityChangeLog.deleteMany({ where: { organizationId: orgId } });

      // Webhook deliveries cascade from WebhookEndpoint

      // XeSyncHistory and XeSyncItem both cascade from XeIntegration — excluded.

      // N8n workflow (child of N8nConfig)
      await tx.n8nAgentWorkflow.deleteMany({ where: { organizationId: orgId } });

      // Newsletter campaigns (child of NewsletterSubscriber)
      await tx.newsletterCampaign.deleteMany({ where: { organizationId: orgId } });

      // ── 2. Main entity tables ─────────────────────────────────────────────

      await tx.contact.deleteMany({ where: { organizationId: orgId } });
      await tx.request.deleteMany({ where: { organizationId: orgId } });
      await tx.deal.deleteMany({ where: { organizationId: orgId } });
      await tx.properties.deleteMany({ where: { organizationId: orgId } });
      await tx.documents.deleteMany({ where: { organizationId: orgId } });
      await tx.calendarEvent.deleteMany({ where: { organizationId: orgId } });
      await tx.activity.deleteMany({ where: { organizationId: orgId } });
      await tx.socialPost.deleteMany({ where: { organizationId: orgId } });
      await tx.propertyShowing.deleteMany({ where: { organizationId: orgId } });
      await tx.crm_Accounts_Tasks.deleteMany({ where: { organizationId: orgId } });
      await tx.message.deleteMany({ where: { organizationId: orgId } });
      await tx.conversation.deleteMany({ where: { organizationId: orgId } });
      await tx.channel.deleteMany({ where: { organizationId: orgId } });
      // EntitySession uses `orgId` field name (not `organizationId`)
      await tx.entitySession.deleteMany({ where: { orgId } });
      // GroupSession and DirectSession cascade from Conversation / Channel
      await tx.blogPost.deleteMany({ where: { organizationId: orgId } });
      await tx.newsletterSubscriber.deleteMany({ where: { organizationId: orgId } });
      await tx.communicationEvent.deleteMany({ where: { organizationId: orgId } });
      await tx.attachment.deleteMany({ where: { organizationId: orgId } });
      await tx.exportHistory.deleteMany({ where: { organizationId: orgId } });
      await tx.importHistory.deleteMany({ where: { organizationId: orgId } });
      await tx.orgDocumentTemplate.deleteMany({ where: { organizationId: orgId } });

      // ── 3. Org profiles and public-facing data ────────────────────────────
      // AgentProfile is user-scoped (no organizationId) — excluded.
      // AgentContactSubmission cascades from AgentProfile — excluded.
      // AgencyContactSubmission cascades from AgencyProfile — excluded.

      await tx.agencyProfile.deleteMany({ where: { organizationId: orgId } });
      // WebsiteContactSubmission and DocFeedback are platform-level — excluded.

      // ── 4. Integrations and automation ───────────────────────────────────
      // ApiLog cascades from ApiKey — excluded.
      // XeAgentSettings cascades from XeIntegration — excluded.
      // WebhookDelivery cascades from WebhookEndpoint — excluded.

      await tx.xeIntegration.deleteMany({ where: { organizationId: orgId } });
      await tx.n8nConfig.deleteMany({ where: { organizationId: orgId } });
      await tx.apiKey.deleteMany({ where: { organizationId: orgId } });
      await tx.webhookEndpoint.deleteMany({ where: { organizationId: orgId } });
      await tx.backgroundJob.deleteMany({ where: { organizationId: orgId } });
      await tx.organizationFeature.deleteMany({ where: { organizationId: orgId } });

      // ── 5. Permissions and module access ─────────────────────────────────

      await tx.organizationRolePermission.deleteMany({ where: { organizationId: orgId } });
      await tx.userModuleAccess.deleteMany({ where: { organizationId: orgId } });
      await tx.roleModuleAccess.deleteMany({ where: { organizationId: orgId } });

      // ── 6. Notifications and misc operational data ────────────────────────
      // UserNotificationSettings is user-scoped (no organizationId) — excluded.
      // TodoList has no organizationId (legacy table) — excluded.

      await tx.notification.deleteMany({ where: { organizationId: orgId } });
      await tx.marketingSpend.deleteMany({ where: { organizationId: orgId } });
      await tx.agentHours.deleteMany({ where: { organizationId: orgId } });
      await tx.dataExportRequest.deleteMany({ where: { organizationId: orgId } });
      await tx.dataDeletionRequest.deleteMany({ where: { organizationId: orgId } });
      await tx.departureLog.deleteMany({ where: { organizationId: orgId } });
      await tx.orgMemberConsent.deleteMany({ where: { organizationId: orgId } });
      await tx.idSequence.deleteMany({ where: { organizationId: orgId } });
      await tx.crossOrgMatch.deleteMany({
        where: { OR: [{ requestOrgId: orgId }, { propertyOrgId: orgId }] },
      });
      // OrgNetworkPartner uses initiatorOrgId / partnerOrgId (not organizationId)
      await tx.orgNetworkPartner.deleteMany({
        where: { OR: [{ initiatorOrgId: orgId }, { partnerOrgId: orgId }] },
      });
      await tx.orgNetworkSettings.deleteMany({ where: { organizationId: orgId } });
      await tx.piiAccessLog.deleteMany({ where: { organizationId: orgId } });
      await tx.orgRecoveryKey.deleteMany({ where: { orgId } });

      // ── 7. Org-level encryption and match weights ─────────────────────────

      await tx.weightCalibrationReport.deleteMany({ where: { organizationId: orgId } });
      await tx.orgMatchWeights.deleteMany({ where: { organizationId: orgId } });
      await tx.orgEncryptionKey.deleteMany({ where: { organizationId: orgId } });

      // ── 8. Org settings — delete last so auditors can reference during above ──

      await tx.organizationSettingsAudit.deleteMany({ where: { organizationId: orgId } });
      await tx.organizationSettings.deleteMany({ where: { organizationId: orgId } });
    },
    {
      // Org data deletion can touch many rows across many tables — generous timeout
      timeout: 30_000,
    }
  );

  console.log(`[deleteOrgData] All data deleted for org ${orgId}`);
}
