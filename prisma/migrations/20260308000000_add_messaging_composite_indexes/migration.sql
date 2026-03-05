-- Composite indexes for Message table: common query patterns for listing + unread counts
CREATE INDEX IF NOT EXISTS "Message_channelId_isDeleted_createdAt_idx" ON "Message"("channelId", "isDeleted", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_conversationId_isDeleted_createdAt_idx" ON "Message"("conversationId", "isDeleted", "createdAt");

-- Composite index for ConversationParticipant: efficient filtering by user + active status
CREATE INDEX IF NOT EXISTS "ConversationParticipant_userId_leftAt_idx" ON "ConversationParticipant"("userId", "leftAt");
