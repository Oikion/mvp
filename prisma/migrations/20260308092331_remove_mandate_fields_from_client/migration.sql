-- AlterTable: Remove mandate-related fields from Clients
ALTER TABLE "Clients" DROP COLUMN IF EXISTS "areas_of_interest";
ALTER TABLE "Clients" DROP COLUMN IF EXISTS "budget_max";
ALTER TABLE "Clients" DROP COLUMN IF EXISTS "budget_min";
ALTER TABLE "Clients" DROP COLUMN IF EXISTS "financing_type";
ALTER TABLE "Clients" DROP COLUMN IF EXISTS "intent";
ALTER TABLE "Clients" DROP COLUMN IF EXISTS "needs_mortgage_help";
ALTER TABLE "Clients" DROP COLUMN IF EXISTS "preapproval_bank";
ALTER TABLE "Clients" DROP COLUMN IF EXISTS "property_preferences";
ALTER TABLE "Clients" DROP COLUMN IF EXISTS "purpose";
ALTER TABLE "Clients" DROP COLUMN IF EXISTS "timeline";

-- DropEnum (only if not referenced elsewhere)
DROP TYPE IF EXISTS "ClientIntent";
DROP TYPE IF EXISTS "FinancingType";
