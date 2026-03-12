-- CreateTable: Many-to-many join table between CalendarEvent and Mandate
CREATE TABLE "_EventToMandates" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_EventToMandates_AB_unique" ON "_EventToMandates"("A", "B");

CREATE INDEX "_EventToMandates_B_index" ON "_EventToMandates"("B");

-- AddForeignKey
ALTER TABLE "_EventToMandates" ADD CONSTRAINT "_EventToMandates_A_fkey" FOREIGN KEY ("A") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToMandates" ADD CONSTRAINT "_EventToMandates_B_fkey" FOREIGN KEY ("B") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
