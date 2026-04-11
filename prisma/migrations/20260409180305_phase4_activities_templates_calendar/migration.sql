-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('EMAIL', 'CALL', 'MEETING', 'NOTE', 'TASK', 'SHOWING', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "ActivityParentType" AS ENUM ('CONTACT', 'REQUEST', 'DEAL', 'PROPERTY', 'SHOWING');

-- CreateEnum
CREATE TYPE "DocTemplateCategory" AS ENUM ('LISTING_AGREEMENT', 'BUYER_AGREEMENT', 'OFFER', 'COUNTER_OFFER', 'PURCHASE_CONTRACT', 'TRANSFER_DEED', 'POWER_OF_ATTORNEY', 'NDA', 'GENERAL');

-- CreateEnum
CREATE TYPE "EventContactRole" AS ENUM ('ATTENDEE', 'BUYER', 'SELLER', 'WITNESS', 'NOTARY', 'AGENT', 'OTHER');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE');

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parentType" "ActivityParentType" NOT NULL,
    "parentId" TEXT NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "direction" "ActivityDirection" NOT NULL DEFAULT 'INTERNAL',
    "subject" TEXT,
    "body" TEXT,
    "durationMin" INTEGER,
    "outcome" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "assignedToUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_document_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEl" TEXT,
    "nameEn" TEXT,
    "category" "DocTemplateCategory" NOT NULL DEFAULT 'GENERAL',
    "body" JSONB NOT NULL,
    "placeholders" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "baseTemplateId" TEXT,
    "createdByUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_event_contacts" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" "EventContactRole" NOT NULL DEFAULT 'ATTENDEE',
    "rsvpStatus" "RsvpStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_event_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_event_agents" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,
    "rsvpStatus" "RsvpStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_event_agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activities_organizationId_idx" ON "activities"("organizationId");

-- CreateIndex
CREATE INDEX "activities_organizationId_parentType_parentId_idx" ON "activities"("organizationId", "parentType", "parentId");

-- CreateIndex
CREATE INDEX "activities_organizationId_kind_idx" ON "activities"("organizationId", "kind");

-- CreateIndex
CREATE INDEX "activities_createdByUserId_idx" ON "activities"("createdByUserId");

-- CreateIndex
CREATE INDEX "activities_assignedToUserId_idx" ON "activities"("assignedToUserId");

-- CreateIndex
CREATE INDEX "activities_deletedAt_idx" ON "activities"("deletedAt");

-- CreateIndex
CREATE INDEX "org_document_templates_organizationId_idx" ON "org_document_templates"("organizationId");

-- CreateIndex
CREATE INDEX "org_document_templates_organizationId_category_idx" ON "org_document_templates"("organizationId", "category");

-- CreateIndex
CREATE INDEX "org_document_templates_organizationId_isPublished_idx" ON "org_document_templates"("organizationId", "isPublished");

-- CreateIndex
CREATE INDEX "org_document_templates_createdByUserId_idx" ON "org_document_templates"("createdByUserId");

-- CreateIndex
CREATE INDEX "calendar_event_contacts_eventId_idx" ON "calendar_event_contacts"("eventId");

-- CreateIndex
CREATE INDEX "calendar_event_contacts_contactId_idx" ON "calendar_event_contacts"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_contacts_eventId_contactId_key" ON "calendar_event_contacts"("eventId", "contactId");

-- CreateIndex
CREATE INDEX "calendar_event_agents_eventId_idx" ON "calendar_event_agents"("eventId");

-- CreateIndex
CREATE INDEX "calendar_event_agents_userId_idx" ON "calendar_event_agents"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_agents_eventId_userId_key" ON "calendar_event_agents"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_document_templates" ADD CONSTRAINT "org_document_templates_baseTemplateId_fkey" FOREIGN KEY ("baseTemplateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_document_templates" ADD CONSTRAINT "org_document_templates_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_contacts" ADD CONSTRAINT "calendar_event_contacts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_contacts" ADD CONSTRAINT "calendar_event_contacts_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_agents" ADD CONSTRAINT "calendar_event_agents_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_agents" ADD CONSTRAINT "calendar_event_agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
