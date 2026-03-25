-- _prisma_migration_ignore_transaction
-- AlterEnum (must run outside transaction and be committed before the value can be used)
ALTER TYPE "DataDeletionStatus" ADD VALUE IF NOT EXISTS 'PENDING_VERIFICATION';
