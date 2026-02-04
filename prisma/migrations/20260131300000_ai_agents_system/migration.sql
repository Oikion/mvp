-- CreateEnum
CREATE TYPE "AiModelProvider" AS ENUM ('OPENAI', 'ANTHROPIC');

-- CreateEnum
CREATE TYPE "AiToolChoice" AS ENUM ('AUTO', 'REQUIRED', 'NONE');

-- CreateTable
CREATE TABLE "AiAgent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "systemPromptId" TEXT,
    "modelProvider" "AiModelProvider" NOT NULL DEFAULT 'OPENAI',
    "modelName" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 1000,
    "maxSteps" INTEGER NOT NULL DEFAULT 5,
    "toolChoice" "AiToolChoice" NOT NULL DEFAULT 'AUTO',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isSystemAgent" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "AiAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgentTool" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAgentTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationAgentConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "customSystemPrompt" TEXT,
    "modelOverride" TEXT,
    "temperatureOverride" DOUBLE PRECISION,
    "maxTokensOverride" INTEGER,
    "disabledToolIds" TEXT[],
    "enabledToolIds" TEXT[],
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationAgentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiAgent_name_key" ON "AiAgent"("name");

-- CreateIndex
CREATE INDEX "AiAgent_isEnabled_idx" ON "AiAgent"("isEnabled");

-- CreateIndex
CREATE INDEX "AiAgent_isSystemAgent_idx" ON "AiAgent"("isSystemAgent");

-- CreateIndex
CREATE INDEX "AiAgent_organizationId_idx" ON "AiAgent"("organizationId");

-- CreateIndex
CREATE INDEX "AiAgent_modelProvider_idx" ON "AiAgent"("modelProvider");

-- CreateIndex
CREATE INDEX "AiAgentTool_agentId_idx" ON "AiAgentTool"("agentId");

-- CreateIndex
CREATE INDEX "AiAgentTool_toolId_idx" ON "AiAgentTool"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "AiAgentTool_agentId_toolId_key" ON "AiAgentTool"("agentId", "toolId");

-- CreateIndex
CREATE INDEX "OrganizationAgentConfig_organizationId_idx" ON "OrganizationAgentConfig"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationAgentConfig_agentId_idx" ON "OrganizationAgentConfig"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationAgentConfig_organizationId_agentId_key" ON "OrganizationAgentConfig"("organizationId", "agentId");

-- AddForeignKey
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_systemPromptId_fkey" FOREIGN KEY ("systemPromptId") REFERENCES "AiSystemPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentTool" ADD CONSTRAINT "AiAgentTool_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentTool" ADD CONSTRAINT "AiAgentTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "AiTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAgentConfig" ADD CONSTRAINT "OrganizationAgentConfig_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
