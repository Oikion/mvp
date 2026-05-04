-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT;

-- AlterTable
ALTER TABLE "Documents" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT;

-- AlterTable
ALTER TABLE "Properties" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT;

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT;

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT;

-- CreateIndex
CREATE INDEX "CalendarEvent_archivedAt_idx" ON "CalendarEvent"("archivedAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_organizationId_archivedAt_idx" ON "CalendarEvent"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "Documents_archivedAt_idx" ON "Documents"("archivedAt");

-- CreateIndex
CREATE INDEX "Documents_organizationId_archivedAt_idx" ON "Documents"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "Properties_archivedAt_idx" ON "Properties"("archivedAt");

-- CreateIndex
CREATE INDEX "Properties_organizationId_archivedAt_idx" ON "Properties"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "contacts_archivedAt_idx" ON "contacts"("archivedAt");

-- CreateIndex
CREATE INDEX "contacts_organizationId_archivedAt_idx" ON "contacts"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "deals_archivedAt_idx" ON "deals"("archivedAt");

-- CreateIndex
CREATE INDEX "deals_organizationId_archivedAt_idx" ON "deals"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "requests_archivedAt_idx" ON "requests"("archivedAt");

-- CreateIndex
CREATE INDEX "requests_organizationId_archivedAt_idx" ON "requests"("organizationId", "archivedAt");
