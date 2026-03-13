-- AlterTable: Add key rotation fields to OrgEncryptionKey
ALTER TABLE "OrgEncryptionKey" ADD COLUMN "keyVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "OrgEncryptionKey" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "OrgEncryptionKey" ADD COLUMN "rotatedAt" TIMESTAMP(3);

-- DropIndex: Remove old single-column unique constraint
DROP INDEX "OrgEncryptionKey_organizationId_key";

-- CreateIndex: Compound unique on (organizationId, keyVersion)
CREATE UNIQUE INDEX "OrgEncryptionKey_organizationId_keyVersion_key" ON "OrgEncryptionKey"("organizationId", "keyVersion");

-- CreateIndex: Performance index for active key lookups
CREATE INDEX "OrgEncryptionKey_organizationId_isActive_idx" ON "OrgEncryptionKey"("organizationId", "isActive");
