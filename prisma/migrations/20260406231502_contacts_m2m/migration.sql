-- CreateTable
CREATE TABLE "_EventToContacts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventToContacts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EventToRequests" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventToRequests_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DocumentsToRequests" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentsToRequests_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DocumentsToContacts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentsToContacts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EventToContacts_B_index" ON "_EventToContacts"("B");

-- CreateIndex
CREATE INDEX "_EventToRequests_B_index" ON "_EventToRequests"("B");

-- CreateIndex
CREATE INDEX "_DocumentsToRequests_B_index" ON "_DocumentsToRequests"("B");

-- CreateIndex
CREATE INDEX "_DocumentsToContacts_B_index" ON "_DocumentsToContacts"("B");

-- AddForeignKey
ALTER TABLE "_EventToContacts" ADD CONSTRAINT "_EventToContacts_A_fkey" FOREIGN KEY ("A") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToContacts" ADD CONSTRAINT "_EventToContacts_B_fkey" FOREIGN KEY ("B") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToRequests" ADD CONSTRAINT "_EventToRequests_A_fkey" FOREIGN KEY ("A") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToRequests" ADD CONSTRAINT "_EventToRequests_B_fkey" FOREIGN KEY ("B") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToRequests" ADD CONSTRAINT "_DocumentsToRequests_A_fkey" FOREIGN KEY ("A") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToRequests" ADD CONSTRAINT "_DocumentsToRequests_B_fkey" FOREIGN KEY ("B") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToContacts" ADD CONSTRAINT "_DocumentsToContacts_A_fkey" FOREIGN KEY ("A") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToContacts" ADD CONSTRAINT "_DocumentsToContacts_B_fkey" FOREIGN KEY ("B") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
