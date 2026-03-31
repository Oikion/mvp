-- CreateTable
CREATE TABLE "website_contact_submissions" (
    "id" TEXT NOT NULL,
    "inquiryType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "orgName" TEXT,
    "message" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'el',
    "status" "SubmissionStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "website_contact_submissions_status_idx" ON "website_contact_submissions"("status");

-- CreateIndex
CREATE INDEX "website_contact_submissions_createdAt_idx" ON "website_contact_submissions"("createdAt");

-- CreateIndex
CREATE INDEX "website_contact_submissions_inquiryType_idx" ON "website_contact_submissions"("inquiryType");
