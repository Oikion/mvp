-- CreateTable
CREATE TABLE "AiSystemPrompt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "variables" JSONB,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isSystemPrompt" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "AiSystemPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiSystemPrompt_name_key" ON "AiSystemPrompt"("name");

-- CreateIndex
CREATE INDEX "AiSystemPrompt_category_idx" ON "AiSystemPrompt"("category");

-- CreateIndex
CREATE INDEX "AiSystemPrompt_isEnabled_idx" ON "AiSystemPrompt"("isEnabled");

-- CreateIndex
CREATE INDEX "AiSystemPrompt_locale_idx" ON "AiSystemPrompt"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "AiSystemPrompt_name_locale_key" ON "AiSystemPrompt"("name", "locale");
