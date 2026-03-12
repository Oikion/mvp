-- CreateEnum
CREATE TYPE "DepartureReason" AS ENUM ('LEFT_ORG', 'REMOVED_FROM_ORG', 'ACCOUNT_DELETED', 'ADMIN_FORCE_DELETED');

-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "ChangelogBroadcast" DROP CONSTRAINT "ChangelogBroadcast_sentById_fkey";

-- DropForeignKey
ALTER TABLE "ChangelogEntry" DROP CONSTRAINT "ChangelogEntry_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ClientComment" DROP CONSTRAINT "ClientComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_clientAgentId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_propertyAgentId_fkey";

-- DropForeignKey
ALTER TABLE "MandateComment" DROP CONSTRAINT "MandateComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyComment" DROP CONSTRAINT "PropertyComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_referredUserId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralCode" DROP CONSTRAINT "ReferralCode_userId_fkey";

-- DropForeignKey
ALTER TABLE "SharedEntity" DROP CONSTRAINT "SharedEntity_sharedById_fkey";

-- DropForeignKey
ALTER TABLE "SharedEntity" DROP CONSTRAINT "SharedEntity_sharedWithId_fkey";

-- DropForeignKey
ALTER TABLE "SocialPost" DROP CONSTRAINT "SocialPost_authorId_fkey";

-- DropForeignKey
ALTER TABLE "SocialPostComment" DROP CONSTRAINT "SocialPostComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "SocialPostLike" DROP CONSTRAINT "SocialPostLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "crm_Accounts_Tasks_Comments" DROP CONSTRAINT "crm_Accounts_Tasks_Comments_user_fkey";

-- AlterTable
ALTER TABLE "Attachment" ALTER COLUMN "uploadedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CalendarEvent" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CalendarReminder" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ChangelogBroadcast" ALTER COLUMN "sentById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ChangelogEntry" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ClientComment" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Client_Contacts" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Clients" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Deal" ALTER COLUMN "propertyAgentId" DROP NOT NULL,
ALTER COLUMN "clientAgentId" DROP NOT NULL,
ALTER COLUMN "proposedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Documents" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "EventInvitee" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Feedback" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MandateComment" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "senderId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MyAccount" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Properties" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PropertyComment" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Referral" ALTER COLUMN "referredUserId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ReferralCode" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SharedEntity" ALTER COLUMN "sharedById" DROP NOT NULL,
ALTER COLUMN "sharedWithId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SocialPost" ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SocialPostComment" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SocialPostLike" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "crm_Accounts_Tasks" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_Accounts_Tasks_Comments" ALTER COLUMN "user" DROP NOT NULL,
ALTER COLUMN "organizationId" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "ChangelogBroadcast_sentById_idx" ON "ChangelogBroadcast"("sentById");

-- CreateIndex
CREATE INDEX "Client_Contacts_created_by_idx" ON "Client_Contacts"("created_by");

-- CreateIndex
CREATE INDEX "Documents_document_type_idx" ON "Documents"("document_type");

-- CreateIndex
CREATE INDEX "MandateComment_userId_idx" ON "MandateComment"("userId");

-- CreateIndex
CREATE INDEX "Property_Contacts_assigned_to_idx" ON "Property_Contacts"("assigned_to");

-- CreateIndex
CREATE INDEX "Property_Contacts_property_idx" ON "Property_Contacts"("property");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_account_idx" ON "crm_Accounts_Tasks"("account");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_calendarEventId_idx" ON "crm_Accounts_Tasks"("calendarEventId");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_user_idx" ON "crm_Accounts_Tasks"("user");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_Comments_crm_account_task_idx" ON "crm_Accounts_Tasks_Comments"("crm_account_task");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_Comments_user_idx" ON "crm_Accounts_Tasks_Comments"("user");

-- AddForeignKey
ALTER TABLE "ClientComment" ADD CONSTRAINT "ClientComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_clientAgentId_fkey" FOREIGN KEY ("clientAgentId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_propertyAgentId_fkey" FOREIGN KEY ("propertyAgentId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyComment" ADD CONSTRAINT "PropertyComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedEntity" ADD CONSTRAINT "SharedEntity_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedEntity" ADD CONSTRAINT "SharedEntity_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostComment" ADD CONSTRAINT "SocialPostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostLike" ADD CONSTRAINT "SocialPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Accounts_Tasks_Comments" ADD CONSTRAINT "crm_Accounts_Tasks_Comments_user_fkey" FOREIGN KEY ("user") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateComment" ADD CONSTRAINT "MandateComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogEntry" ADD CONSTRAINT "ChangelogEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogBroadcast" ADD CONSTRAINT "ChangelogBroadcast_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
