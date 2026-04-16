import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prismadb } from "@/lib/prisma";
import { runIntraOrgMatches } from "@/actions/matchmaking/compute-intra-org-matches";

function verifyAuthToken(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const expectedBuffer = Buffer.from(`Bearer ${expected}`);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
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

  const start = Date.now();

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

  console.log(
    `[CRON intra-org-matches] orgs=${orgsWithRequests.length} upserted=${totalUpserted} errors=${errors.length} duration=${Date.now() - start}ms`,
  );

  return NextResponse.json({
    ok: errors.length === 0,
    orgsProcessed: orgsWithRequests.length,
    totalUpserted,
    errors: errors.length,
    durationMs: Date.now() - start,
  });
}
