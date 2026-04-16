/*
  Warnings:

  - You are about to drop the column `mandatePrivacyLevel` on the `OrgNetworkSettings` table. All the data in the column will be lost.
  - You are about to drop the column `shareMandates` on the `OrgNetworkSettings` table. All the data in the column will be lost.
  - You are about to drop the `Mandate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MandateComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Mandate_Properties` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_DocumentsToMandates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_EventToMandates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Mandate" DROP CONSTRAINT "Mandate_assigned_to_fkey";

-- DropForeignKey
ALTER TABLE "MandateComment" DROP CONSTRAINT "MandateComment_mandateId_fkey";

-- DropForeignKey
ALTER TABLE "MandateComment" DROP CONSTRAINT "MandateComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Mandate_Properties" DROP CONSTRAINT "Mandate_Properties_mandateId_fkey";

-- DropForeignKey
ALTER TABLE "Mandate_Properties" DROP CONSTRAINT "Mandate_Properties_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "_DocumentsToMandates" DROP CONSTRAINT "_DocumentsToMandates_A_fkey";

-- DropForeignKey
ALTER TABLE "_DocumentsToMandates" DROP CONSTRAINT "_DocumentsToMandates_B_fkey";

-- DropForeignKey
ALTER TABLE "_EventToMandates" DROP CONSTRAINT "_EventToMandates_A_fkey";

-- DropForeignKey
ALTER TABLE "_EventToMandates" DROP CONSTRAINT "_EventToMandates_B_fkey";

-- AlterTable: rename columns to preserve existing data
ALTER TABLE "OrgNetworkSettings" RENAME COLUMN "shareMandates" TO "shareRequests";
ALTER TABLE "OrgNetworkSettings" RENAME COLUMN "mandatePrivacyLevel" TO "requestPrivacyLevel";

-- DropTable
DROP TABLE "Mandate";

-- DropTable
DROP TABLE "MandateComment";

-- DropTable
DROP TABLE "Mandate_Properties";

-- DropTable
DROP TABLE "_DocumentsToMandates";

-- DropTable
DROP TABLE "_EventToMandates";
