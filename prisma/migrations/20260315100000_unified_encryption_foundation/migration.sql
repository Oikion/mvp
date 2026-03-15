-- CreateEnum
CREATE TYPE "EncryptionMode" AS ENUM ('STANDARD', 'E2EE');

-- AlterTable
ALTER TABLE "ClientComment" ADD COLUMN     "entitySessionId" TEXT,
ADD COLUMN     "messageIndex" INTEGER;

-- AlterTable
ALTER TABLE "MandateComment" ADD COLUMN     "entitySessionId" TEXT,
ADD COLUMN     "messageIndex" INTEGER;

-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "encryptionMode" "EncryptionMode" NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "PropertyComment" ADD COLUMN     "entitySessionId" TEXT,
ADD COLUMN     "messageIndex" INTEGER;

-- AlterTable
ALTER TABLE "UserIdentityKey" ADD COLUMN     "pendingSessionReshare" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "crm_Accounts_Tasks_Comments" ADD COLUMN     "entitySessionId" TEXT,
ADD COLUMN     "messageIndex" INTEGER;

-- CreateTable
CREATE TABLE "EntitySession" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "megolmSessionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),
    "orgId" TEXT NOT NULL,

    CONSTRAINT "EntitySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntitySessionShare" (
    "id" TEXT NOT NULL,
    "entitySessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedSession" TEXT NOT NULL,
    "startingIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntitySessionShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntitySessionBackup" (
    "id" TEXT NOT NULL,
    "entitySessionId" TEXT NOT NULL,
    "encryptedSession" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntitySessionBackup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgRecoveryKey" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "wrappedOrk" TEXT NOT NULL,
    "wrappedByUserId" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgRecoveryKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryCode" (
    "id" TEXT NOT NULL,
    "recoveryKeyId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "wrappedOrk" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PiiAccessLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fields" TEXT[],
    "source" TEXT NOT NULL,
    "ipAddress" TEXT,

    CONSTRAINT "PiiAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformEncryptionKey" (
    "id" TEXT NOT NULL,
    "encryptedDek" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformEncryptionKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EntitySession_megolmSessionId_key" ON "EntitySession"("megolmSessionId");

-- CreateIndex
CREATE INDEX "EntitySession_entityType_entityId_isActive_idx" ON "EntitySession"("entityType", "entityId", "isActive");

-- CreateIndex
CREATE INDEX "EntitySession_orgId_idx" ON "EntitySession"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "EntitySession_entityType_entityId_version_key" ON "EntitySession"("entityType", "entityId", "version");

-- CreateIndex
CREATE INDEX "EntitySessionShare_userId_idx" ON "EntitySessionShare"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EntitySessionShare_entitySessionId_userId_key" ON "EntitySessionShare"("entitySessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EntitySessionBackup_entitySessionId_key" ON "EntitySessionBackup"("entitySessionId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgRecoveryKey_orgId_key" ON "OrgRecoveryKey"("orgId");

-- CreateIndex
CREATE INDEX "RecoveryCode_recoveryKeyId_idx" ON "RecoveryCode"("recoveryKeyId");

-- CreateIndex
CREATE INDEX "PiiAccessLog_organizationId_timestamp_idx" ON "PiiAccessLog"("organizationId", "timestamp");

-- CreateIndex
CREATE INDEX "PiiAccessLog_userId_timestamp_idx" ON "PiiAccessLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "PiiAccessLog_entityType_entityId_idx" ON "PiiAccessLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "PlatformEncryptionKey_isActive_idx" ON "PlatformEncryptionKey"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformEncryptionKey_keyVersion_key" ON "PlatformEncryptionKey"("keyVersion");

-- AddForeignKey
ALTER TABLE "EntitySessionShare" ADD CONSTRAINT "EntitySessionShare_entitySessionId_fkey" FOREIGN KEY ("entitySessionId") REFERENCES "EntitySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitySessionBackup" ADD CONSTRAINT "EntitySessionBackup_entitySessionId_fkey" FOREIGN KEY ("entitySessionId") REFERENCES "EntitySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCode" ADD CONSTRAINT "RecoveryCode_recoveryKeyId_fkey" FOREIGN KEY ("recoveryKeyId") REFERENCES "OrgRecoveryKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

