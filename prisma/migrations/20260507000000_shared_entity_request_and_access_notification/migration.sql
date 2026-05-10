-- _prisma_migration_ignore_transaction
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL.
-- Prisma's transaction wrapper is disabled for this migration file.

-- Add REQUEST to SharedEntityType enum
ALTER TYPE "SharedEntityType" ADD VALUE IF NOT EXISTS 'REQUEST';

-- Add ENTITY_ACCESS_REQUESTED to NotificationCategory enum
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'ENTITY_ACCESS_REQUESTED';

-- Add REQUEST to NotificationEntityType enum
ALTER TYPE "NotificationEntityType" ADD VALUE IF NOT EXISTS 'REQUEST';
