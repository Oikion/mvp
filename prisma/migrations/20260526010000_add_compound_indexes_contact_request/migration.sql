-- Compound indexes for frequent join patterns on Contact and Request models
-- These support agent-scoped queries: "show me all contacts/requests assigned to agent X in org Y"

CREATE INDEX IF NOT EXISTS "contacts_organizationId_assignedAgentId_idx" ON "contacts"("organizationId", "assignedAgentId");
CREATE INDEX IF NOT EXISTS "requests_organizationId_assignedAgentId_idx" ON "requests"("organizationId", "assignedAgentId");
CREATE INDEX IF NOT EXISTS "requests_organizationId_createdAt_status_idx" ON "requests"("organizationId", "createdAt", "status");
