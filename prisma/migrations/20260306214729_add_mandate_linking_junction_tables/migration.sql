-- CreateTable
CREATE TABLE "Mandate_Properties" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mandateId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "Mandate_Properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mandate_Clients" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mandateId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "Mandate_Clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mandate_Properties_mandateId_propertyId_key" ON "Mandate_Properties"("mandateId", "propertyId");

-- CreateIndex
CREATE INDEX "Mandate_Properties_mandateId_idx" ON "Mandate_Properties"("mandateId");

-- CreateIndex
CREATE INDEX "Mandate_Properties_propertyId_idx" ON "Mandate_Properties"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Mandate_Clients_mandateId_clientId_key" ON "Mandate_Clients"("mandateId", "clientId");

-- CreateIndex
CREATE INDEX "Mandate_Clients_mandateId_idx" ON "Mandate_Clients"("mandateId");

-- CreateIndex
CREATE INDEX "Mandate_Clients_clientId_idx" ON "Mandate_Clients"("clientId");

-- AddForeignKey
ALTER TABLE "Mandate_Properties" ADD CONSTRAINT "Mandate_Properties_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate_Properties" ADD CONSTRAINT "Mandate_Properties_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate_Clients" ADD CONSTRAINT "Mandate_Clients_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate_Clients" ADD CONSTRAINT "Mandate_Clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing clientId data to junction table
INSERT INTO "Mandate_Clients" (id, "createdAt", "mandateId", "clientId")
SELECT gen_random_uuid(), COALESCE("client_linked_at", NOW()), id, "clientId"
FROM "Mandate"
WHERE "clientId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Mandate" DROP CONSTRAINT IF EXISTS "Mandate_clientId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Mandate_clientId_idx";

-- AlterTable
ALTER TABLE "Mandate" DROP COLUMN IF EXISTS "clientId",
DROP COLUMN IF EXISTS "client_linked_at";
