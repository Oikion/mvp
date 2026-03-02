-- CreateTable
CREATE TABLE "OrgEncryptionKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "encryptedDek" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgEncryptionKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgEncryptionKey_organizationId_key" ON "OrgEncryptionKey"("organizationId");
