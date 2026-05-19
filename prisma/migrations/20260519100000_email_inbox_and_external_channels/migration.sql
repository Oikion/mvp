-- Email inbox integration: new enums, external channel fields, and EmailInboxConfig table

-- CreateEnum: channel source (internal, email, viber)
CREATE TYPE "ChannelSource" AS ENUM ('INTERNAL', 'EMAIL', 'VIBER');

-- CreateEnum: how outbound email is sent from an email-backed channel
CREATE TYPE "SmtpSendMode" AS ENUM ('RESEND_CUSTOM_DOMAIN', 'SMTP_DIRECT');

-- AlterTable: Channel — add source column (existing rows default to INTERNAL)
ALTER TABLE "Channel" ADD COLUMN "source" "ChannelSource" NOT NULL DEFAULT 'INTERNAL';

-- AlterTable: Conversation — add external threading fields for email conversations
ALTER TABLE "Conversation" ADD COLUMN "externalThreadId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "externalSubject" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "externalSenderEmail" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "externalSenderName" TEXT;

-- AlterTable: Message — add deduplication key for inbound email messages
ALTER TABLE "Message" ADD COLUMN "externalMessageId" TEXT;

-- CreateTable: IMAP/SMTP configuration for email-backed channels
CREATE TABLE "email_inbox_configs" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "imapHost" TEXT NOT NULL,
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "imapUser" TEXT NOT NULL,
    "imapPasswordEncrypted" TEXT NOT NULL,
    "smtpSendVia" "SmtpSendMode" NOT NULL DEFAULT 'RESEND_CUSTOM_DOMAIN',
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPasswordEncrypted" TEXT,
    "lastUidNext" INTEGER,
    "lastPolledAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_inbox_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique channelId (one inbox per channel)
CREATE UNIQUE INDEX "email_inbox_configs_channelId_key" ON "email_inbox_configs"("channelId");

-- AddForeignKey
ALTER TABLE "email_inbox_configs" ADD CONSTRAINT "email_inbox_configs_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
