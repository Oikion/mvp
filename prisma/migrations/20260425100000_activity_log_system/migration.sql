-- AlterEnum
-- This migration adds new values to ActivityKind for system-generated activity entries.
-- It MUST NOT be wrapped in a transaction (PostgreSQL restriction for ADD VALUE).
ALTER TYPE "ActivityKind" ADD VALUE 'CREATED';
ALTER TYPE "ActivityKind" ADD VALUE 'UPDATED';
ALTER TYPE "ActivityKind" ADD VALUE 'LINKED';
ALTER TYPE "ActivityKind" ADD VALUE 'UNLINKED';
ALTER TYPE "ActivityKind" ADD VALUE 'STAGE_CHANGED';
ALTER TYPE "ActivityKind" ADD VALUE 'CALENDAR_EVENT_ADDED';
ALTER TYPE "ActivityKind" ADD VALUE 'CALENDAR_EVENT_REMOVED';

-- AlterTable — add structured metadata column to activities
ALTER TABLE "activities" ADD COLUMN "metadata" JSONB;
