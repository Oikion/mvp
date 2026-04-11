-- DropForeignKey
ALTER TABLE "ClientComment" DROP CONSTRAINT "ClientComment_clientId_fkey";

-- DropForeignKey
ALTER TABLE "ClientComment" DROP CONSTRAINT "ClientComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Client_Contacts" DROP CONSTRAINT "Client_Contacts_assigned_to_fkey";

-- DropForeignKey
ALTER TABLE "Client_Contacts" DROP CONSTRAINT "Client_Contacts_clientsIDs_fkey";

-- DropForeignKey
ALTER TABLE "Client_Contacts" DROP CONSTRAINT "Client_Contacts_created_by_fkey";

-- DropForeignKey
ALTER TABLE "Client_Properties" DROP CONSTRAINT "Client_Properties_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Client_Properties" DROP CONSTRAINT "Client_Properties_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Clients" DROP CONSTRAINT "Clients_assigned_to_fkey";

-- DropForeignKey
ALTER TABLE "Mandate_Clients" DROP CONSTRAINT "Mandate_Clients_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Mandate_Clients" DROP CONSTRAINT "Mandate_Clients_mandateId_fkey";

-- DropForeignKey
ALTER TABLE "_DocumentsToClientContacts" DROP CONSTRAINT "_DocumentsToClientContacts_A_fkey";

-- DropForeignKey
ALTER TABLE "_DocumentsToClientContacts" DROP CONSTRAINT "_DocumentsToClientContacts_B_fkey";

-- DropForeignKey
ALTER TABLE "_DocumentsToClients" DROP CONSTRAINT "_DocumentsToClients_A_fkey";

-- DropForeignKey
ALTER TABLE "_DocumentsToClients" DROP CONSTRAINT "_DocumentsToClients_B_fkey";

-- DropForeignKey
ALTER TABLE "_EventToClients" DROP CONSTRAINT "_EventToClients_A_fkey";

-- DropForeignKey
ALTER TABLE "_EventToClients" DROP CONSTRAINT "_EventToClients_B_fkey";

-- DropForeignKey
ALTER TABLE "_watching_accounts" DROP CONSTRAINT "_watching_accounts_A_fkey";

-- DropForeignKey
ALTER TABLE "_watching_accounts" DROP CONSTRAINT "_watching_accounts_B_fkey";

-- DropForeignKey
ALTER TABLE "crm_Accounts_Tasks" DROP CONSTRAINT "crm_Accounts_Tasks_account_fkey";

-- DropForeignKey
ALTER TABLE "deals" DROP CONSTRAINT "deals_clientId_fkey";

-- DropForeignKey
ALTER TABLE "property_showings" DROP CONSTRAINT "property_showings_clientId_fkey";

-- DropIndex
DROP INDEX "deals_clientId_idx";

-- DropIndex
DROP INDEX "property_showings_clientId_idx";

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "relatedContactId" TEXT,
ADD COLUMN     "relatedDocumentId" TEXT,
ADD COLUMN     "relatedPropertyId" TEXT;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "watchers" TEXT[];

-- AlterTable
ALTER TABLE "deals" DROP COLUMN "clientId";

-- AlterTable
ALTER TABLE "property_showings" DROP COLUMN "clientId";

-- DropTable
DROP TABLE "ClientComment";

-- DropTable
DROP TABLE "Client_Contacts";

-- DropTable
DROP TABLE "Client_Properties";

-- DropTable
DROP TABLE "Clients";

-- DropTable
DROP TABLE "Mandate_Clients";

-- DropTable
DROP TABLE "_DocumentsToClientContacts";

-- DropTable
DROP TABLE "_DocumentsToClients";

-- DropTable
DROP TABLE "_EventToClients";

-- DropTable
DROP TABLE "_watching_accounts";

-- DropEnum
DROP TYPE "ClientContactType";

-- CreateTable
CREATE TABLE "contact_properties" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "contact_properties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_properties_organizationId_idx" ON "contact_properties"("organizationId");

-- CreateIndex
CREATE INDEX "contact_properties_contactId_idx" ON "contact_properties"("contactId");

-- CreateIndex
CREATE INDEX "contact_properties_propertyId_idx" ON "contact_properties"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "contact_properties_contactId_propertyId_key" ON "contact_properties"("contactId", "propertyId");

-- CreateIndex
CREATE INDEX "activities_relatedDocumentId_idx" ON "activities"("relatedDocumentId");

-- CreateIndex
CREATE INDEX "activities_relatedContactId_idx" ON "activities"("relatedContactId");

-- CreateIndex
CREATE INDEX "activities_relatedPropertyId_idx" ON "activities"("relatedPropertyId");

-- AddForeignKey
ALTER TABLE "contact_properties" ADD CONSTRAINT "contact_properties_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_properties" ADD CONSTRAINT "contact_properties_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_relatedDocumentId_fkey" FOREIGN KEY ("relatedDocumentId") REFERENCES "Documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_relatedContactId_fkey" FOREIGN KEY ("relatedContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_relatedPropertyId_fkey" FOREIGN KEY ("relatedPropertyId") REFERENCES "Properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
