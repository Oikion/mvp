/*
  Warnings:

  - Added the required column `organizationId` to the `CommunicationEvent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CommunicationEvent" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "CommunicationEvent_organizationId_idx" ON "CommunicationEvent"("organizationId");
