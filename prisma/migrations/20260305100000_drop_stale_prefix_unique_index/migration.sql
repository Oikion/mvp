-- Fix: Drop the stale unique index on prefix alone.
-- The previous migration used ALTER TABLE DROP CONSTRAINT which doesn't work
-- for Prisma-created @@unique indexes (they're indexes, not constraints).
DROP INDEX IF EXISTS "IdSequence_prefix_key";
