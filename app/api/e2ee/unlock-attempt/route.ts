import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkAttempt, recordFailedAttempt } from "@/lib/security/brute-force";

/**
 * POST /api/e2ee/unlock-attempt — Record a PIN unlock failure
 *
 * The client calls this after a failed unlock attempt so the server
 * can increment the brute-force counter. Success outcomes are intentionally
 * ignored — the counter resets automatically when the TTL window expires.
 * Accepting self-reported success would let any authenticated user reset
 * their own counter without proving an actual unlock.
 *
 * Body: { outcome: "success" | "failure" }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { outcome } = body;

    if (outcome !== "success" && outcome !== "failure") {
      return NextResponse.json({ error: "outcome must be 'success' or 'failure'" }, { status: 400 });
    }

    // Only count failures — success is ignored; the TTL window expires naturally.
    if (outcome === "failure") {
      await recordFailedAttempt("pin", userId);
    }

    const result = await checkAttempt("pin", userId);
    return NextResponse.json({
      locked: !result.allowed,
      attemptsRemaining: result.remaining,
      retryAfter: result.retryAfter,
    });
  } catch (error) {
    console.error("[E2EE Unlock Attempt POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
