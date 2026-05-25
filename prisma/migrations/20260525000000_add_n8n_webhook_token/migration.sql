-- AlterTable: add per-org n8n webhook token to OrganizationSettings (C-1 security fix)
ALTER TABLE "OrganizationSettings" ADD COLUMN "n8nWebhookToken" TEXT;

-- CreateIndex: unique constraint so token lookups are O(1) and each token maps to exactly one org
CREATE UNIQUE INDEX "OrganizationSettings_n8nWebhookToken_key" ON "OrganizationSettings"("n8nWebhookToken");
