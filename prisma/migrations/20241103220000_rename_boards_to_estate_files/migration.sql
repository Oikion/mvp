-- Rename Boards table to EstateFiles
-- This migration checks if the table exists before renaming to avoid errors
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Boards') THEN
        ALTER TABLE "Boards" RENAME TO "EstateFiles";
    END IF;
END $$;
