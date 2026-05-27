-- Security audit fixes for messaging schema
-- H-2: TypingIndicator unique constraints now include organizationId (tenant isolation)
-- M-5: MessageRead composite index on (userId, messageId) for efficient lookup
-- M-7: UserPresence gains nullable organizationId + compound index
-- L-2: Conversation externalThreadId unique per organization

-- H-2: Drop old TypingIndicator unique constraints (2-column) and create new ones (3-column with organizationId)
DROP INDEX IF EXISTS "TypingIndicator_channelId_userId_key";
DROP INDEX IF EXISTS "TypingIndicator_conversationId_userId_key";

CREATE UNIQUE INDEX "TypingIndicator_channelId_userId_organizationId_key" ON "TypingIndicator"("channelId", "userId", "organizationId");
CREATE UNIQUE INDEX "TypingIndicator_conversationId_userId_organizationId_key" ON "TypingIndicator"("conversationId", "userId", "organizationId");

-- M-5: MessageRead composite index for efficient (userId, messageId) lookups
CREATE INDEX IF NOT EXISTS "MessageRead_userId_messageId_idx" ON "MessageRead"("userId", "messageId");

-- M-7: UserPresence — add nullable organizationId column and compound index
ALTER TABLE "UserPresence" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

CREATE INDEX IF NOT EXISTS "UserPresence_organizationId_status_idx" ON "UserPresence"("organizationId", "status");

-- L-2: Conversation — externalThreadId unique per organization (prevents duplicate external thread ingestion)
CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_externalThreadId_organizationId_key" ON "Conversation"("externalThreadId", "organizationId");
