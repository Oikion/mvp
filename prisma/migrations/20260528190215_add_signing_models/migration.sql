-- CreateEnum
CREATE TYPE "SigningEnvelopeStatus" AS ENUM ('DRAFT', 'SENT', 'IN_PROGRESS', 'COMPLETED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "SignerType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "SignerStatus" AS ENUM ('PENDING', 'SENT', 'VIEWED', 'SIGNED', 'DECLINED');

-- DropIndex
DROP INDEX "Conversation_externalThreadId_organizationId_key";

-- DropIndex
DROP INDEX "MessageRead_userId_messageId_idx";

-- DropIndex
DROP INDEX "TypingIndicator_channelId_userId_organizationId_key";

-- DropIndex
DROP INDEX "TypingIndicator_conversationId_userId_organizationId_key";

-- DropIndex
DROP INDEX "contacts_organizationId_assignedAgentId_idx";

-- DropIndex
DROP INDEX "property_request_matches_organizationId_matchScore_idx";

-- DropIndex
DROP INDEX "requests_organizationId_assignedAgentId_idx";

-- DropIndex
DROP INDEX "requests_organizationId_createdAt_status_idx";

-- AlterTable
ALTER TABLE "cross_org_matches" ALTER COLUMN "matchScore" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "user_google_calendar_connections" ADD COLUMN     "watchChannelToken" TEXT;

-- CreateTable
CREATE TABLE "signing_envelopes" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceDocumentId" TEXT NOT NULL,
    "signedDocumentId" TEXT,
    "openSignEnvelopeId" TEXT NOT NULL,
    "openSignFileId" TEXT NOT NULL,
    "status" "SigningEnvelopeStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT NOT NULL,
    "message" TEXT,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signing_envelopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signing_envelope_signers" (
    "id" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "signerType" "SignerType" NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "SignerStatus" NOT NULL DEFAULT 'PENDING',
    "signedAt" TIMESTAMP(3),
    "openSignSignerId" TEXT,

    CONSTRAINT "signing_envelope_signers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "signing_envelopes_openSignEnvelopeId_key" ON "signing_envelopes"("openSignEnvelopeId");

-- CreateIndex
CREATE INDEX "signing_envelopes_organizationId_idx" ON "signing_envelopes"("organizationId");

-- CreateIndex
CREATE INDEX "signing_envelopes_sourceDocumentId_idx" ON "signing_envelopes"("sourceDocumentId");

-- CreateIndex
CREATE INDEX "signing_envelopes_openSignFileId_idx" ON "signing_envelopes"("openSignFileId");

-- CreateIndex
CREATE INDEX "signing_envelopes_status_idx" ON "signing_envelopes"("status");

-- CreateIndex
CREATE INDEX "signing_envelopes_organizationId_status_idx" ON "signing_envelopes"("organizationId", "status");

-- CreateIndex
CREATE INDEX "signing_envelope_signers_envelopeId_idx" ON "signing_envelope_signers"("envelopeId");

-- CreateIndex
CREATE INDEX "signing_envelope_signers_envelopeId_status_idx" ON "signing_envelope_signers"("envelopeId", "status");

-- CreateIndex
CREATE INDEX "signing_envelope_signers_signedAt_idx" ON "signing_envelope_signers"("signedAt");

-- CreateIndex
CREATE UNIQUE INDEX "signing_envelope_signers_envelopeId_order_key" ON "signing_envelope_signers"("envelopeId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TypingIndicator_channelId_userId_key" ON "TypingIndicator"("channelId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TypingIndicator_conversationId_userId_key" ON "TypingIndicator"("conversationId", "userId");

-- AddForeignKey
ALTER TABLE "signing_envelopes" ADD CONSTRAINT "signing_envelopes_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "Documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_envelopes" ADD CONSTRAINT "signing_envelopes_signedDocumentId_fkey" FOREIGN KEY ("signedDocumentId") REFERENCES "Documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_envelopes" ADD CONSTRAINT "signing_envelopes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_envelope_signers" ADD CONSTRAINT "signing_envelope_signers_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "signing_envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_envelope_signers" ADD CONSTRAINT "signing_envelope_signers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
