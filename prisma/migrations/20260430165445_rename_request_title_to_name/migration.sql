/*
  Warnings:

  - You are about to drop the column `title` on the `requests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "requests" DROP COLUMN "title",
ADD COLUMN     "name" TEXT;
