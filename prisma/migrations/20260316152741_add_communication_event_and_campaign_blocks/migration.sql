-- CreateEnum
CREATE TYPE "CommunicationEventType" AS ENUM ('SENT', 'DELIVERED', 'BOUNCED', 'COMPLAINED', 'OPENED', 'CLICKED', 'UNSUBSCRIBED');

-- AlterTable
ALTER TABLE "NewsletterCampaign" ADD COLUMN     "audienceId" TEXT,
ADD COLUMN     "blocks" JSONB;

-- CreateTable
CREATE TABLE "CommunicationEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "eventType" "CommunicationEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationEvent_externalEventId_key" ON "CommunicationEvent"("externalEventId");

-- CreateIndex
CREATE INDEX "CommunicationEvent_campaignId_idx" ON "CommunicationEvent"("campaignId");

-- CreateIndex
CREATE INDEX "CommunicationEvent_campaignId_eventType_idx" ON "CommunicationEvent"("campaignId", "eventType");

-- CreateIndex
CREATE INDEX "CommunicationEvent_occurredAt_idx" ON "CommunicationEvent"("occurredAt");

-- AddForeignKey
ALTER TABLE "CommunicationEvent" ADD CONSTRAINT "CommunicationEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "NewsletterCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
