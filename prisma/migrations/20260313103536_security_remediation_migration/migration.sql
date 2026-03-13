-- AlterTable
ALTER TABLE "_EventToMandates" ADD CONSTRAINT "_EventToMandates_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_EventToMandates_AB_unique";
