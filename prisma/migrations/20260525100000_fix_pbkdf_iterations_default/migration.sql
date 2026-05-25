-- Migration: fix_pbkdf_iterations_default
-- Changes the default value for UserIdentityKey.pbkdfIterations from 100000 to 600000.
--
-- IMPORTANT: This migration only affects NEW rows created after this migration is applied.
-- Existing rows with pbkdfIterations < 600000 CANNOT be automatically migrated because
-- the PBKDF2-derived key was computed with those iterations. Re-deriving requires the
-- user's PIN/passphrase.
--
-- TODO: When a user logs in and their pbkdfIterations < 600000, prompt them to re-authenticate
-- so the identity key can be re-derived with 600000 iterations and the row updated.
-- See lib/e2ee/ for the re-derivation flow.

ALTER TABLE "UserIdentityKey" ALTER COLUMN "pbkdfIterations" SET DEFAULT 600000;
