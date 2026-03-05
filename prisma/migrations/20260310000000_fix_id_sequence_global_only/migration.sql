-- Fix: Consolidate org-specific IdSequence rows back into global rows.
-- The org-scoped sequences generated duplicate IDs across orgs because
-- friendly IDs (e.g. prp-000001) don't embed the org scope.

-- For each prefix, set the global row's lastValue to the MAX across all rows
-- (including org-specific ones that may have advanced beyond the global row).
UPDATE "IdSequence" g
SET "lastValue" = sub.max_val, "updatedAt" = NOW()
FROM (
  SELECT prefix, MAX("lastValue") AS max_val
  FROM "IdSequence"
  GROUP BY prefix
) sub
WHERE g.prefix = sub.prefix
  AND g."organizationId" = '__global__'
  AND g."lastValue" < sub.max_val;

-- Delete org-specific rows (keep only __global__ rows)
DELETE FROM "IdSequence" WHERE "organizationId" != '__global__';
