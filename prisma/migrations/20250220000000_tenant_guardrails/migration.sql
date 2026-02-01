-- Tenant guardrail migration: enforce organization ownership and enable RLS
-- NOTE: All operations are wrapped in IF EXISTS checks for shadow database compatibility

-- Helper constant for legacy rows
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_settings WHERE name = 'app.current_tenant') THEN
    PERFORM set_config('app.current_tenant', '', false);
  END IF;
END $$;

-- Ensure organizationId is populated for existing nullable columns (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Clients') THEN
    UPDATE "Clients" SET "organizationId" = coalesce("organizationId", '00000000-0000-0000-0000-000000000000') WHERE "organizationId" IS NULL;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Properties') THEN
    UPDATE "Properties" SET "organizationId" = coalesce("organizationId", '00000000-0000-0000-0000-000000000000') WHERE "organizationId" IS NULL;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'CalendarEvent') THEN
    UPDATE "CalendarEvent" SET "organizationId" = coalesce("organizationId", '00000000-0000-0000-0000-000000000000') WHERE "organizationId" IS NULL;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Feedback') THEN
    UPDATE "Feedback" SET "organizationId" = coalesce("organizationId", '00000000-0000-0000-0000-000000000000') WHERE "organizationId" IS NULL;
  END IF;
END $$;

-- Add new organizationId columns where missing (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Documents') THEN
    ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
    UPDATE "Documents" SET "organizationId" = coalesce("organizationId", '00000000-0000-0000-0000-000000000000') WHERE "organizationId" IS NULL;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Client_Contacts') THEN
    ALTER TABLE "Client_Contacts" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
    UPDATE "Client_Contacts" SET "organizationId" = coalesce("organizationId", '00000000-0000-0000-0000-000000000000') WHERE "organizationId" IS NULL;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_Accounts_Tasks') THEN
    ALTER TABLE "crm_Accounts_Tasks" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
    UPDATE "crm_Accounts_Tasks" SET "organizationId" = coalesce("organizationId", '00000000-0000-0000-0000-000000000000') WHERE "organizationId" IS NULL;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_Accounts_Tasks_Comments') THEN
    ALTER TABLE "crm_Accounts_Tasks_Comments" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
    UPDATE "crm_Accounts_Tasks_Comments" SET "organizationId" = coalesce("organizationId", '00000000-0000-0000-0000-000000000000') WHERE "organizationId" IS NULL;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'MyAccount') THEN
    ALTER TABLE "MyAccount" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
    UPDATE "MyAccount" SET "organizationId" = coalesce("organizationId", '00000000-0000-0000-0000-000000000000') WHERE "organizationId" IS NULL;
  END IF;
END $$;

-- Enforce NOT NULL constraints (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Clients') THEN
    ALTER TABLE "Clients" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Properties') THEN
    ALTER TABLE "Properties" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Documents') THEN
    ALTER TABLE "Documents" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Client_Contacts') THEN
    ALTER TABLE "Client_Contacts" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_Accounts_Tasks') THEN
    ALTER TABLE "crm_Accounts_Tasks" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_Accounts_Tasks_Comments') THEN
    ALTER TABLE "crm_Accounts_Tasks_Comments" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'MyAccount') THEN
    ALTER TABLE "MyAccount" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'CalendarEvent') THEN
    ALTER TABLE "CalendarEvent" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Feedback') THEN
    ALTER TABLE "Feedback" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
END $$;

-- Enable row level security and tenant policies (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Clients') THEN
    ALTER TABLE "Clients" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_clients" ON "Clients";
    CREATE POLICY "tenant_isolation_clients" ON "Clients"
    USING (
      current_setting('app.current_tenant', true) IS NULL OR
      current_setting('app.current_tenant', true) = '' OR
      "organizationId" = current_setting('app.current_tenant', true)
    );
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Properties') THEN
    ALTER TABLE "Properties" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_properties" ON "Properties";
    CREATE POLICY "tenant_isolation_properties" ON "Properties"
    USING (
      current_setting('app.current_tenant', true) IS NULL OR
      current_setting('app.current_tenant', true) = '' OR
      "organizationId" = current_setting('app.current_tenant', true)
    );
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Documents') THEN
    ALTER TABLE "Documents" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_documents" ON "Documents";
    CREATE POLICY "tenant_isolation_documents" ON "Documents"
    USING (
      current_setting('app.current_tenant', true) IS NULL OR
      current_setting('app.current_tenant', true) = '' OR
      "organizationId" = current_setting('app.current_tenant', true)
    );
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Client_Contacts') THEN
    ALTER TABLE "Client_Contacts" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_client_contacts" ON "Client_Contacts";
    CREATE POLICY "tenant_isolation_client_contacts" ON "Client_Contacts"
    USING (
      current_setting('app.current_tenant', true) IS NULL OR
      current_setting('app.current_tenant', true) = '' OR
      "organizationId" = current_setting('app.current_tenant', true)
    );
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_Accounts_Tasks') THEN
    ALTER TABLE "crm_Accounts_Tasks" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_crm_tasks" ON "crm_Accounts_Tasks";
    CREATE POLICY "tenant_isolation_crm_tasks" ON "crm_Accounts_Tasks"
    USING (
      current_setting('app.current_tenant', true) IS NULL OR
      current_setting('app.current_tenant', true) = '' OR
      "organizationId" = current_setting('app.current_tenant', true)
    );
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_Accounts_Tasks_Comments') THEN
    ALTER TABLE "crm_Accounts_Tasks_Comments" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_crm_task_comments" ON "crm_Accounts_Tasks_Comments";
    CREATE POLICY "tenant_isolation_crm_task_comments" ON "crm_Accounts_Tasks_Comments"
    USING (
      current_setting('app.current_tenant', true) IS NULL OR
      current_setting('app.current_tenant', true) = '' OR
      "organizationId" = current_setting('app.current_tenant', true)
    );
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'MyAccount') THEN
    ALTER TABLE "MyAccount" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_my_account" ON "MyAccount";
    CREATE POLICY "tenant_isolation_my_account" ON "MyAccount"
    USING (
      current_setting('app.current_tenant', true) IS NULL OR
      current_setting('app.current_tenant', true) = '' OR
      "organizationId" = current_setting('app.current_tenant', true)
    );
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'CalendarEvent') THEN
    ALTER TABLE "CalendarEvent" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_calendar_events" ON "CalendarEvent";
    CREATE POLICY "tenant_isolation_calendar_events" ON "CalendarEvent"
    USING (
      current_setting('app.current_tenant', true) IS NULL OR
      current_setting('app.current_tenant', true) = '' OR
      "organizationId" = current_setting('app.current_tenant', true)
    );
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Feedback') THEN
    ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_feedback" ON "Feedback";
    CREATE POLICY "tenant_isolation_feedback" ON "Feedback"
    USING (
      current_setting('app.current_tenant', true) IS NULL OR
      current_setting('app.current_tenant', true) = '' OR
      "organizationId" = current_setting('app.current_tenant', true)
    );
  END IF;
END $$;
