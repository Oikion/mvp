-- Add composite index on PropertyRequestMatch for analytics query performance
-- Optimizes: WHERE organizationId AND matchScore >= threshold ORDER BY matchScore DESC
CREATE INDEX IF NOT EXISTS "property_request_matches_organizationId_matchScore_idx"
  ON "property_request_matches"("organizationId", "matchScore" DESC);

-- Change CrossOrgMatch.matchScore from Float to Decimal for consistency with PropertyRequestMatch
ALTER TABLE "cross_org_matches" ALTER COLUMN "matchScore" TYPE DECIMAL(65,30);
