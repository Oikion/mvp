/*
  Warnings:

  - You are about to drop the `OrganizationEncryptionKey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrganizationEncryptionStatus` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrganizationEncryptionKey" DROP CONSTRAINT "OrganizationEncryptionKey_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationEncryptionKey" DROP CONSTRAINT "OrganizationEncryptionKey_userId_fkey";

-- DropTable
DROP TABLE "OrganizationEncryptionKey";

-- DropTable
DROP TABLE "OrganizationEncryptionStatus";
