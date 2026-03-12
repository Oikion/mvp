-- CreateEnum
CREATE TYPE "ItemVisibility" AS ENUM ('PERSONAL', 'SECURE', 'PUBLIC');

-- AlterTable: Property — add visibility, migrate data, drop old columns
ALTER TABLE "Properties" ADD COLUMN "visibility" "ItemVisibility" NOT NULL DEFAULT 'PERSONAL';

UPDATE "Properties"
SET "visibility" = CASE
  WHEN "portal_visibility" = 'PUBLIC'   THEN 'PUBLIC'::"ItemVisibility"
  WHEN "portal_visibility" = 'SELECTED' THEN 'SECURE'::"ItemVisibility"
  ELSE 'PERSONAL'::"ItemVisibility"
END
WHERE "portal_visibility" IS NOT NULL;

ALTER TABLE "Properties" DROP COLUMN "portal_visibility";
ALTER TABLE "Properties" DROP COLUMN "networkVisible";

-- AlterTable: Clients — add visibility
ALTER TABLE "Clients" ADD COLUMN "visibility" "ItemVisibility" NOT NULL DEFAULT 'PERSONAL';

-- AlterTable: Mandate — add visibility, migrate data, drop old column
ALTER TABLE "Mandate" ADD COLUMN "visibility" "ItemVisibility" NOT NULL DEFAULT 'PERSONAL';

UPDATE "Mandate"
SET "visibility" = 'SECURE'::"ItemVisibility"
WHERE "networkVisible" = true;

ALTER TABLE "Mandate" DROP COLUMN "networkVisible";

-- DropEnum
DROP TYPE IF EXISTS "PortalVisibility";

-- CreateIndex
CREATE INDEX "Properties_visibility_idx" ON "Properties"("visibility");
CREATE INDEX "Clients_visibility_idx" ON "Clients"("visibility");
CREATE INDEX "Mandate_visibility_idx" ON "Mandate"("visibility");

-- DropIndex
DROP INDEX IF EXISTS "Properties_portal_visibility_idx";
DROP INDEX IF EXISTS "Properties_networkVisible_idx";
DROP INDEX IF EXISTS "Mandate_networkVisible_idx";
