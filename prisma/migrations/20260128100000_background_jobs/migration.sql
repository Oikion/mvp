-- Background Jobs Migration
-- Adds infrastructure for K8s job orchestration

-- Create enums for job types and status
CREATE TYPE "BackgroundJobType" AS ENUM ('MARKET_INTEL_SCRAPE', 'NEWSLETTER_SEND', 'PORTAL_PUBLISH_XE', 'BULK_EXPORT');
CREATE TYPE "BackgroundJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "JobPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- Create BackgroundJob table
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "type" "BackgroundJobType" NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "BackgroundJobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "progressMessage" TEXT,
    "k8sJobName" TEXT,
    "k8sPodName" TEXT,
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "priority" "JobPriority" NOT NULL DEFAULT 'NORMAL',

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- Create indexes for efficient queries
CREATE INDEX "BackgroundJob_organizationId_type_idx" ON "BackgroundJob"("organizationId", "type");
CREATE INDEX "BackgroundJob_status_idx" ON "BackgroundJob"("status");
CREATE INDEX "BackgroundJob_k8sJobName_idx" ON "BackgroundJob"("k8sJobName");
CREATE INDEX "BackgroundJob_createdAt_idx" ON "BackgroundJob"("createdAt");
