-- CreateEnum
CREATE TYPE "ConversationScope" AS ENUM ('ORG', 'PERSONAL', 'SHARED');

-- AlterTable: make organizationId optional, add scope with default ORG
ALTER TABLE "Conversation" ALTER COLUMN "organizationId" DROP NOT NULL;
ALTER TABLE "Conversation" ADD COLUMN "scope" "ConversationScope" NOT NULL DEFAULT 'ORG';

-- CreateIndex
CREATE INDEX "Conversation_scope_idx" ON "Conversation"("scope");

-- CreateTable
CREATE TABLE "ConversationKeyShare" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,

    CONSTRAINT "ConversationKeyShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationKeyShare_conversationId_userId_key" ON "ConversationKeyShare"("conversationId", "userId");
CREATE INDEX "ConversationKeyShare_userId_idx" ON "ConversationKeyShare"("userId");

-- AddForeignKey
ALTER TABLE "ConversationKeyShare" ADD CONSTRAINT "ConversationKeyShare_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ConversationOrgMembership" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "autoSync" BOOLEAN NOT NULL DEFAULT true,
    "addedById" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationOrgMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationOrgMembership_conversationId_organizationId_key" ON "ConversationOrgMembership"("conversationId", "organizationId");
CREATE INDEX "ConversationOrgMembership_organizationId_idx" ON "ConversationOrgMembership"("organizationId");

-- AddForeignKey
ALTER TABLE "ConversationOrgMembership" ADD CONSTRAINT "ConversationOrgMembership_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
