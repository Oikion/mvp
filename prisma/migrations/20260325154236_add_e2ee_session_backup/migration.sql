-- CreateTable
CREATE TABLE "E2eeSessionBackup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "encryptedState" TEXT NOT NULL,
    "ephemeralPubKey" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "dekVersion" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "E2eeSessionBackup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "E2eeSessionBackup_userId_organizationId_idx" ON "E2eeSessionBackup"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "E2eeSessionBackup_userId_organizationId_sessionType_session_key" ON "E2eeSessionBackup"("userId", "organizationId", "sessionType", "sessionKey");
