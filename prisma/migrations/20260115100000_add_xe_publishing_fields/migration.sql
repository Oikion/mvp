-- Add XE.gr publishing fields to Properties
ALTER TABLE "Properties" ADD COLUMN "xePublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Properties" ADD COLUMN "xeRefId" TEXT;

-- Ensure XE reference IDs are unique when present
CREATE UNIQUE INDEX "Properties_xeRefId_key" ON "Properties"("xeRefId");
CREATE INDEX "Properties_xePublished_idx" ON "Properties"("xePublished");
