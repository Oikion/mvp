import { NextResponse } from "next/server";
import { timingSafeEqual, createHmac } from "crypto";
import { prismadb } from "@/lib/prisma";
import { runIntraOrgMatches } from "@/actions/matchmaking/compute-intra-org-matches";
import { startCronExecution, completeCronExecution, failCronExecution } from "@/lib/cron-execution";

// Hash both sides to a fixed 32-byte digest so timingSafeEqual always runs
// regardless of token length, preventing a timing side-channel on secret length.
const _HMAC_KEY = Buffer.alloc(32);

/**
 * Wraps a promise with a hard timeout so a single slow org cannot block
 * all subsequent orgs in the sequential processing loop.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
    ),
  ]);
}

function verifyAuthToken(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = createHmac("sha256", _HMAC_KEY).update(`Bearer ${expected}`).digest();
  const b = createHmac("sha256", _HMAC_KEY).update(provided).digest();
  return timingSafeEqual(a, b);
}

/**
 * Vercel Cron endpoint — runs every 30 minutes.
 * Fan-out over all orgs that have at least one active (non-draft) Request,
 * then calls runIntraOrgMatches for each org sequentially.
 *
 * Secured by CRON_SECRET env var (same as other cron routes).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!verifyAuthToken(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronLogId = await startCronExecution("intra-org-matches");
  const start = Date.now();

  try {
    // Fetch all orgs that have at least one active, non-draft request
    const orgsWithRequests = await prismadb.request.findMany({
      where: {
        status: "ACTIVE",
        draftStatus: { not: true },
      },
      distinct: ["organizationId"],
      select: { organizationId: true },
    });

    const results: Array<{ org: string; upserted: number; skipped: number; error?: string }> = [];
    const errors: Array<{ organizationId: string; error: string }> = [];

    for (const { organizationId } of orgsWithRequests) {
      try {
        const r = await withTimeout(
          runIntraOrgMatches(organizationId),
          90_000,
          `org ${organizationId}`,
        );
        results.push({ org: organizationId, upserted: r.upserted, skipped: r.skipped });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ organizationId, error: msg });
        console.error(`[MATCHMAKING_CRON] org ${organizationId} failed: ${msg}`);
        results.push({ org: organizationId, upserted: 0, skipped: 0, error: msg });
      }
    }

    const totalUpserted = results.reduce((s, r) => s + r.upserted, 0);
    const durationMs = Date.now() - start;
    const hasErrors = errors.length > 0;
    const isPartialFailure = hasErrors && totalUpserted > 0;
    const cronStatus = hasErrors ? "PARTIAL_FAILURE" : "COMPLETED";

    console.log(
      `[CRON intra-org-matches] orgs=${orgsWithRequests.length} upserted=${totalUpserted} errors=${errors.length} duration=${durationMs}ms status=${cronStatus}`,
    );

    // completeCronExecution always writes status="COMPLETED". For partial failures
    // we call it first (to persist details) then override the status field.
    await completeCronExecution(cronLogId, {
      orgsProcessed: orgsWithRequests.length,
      totalUpserted,
      errors: errors.length,
      durationMs,
    });

    if (hasErrors && cronLogId) {
      await prismadb.cronExecutionLog
        .update({ where: { id: cronLogId }, data: { status: cronStatus } })
        .catch((e) => console.error("[CRON_LOG] partial-failure status update failed", e));
    }

    return NextResponse.json({
      ok: !hasErrors,
      partialFailure: isPartialFailure,
      orgsProcessed: orgsWithRequests.length,
      totalUpserted,
      errors: errors.length,
      durationMs,
    });
  } catch (err) {
    console.error("[CRON_INTRA_ORG_MATCHES] Fatal error:", err);
    await failCronExecution(cronLogId, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
