-- Idempotent migration: create tables if not existing, add columns/indexes safely.
-- Uses DO blocks with exception handling to handle pre-existing tables gracefully.

-- ============================================================
-- AgencyProfile
-- ============================================================

CREATE TABLE IF NOT EXISTS "AgencyProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL DEFAULT '',
    "logo" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'GR',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "socialLinks" JSONB,
    "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PERSONAL',
    "yearFounded" INTEGER,
    "licenseNumber" TEXT,
    "contactFormEnabled" BOOLEAN NOT NULL DEFAULT false,
    "contactFormFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgencyProfile_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "AgencyProfile" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
    ALTER TABLE "AgencyProfile" ADD COLUMN IF NOT EXISTS "slug" TEXT NOT NULL DEFAULT '';
    ALTER TABLE "AgencyProfile" ADD COLUMN IF NOT EXISTS "contactFormEnabled" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "AgencyProfile" ADD COLUMN IF NOT EXISTS "contactFormFields" JSONB;
    ALTER TABLE "AgencyProfile" ADD COLUMN IF NOT EXISTS "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PERSONAL';
    ALTER TABLE "AgencyProfile" ADD COLUMN IF NOT EXISTS "yearFounded" INTEGER;
    ALTER TABLE "AgencyProfile" ADD COLUMN IF NOT EXISTS "licenseNumber" TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    CREATE UNIQUE INDEX "AgencyProfile_organizationId_key" ON "AgencyProfile"("organizationId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE UNIQUE INDEX "AgencyProfile_slug_key" ON "AgencyProfile"("slug");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX "AgencyProfile_slug_idx" ON "AgencyProfile"("slug");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX "AgencyProfile_organizationId_idx" ON "AgencyProfile"("organizationId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX "AgencyProfile_visibility_idx" ON "AgencyProfile"("visibility");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ============================================================
-- AgencyContactSubmission
-- ============================================================

CREATE TABLE IF NOT EXISTS "AgencyContactSubmission" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formData" JSONB NOT NULL DEFAULT '{}',
    "status" "SubmissionStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "senderName" TEXT,
    "senderEmail" TEXT,
    CONSTRAINT "AgencyContactSubmission_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    CREATE INDEX "AgencyContactSubmission_profileId_idx" ON "AgencyContactSubmission"("profileId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "AgencyContactSubmission" ADD CONSTRAINT "AgencyContactSubmission_profileId_fkey"
        FOREIGN KEY ("profileId") REFERENCES "AgencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- OrganizationEncryptionStatus
-- ============================================================

CREATE TABLE IF NOT EXISTS "OrganizationEncryptionStatus" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "enabledAt" TIMESTAMP(3),
    "enabledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationEncryptionStatus_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    CREATE UNIQUE INDEX "OrganizationEncryptionStatus_organizationId_key" ON "OrganizationEncryptionStatus"("organizationId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX "OrganizationEncryptionStatus_organizationId_idx" ON "OrganizationEncryptionStatus"("organizationId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ============================================================
-- OrganizationEncryptionKey
-- ============================================================

CREATE TABLE IF NOT EXISTS "OrganizationEncryptionKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wrappedKey" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "grantedById" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "OrganizationEncryptionKey_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    CREATE INDEX "OrganizationEncryptionKey_organizationId_idx" ON "OrganizationEncryptionKey"("organizationId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX "OrganizationEncryptionKey_userId_idx" ON "OrganizationEncryptionKey"("userId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX "OrganizationEncryptionKey_organizationId_userId_keyVersion_idx"
        ON "OrganizationEncryptionKey"("organizationId", "userId", "keyVersion");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "OrganizationEncryptionKey" ADD CONSTRAINT "OrganizationEncryptionKey_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "OrganizationEncryptionKey" ADD CONSTRAINT "OrganizationEncryptionKey_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "OrganizationEncryptionStatus"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- DataExportStatus enum + DataExportRequest
-- ============================================================

DO $$ BEGIN
    CREATE TYPE "DataExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DataExportRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'json',
    "status" "DataExportStatus" NOT NULL DEFAULT 'PENDING',
    "downloadUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DataExportRequest_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    CREATE INDEX "DataExportRequest_organizationId_idx" ON "DataExportRequest"("organizationId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX "DataExportRequest_requestedById_idx" ON "DataExportRequest"("requestedById");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX "DataExportRequest_status_idx" ON "DataExportRequest"("status");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ============================================================
-- AdminAuditLog
-- ============================================================

CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX "AdminAuditLog_timestamp_idx" ON "AdminAuditLog"("timestamp");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ============================================================
-- AdminSecurityAudit
-- ============================================================

CREATE TABLE IF NOT EXISTS "AdminSecurityAudit" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "userName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "browserName" TEXT,
    "browserVersion" TEXT,
    "osName" TEXT,
    "osVersion" TEXT,
    "deviceType" TEXT,
    "country" TEXT,
    "city" TEXT,
    "path" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "denialReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminSecurityAudit_pkey" PRIMARY KEY ("id")
);

-- Add createdAt if missing from pre-existing table
DO $$ BEGIN
    ALTER TABLE "AdminSecurityAudit" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX "AdminSecurityAudit_eventType_idx" ON "AdminSecurityAudit"("eventType");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX "AdminSecurityAudit_userId_idx" ON "AdminSecurityAudit"("userId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX "AdminSecurityAudit_createdAt_idx" ON "AdminSecurityAudit"("createdAt");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
