-- CreateTable
CREATE TABLE "doc_feedback" (
    "id" TEXT NOT NULL,
    "pageSlug" TEXT NOT NULL,
    "docScope" TEXT NOT NULL DEFAULT 'public',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "rating" TEXT NOT NULL,
    "comment" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doc_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "doc_feedback_pageSlug_locale_idx" ON "doc_feedback"("pageSlug", "locale");

-- CreateIndex
CREATE INDEX "doc_feedback_docScope_idx" ON "doc_feedback"("docScope");
