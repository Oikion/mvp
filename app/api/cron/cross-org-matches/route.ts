import { NextResponse } from "next/server";
import { timingSafeEqual, createHmac } from "node:crypto";
import { computeCrossOrgMatches } from "@/actions/network/compute-cross-org-matches";

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
