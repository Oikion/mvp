-- _prisma_migration_ignore_transaction
-- AlterEnum (non-transactional — ADD VALUE cannot run in a transaction)
ALTER TYPE "ItemVisibility" ADD VALUE 'HIDDEN' BEFORE 'PERSONAL';
