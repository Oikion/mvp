-- Unified Tagging System Migration
-- Creates a centralized tag system that can be applied to any entity

-- Tags table - stores all organization tags
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "organizationId" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- Junction table for Properties
CREATE TABLE "property_tags" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_tags_pkey" PRIMARY KEY ("id")
);

-- Junction table for Clients
CREATE TABLE "client_tags" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_tags_pkey" PRIMARY KEY ("id")
);

-- Junction table for Documents
CREATE TABLE "document_tags" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_tags_pkey" PRIMARY KEY ("id")
);

-- Junction table for Events (CalendarEvent)
CREATE TABLE "event_tags" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_tags_pkey" PRIMARY KEY ("id")
);

-- Junction table for Users
CREATE TABLE "user_tags" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tags_pkey" PRIMARY KEY ("id")
);

-- Junction table for Tasks
CREATE TABLE "task_tags" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_tags_pkey" PRIMARY KEY ("id")
);

-- Junction table for Deals
CREATE TABLE "deal_tags" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_tags_pkey" PRIMARY KEY ("id")
);

-- Unique constraints to prevent duplicate tag assignments
CREATE UNIQUE INDEX "tags_name_organizationId_key" ON "tags"("name", "organizationId");
CREATE UNIQUE INDEX "property_tags_propertyId_tagId_key" ON "property_tags"("propertyId", "tagId");
CREATE UNIQUE INDEX "client_tags_clientId_tagId_key" ON "client_tags"("clientId", "tagId");
CREATE UNIQUE INDEX "document_tags_documentId_tagId_key" ON "document_tags"("documentId", "tagId");
CREATE UNIQUE INDEX "event_tags_eventId_tagId_key" ON "event_tags"("eventId", "tagId");
CREATE UNIQUE INDEX "user_tags_userId_tagId_key" ON "user_tags"("userId", "tagId");
CREATE UNIQUE INDEX "task_tags_taskId_tagId_key" ON "task_tags"("taskId", "tagId");
CREATE UNIQUE INDEX "deal_tags_dealId_tagId_key" ON "deal_tags"("dealId", "tagId");

-- Indexes for efficient lookups
CREATE INDEX "tags_organizationId_idx" ON "tags"("organizationId");
CREATE INDEX "tags_category_idx" ON "tags"("category");
CREATE INDEX "tags_createdBy_idx" ON "tags"("createdBy");

CREATE INDEX "property_tags_propertyId_idx" ON "property_tags"("propertyId");
CREATE INDEX "property_tags_tagId_idx" ON "property_tags"("tagId");

CREATE INDEX "client_tags_clientId_idx" ON "client_tags"("clientId");
CREATE INDEX "client_tags_tagId_idx" ON "client_tags"("tagId");

CREATE INDEX "document_tags_documentId_idx" ON "document_tags"("documentId");
CREATE INDEX "document_tags_tagId_idx" ON "document_tags"("tagId");

CREATE INDEX "event_tags_eventId_idx" ON "event_tags"("eventId");
CREATE INDEX "event_tags_tagId_idx" ON "event_tags"("tagId");

CREATE INDEX "user_tags_userId_idx" ON "user_tags"("userId");
CREATE INDEX "user_tags_tagId_idx" ON "user_tags"("tagId");

CREATE INDEX "task_tags_taskId_idx" ON "task_tags"("taskId");
CREATE INDEX "task_tags_tagId_idx" ON "task_tags"("tagId");

CREATE INDEX "deal_tags_dealId_idx" ON "deal_tags"("dealId");
CREATE INDEX "deal_tags_tagId_idx" ON "deal_tags"("tagId");

-- Foreign key constraints
ALTER TABLE "property_tags" ADD CONSTRAINT "property_tags_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_tags" ADD CONSTRAINT "property_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_tags" ADD CONSTRAINT "client_tags_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_tags" ADD CONSTRAINT "client_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "crm_Accounts_Tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_tags" ADD CONSTRAINT "deal_tags_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_tags" ADD CONSTRAINT "deal_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
