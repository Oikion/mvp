-- CreateEnum
CREATE TYPE "EntityChangeLogType" AS ENUM ('CONTACT', 'PROPERTY', 'REQUEST', 'DEAL');

-- CreateEnum
CREATE TYPE "EntityChangeEventType" AS ENUM ('CREATED', 'UPDATED', 'LINKED', 'UNLINKED', 'DELETED', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationCategory" ADD VALUE 'CONTACT_CREATED';
ALTER TYPE "NotificationCategory" ADD VALUE 'CONTACT_ASSIGNED';

-- AlterEnum
ALTER TYPE "NotificationEntityType" ADD VALUE 'CONTACT';

-- AlterEnum
ALTER TYPE "SharedEntityType" ADD VALUE 'CONTACT';

-- CreateTable
CREATE TABLE "entity_change_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" "EntityChangeLogType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" "EntityChangeEventType" NOT NULL,
    "actorUserId" TEXT,
    "changedFields" JSONB,
    "linkTarget" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entity_change_logs_organizationId_idx" ON "entity_change_logs"("organizationId");

-- CreateIndex
CREATE INDEX "entity_change_logs_organizationId_entityType_entityId_idx" ON "entity_change_logs"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "entity_change_logs_organizationId_entityType_entityId_occur_idx" ON "entity_change_logs"("organizationId", "entityType", "entityId", "occurredAt");

-- CreateIndex
CREATE INDEX "entity_change_logs_actorUserId_idx" ON "entity_change_logs"("actorUserId");

-- AddForeignKey
ALTER TABLE "entity_change_logs" ADD CONSTRAINT "entity_change_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
