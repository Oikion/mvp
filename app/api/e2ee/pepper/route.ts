import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { checkAttempt } from "@/lib/security/brute-force";
import crypto from "node:crypto";

/**
 * GET /api/e2ee/pepper — Fetch authenticated user's pepper
 * This is the most security-sensitive E2EE endpoint.
 * Only returns the pepper for the authenticated user.
 *
 * During first-time setup the pepper doesn't exist yet, so we
 * auto-generate it (upsert). The pepper is a server-side random
 * value independent of other E2EE state, so creating it eagerly
 * is safe and avoids the chicken-and-egg problem where setup()
 * needs the pepper before POST /api/e2ee/identity can create it.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    // Rate-limit PIN unlock attempts before handing out the pepper
    const rateLimit = await checkAttempt("pin", user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many PIN attempts. Try again later.", retryAfter: rateLimit.retryAfter },
        { status: 429 }
      );
    }

    // Upsert: return existing pepper or generate a new one for first-time setup
    const record = await prismadb.userE2eePepper.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, pepper: crypto.randomBytes(32).toString("hex") },
      select: { pepper: true },
    });

    return NextResponse.json({ pepper: record.pepper });
  } catch (error) {
    console.error("[E2EE Pepper GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
