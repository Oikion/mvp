-- Drop the 4 orphaned legacy enum types left after the clients->contacts and
-- mandates->requests migration. No table column references any of them (verified
-- via pg_attribute: 0 dependent columns), so these DROP TYPE statements are safe.
-- MandateType is intentionally KEPT (still used by Properties.mandateType).

-- DropEnum
DROP TYPE "ClientStatus";

-- DropEnum
DROP TYPE "ClientType";

-- DropEnum
DROP TYPE "MandateStatus";

-- DropEnum
DROP TYPE "MandateUrgency";
