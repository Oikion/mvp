-- _prisma_migration_ignore_transaction
-- Rename PERSONAL → PRIVATE in ItemVisibility
-- Note: ALTER TYPE ... RENAME VALUE renames the enum label in-place.
-- Existing rows automatically reflect the new label name — no UPDATE needed.
ALTER TYPE "ItemVisibility" RENAME VALUE 'PERSONAL' TO 'PRIVATE';

-- Rename PERSONAL → PRIVATE in ProfileVisibility
ALTER TYPE "ProfileVisibility" RENAME VALUE 'PERSONAL' TO 'PRIVATE';
