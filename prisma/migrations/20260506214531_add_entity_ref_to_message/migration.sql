-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "linkedEntityFriendlyId" TEXT,
ADD COLUMN     "linkedEntityId" TEXT,
ADD COLUMN     "linkedEntitySubtitle" TEXT,
ADD COLUMN     "linkedEntityTitle" TEXT,
ADD COLUMN     "linkedEntityType" TEXT;

-- CreateIndex
CREATE INDEX "Message_linkedEntityId_idx" ON "Message"("linkedEntityId");
