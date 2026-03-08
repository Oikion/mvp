import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { computeCrossOrgMatches } from "@/actions/network/compute-cross-org-matches";

function verifyAuthToken(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const expectedBuffer = Buffer.from(`Bearer ${expected}`);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * Vercel Cron endpoint — runs every 30 minutes.
 * Computes cross-org match scores for all network-participating orgs
 * and upserts results into the CrossOrgMatch table.
 *
 * Secured by CRON_SECRET env var (same as other cron routes).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!verifyAuthToken(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const start = Date.now();
    const result = await computeCrossOrgMatches();
    const durationMs = Date.now() - start;

    console.log(
      `[CRON cross-org-matches] upserted=${result.upserted} expired=${result.expired} errors=${result.errors} duration=${durationMs}ms`,
    );

    return NextResponse.json({
      ok: true,
      upserted: result.upserted,
      expired: result.expired,
      errors: result.errors,
      durationMs,
    });
  } catch (err) {
    console.error("[CRON cross-org-matches] Fatal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
