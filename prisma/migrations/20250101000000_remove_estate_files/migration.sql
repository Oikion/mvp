-- Remove EstateFiles table and all its references
-- This migration drops the foreign key constraint and the table itself

DO $$
BEGIN
    -- Drop the foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'EstateFiles_user_fkey' 
        AND table_name = 'EstateFiles'
    ) THEN
        ALTER TABLE "EstateFiles" DROP CONSTRAINT "EstateFiles_user_fkey";
        RAISE NOTICE 'Dropped foreign key constraint EstateFiles_user_fkey';
    END IF;

    -- Drop the table if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'EstateFiles'
    ) THEN
        DROP TABLE "EstateFiles" CASCADE;
        RAISE NOTICE 'Dropped EstateFiles table';
    END IF;
END $$;
