-- DropForeignKey
ALTER TABLE "Feedback" DROP CONSTRAINT "Feedback_userId_fkey";

-- CreateIndex
CREATE INDEX "Deal_proposedById_idx" ON "Deal"("proposedById");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
