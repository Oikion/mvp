-- RenameIndex (idempotent — IF EXISTS guards shadow-DB replays where the index may not yet exist)
ALTER INDEX IF EXISTS "OrgSubscription_organizationId_idx" RENAME TO "org_subscriptions_organizationId_idx";
