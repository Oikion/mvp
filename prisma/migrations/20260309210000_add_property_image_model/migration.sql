-- CreateTable
CREATE TABLE "PropertyImage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "caption" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER NOT NULL,
    "originalFileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "uploadSessionId" TEXT,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyImage_propertyId_idx" ON "PropertyImage"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyImage_organizationId_idx" ON "PropertyImage"("organizationId");

-- CreateIndex
CREATE INDEX "PropertyImage_uploadSessionId_idx" ON "PropertyImage"("uploadSessionId");

-- CreateIndex
CREATE INDEX "PropertyImage_propertyId_position_idx" ON "PropertyImage"("propertyId", "position");

-- AddForeignKey
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
