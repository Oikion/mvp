/*
  Warnings:

  - You are about to drop the column `additionalContactIds` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `contactId` on the `requests` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "requests" DROP CONSTRAINT "requests_contactId_fkey";

-- DropIndex
DROP INDEX "requests_contactId_idx";

-- AlterTable
ALTER TABLE "requests" DROP COLUMN "additionalContactIds",
DROP COLUMN "contactId";

-- CreateTable
CREATE TABLE "request_contacts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_contacts_organizationId_idx" ON "request_contacts"("organizationId");

-- CreateIndex
CREATE INDEX "request_contacts_requestId_idx" ON "request_contacts"("requestId");

-- CreateIndex
CREATE INDEX "request_contacts_contactId_idx" ON "request_contacts"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "request_contacts_requestId_contactId_key" ON "request_contacts"("requestId", "contactId");

-- AddForeignKey
ALTER TABLE "request_contacts" ADD CONSTRAINT "request_contacts_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_contacts" ADD CONSTRAINT "request_contacts_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
