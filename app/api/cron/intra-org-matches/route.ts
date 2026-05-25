import { NextResponse } from "next/server";
import { timingSafeEqual, createHmac } from "crypto";
import { prismadb } from "@/lib/prisma";
import { runIntraOrgMatches } from "@/actions/matchmaking/compute-intra-org-matches";
import { startCronExecution, completeCronExecution, failCronExecution } from "@/lib/cron-execution";

// Hash both sides to a fixed 32-byte digest so timingSafeEqual always runs
// regardless of token length, preventing a timing side-channel on secret length.
const _HMAC_KEY = Buffer.alloc(32);
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

    for (const { organizationId } of orgsWithRequests) {
      try {
        const r = await runIntraOrgMatches(organizationId);
        results.push({ org: organizationId, upserted: r.upserted, skipped: r.skipped });
      } catch (err) {
        console.error("[CRON_INTRA_ORG_MATCHES]", organizationId, err);
        results.push({ org: organizationId, upserted: 0, skipped: 0, error: String(err) });
      }
    }

    const totalUpserted = results.reduce((s, r) => s + r.upserted, 0);
    const errors = results.filter((r) => r.error);

    const durationMs = Date.now() - start;

    console.log(
      `[CRON intra-org-matches] orgs=${orgsWithRequests.length} upserted=${totalUpserted} errors=${errors.length} duration=${durationMs}ms`,
    );

    await completeCronExecution(cronLogId, {
      orgsProcessed: orgsWithRequests.length,
      totalUpserted,
      errors: errors.length,
      durationMs,
    });

    return NextResponse.json({
      ok: errors.length === 0,
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
