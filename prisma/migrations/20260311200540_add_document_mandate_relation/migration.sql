-- AlterTable
ALTER TABLE "Documents" ADD COLUMN     "linkedMandatesIds" TEXT[];

-- CreateTable
CREATE TABLE "_DocumentsToMandates" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentsToMandates_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DocumentsToMandates_B_index" ON "_DocumentsToMandates"("B");

-- AddForeignKey
ALTER TABLE "_DocumentsToMandates" ADD CONSTRAINT "_DocumentsToMandates_A_fkey" FOREIGN KEY ("A") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToMandates" ADD CONSTRAINT "_DocumentsToMandates_B_fkey" FOREIGN KEY ("B") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
