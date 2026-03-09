-- AlterTable
ALTER TABLE "ChangelogEntry" ADD COLUMN "broadcastCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ChangelogEntry" ADD COLUMN "lastNotifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ChangelogBroadcast" (
    "id" TEXT NOT NULL,
    "changelogEntryId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipientCount" INTEGER NOT NULL,
    "resendEmailIds" TEXT[],
    "sentById" TEXT NOT NULL,

    CONSTRAINT "ChangelogBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChangelogBroadcast_changelogEntryId_idx" ON "ChangelogBroadcast"("changelogEntryId");

-- CreateIndex
CREATE INDEX "ChangelogBroadcast_sentAt_idx" ON "ChangelogBroadcast"("sentAt");

-- AddForeignKey
ALTER TABLE "ChangelogBroadcast" ADD CONSTRAINT "ChangelogBroadcast_changelogEntryId_fkey" FOREIGN KEY ("changelogEntryId") REFERENCES "ChangelogEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogBroadcast" ADD CONSTRAINT "ChangelogBroadcast_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
