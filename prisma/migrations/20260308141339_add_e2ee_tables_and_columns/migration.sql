/*
  Warnings:

  - You are about to drop the column `entityId` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the `ConversationKeyShare` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PreKeyType" AS ENUM ('SIGNED', 'ONE_TIME');

-- DropForeignKey
ALTER TABLE "ConversationKeyShare" DROP CONSTRAINT "ConversationKeyShare_conversationId_fkey";

-- DropIndex
DROP INDEX "Conversation_entityType_entityId_idx";

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "isE2ee" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "entityId",
DROP COLUMN "entityType",
ADD COLUMN     "isE2ee" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "dhPublicKey" TEXT,
ADD COLUMN     "messageIndex" INTEGER,
ADD COLUMN     "previousChainLen" INTEGER,
ADD COLUMN     "sessionId" TEXT;

-- DropTable
DROP TABLE "ConversationKeyShare";

-- DropEnum
DROP TYPE "ConversationEntityType";

-- CreateTable
CREATE TABLE "UserIdentityKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "wrappedPrivateKey" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "pbkdfIterations" INTEGER NOT NULL DEFAULT 100000,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIdentityKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserE2eePepper" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pepper" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserE2eePepper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyType" "PreKeyType" NOT NULL,
    "publicKey" TEXT NOT NULL,
    "signature" TEXT,
    "isConsumed" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupSession" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "channelId" TEXT,
    "creatorUserId" TEXT NOT NULL,
    "sessionIndex" INTEGER NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "maxMessages" INTEGER NOT NULL DEFAULT 100,
    "rotatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupSessionShare" (
    "id" TEXT NOT NULL,
    "groupSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedSession" TEXT NOT NULL,
    "startingIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupSessionShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectSession" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "initiatorUserId" TEXT NOT NULL,
    "responderUserId" TEXT NOT NULL,
    "initialMessage" TEXT NOT NULL,
    "isEstablished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentityKey_userId_key" ON "UserIdentityKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserE2eePepper_userId_key" ON "UserE2eePepper"("userId");

-- CreateIndex
CREATE INDEX "UserPreKey_userId_keyType_isConsumed_idx" ON "UserPreKey"("userId", "keyType", "isConsumed");

-- CreateIndex
CREATE INDEX "GroupSession_conversationId_isActive_idx" ON "GroupSession"("conversationId", "isActive");

-- CreateIndex
CREATE INDEX "GroupSession_channelId_isActive_idx" ON "GroupSession"("channelId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GroupSessionShare_groupSessionId_userId_key" ON "GroupSessionShare"("groupSessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectSession_conversationId_key" ON "DirectSession"("conversationId");

-- AddForeignKey
ALTER TABLE "UserIdentityKey" ADD CONSTRAINT "UserIdentityKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserE2eePepper" ADD CONSTRAINT "UserE2eePepper_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreKey" ADD CONSTRAINT "UserPreKey_user_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreKey" ADD CONSTRAINT "UserPreKey_identity_fkey" FOREIGN KEY ("userId") REFERENCES "UserIdentityKey"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSession" ADD CONSTRAINT "GroupSession_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSession" ADD CONSTRAINT "GroupSession_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSessionShare" ADD CONSTRAINT "GroupSessionShare_groupSessionId_fkey" FOREIGN KEY ("groupSessionId") REFERENCES "GroupSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectSession" ADD CONSTRAINT "DirectSession_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
