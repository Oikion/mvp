-- AlterEnum
-- This migration adds a new value to an existing enum.
-- It MUST NOT be wrapped in a transaction (PostgreSQL restriction for ADD VALUE).
ALTER TYPE "EntityChangeEventType" ADD VALUE 'STAGE_CHANGED';
